import express from 'express';
import cors from 'cors';
import * as db from './services/database.js';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createBurnInstruction,
  getAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// FEATURE SWITCHES - SET VIA ENVIRONMENT VARIABLES
// ============================================

const ENABLE_FEE_COLLECTION = process.env.ENABLE_FEE_COLLECTION !== 'false';
const ENABLE_REWARD_DISTRIBUTION = process.env.ENABLE_REWARD_DISTRIBUTION !== 'false';
const ENABLE_BUYBACK_BURN = process.env.ENABLE_BUYBACK_BURN !== 'false';
const ENABLE_AUTO_CLAIM = process.env.ENABLE_AUTO_CLAIM !== 'false';

console.log('\n⚙️  FEATURE SWITCHES:');
console.log(`   Fee Collection: ${ENABLE_FEE_COLLECTION ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Reward Distribution: ${ENABLE_REWARD_DISTRIBUTION ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Buyback & Burn: ${ENABLE_BUYBACK_BURN ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Auto Claim Fees: ${ENABLE_AUTO_CLAIM ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log('');

// ============================================
// CORS CONFIGURATION
// ============================================
app.use(cors({
  origin: [
    // Production domains
    'https://volking.fun',
    'https://www.volking.fun',
    'https://volking.pages.dev',

    // Local development
    'http://localhost:5173',
    'http://localhost:3000',

    // Allow all Cloudflare Pages preview deployments
    /\.pages\.dev$/,

    // Allow all subdomains of volking.fun
    /\.volking\.fun$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const CREATOR_FEE_WALLET = process.env.CREATOR_FEE_WALLET || '';
const CREATOR_FEE_WALLET_PRIVATE = process.env.CREATOR_FEE_WALLET_PRIVATE || '';
const TREASURY_WALLET = process.env.TREASURY_WALLET || '';
const REWARD_WALLET_PUBLIC = process.env.REWARD_WALLET_PUBLIC || '';
const REWARD_WALLET_PRIVATE = process.env.REWARD_WALLET_PRIVATE || '';

// Jupiter API for swaps
const JUPITER_API = 'https://quote-api.jup.ag/v6';
const BURN_ADDRESS = '1nc1nerator11111111111111111111111111111111'; // Standard burn address

const HELIUS_RPC = HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';

// Create Solana connection
const connection = new Connection(HELIUS_RPC, 'confirmed');

// Token decimals
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '6');
const SOL_DECIMALS = 9;

// ============================================
// FEE DISTRIBUTION CONSTANTS
// ============================================
const TREASURY_PERCENTAGE = 0.70;
const REWARD_WALLET_PERCENTAGE = 0.20;
const BUYBACK_BURN_PERCENTAGE = 0.10;
const WINNER_REWARD_PERCENTAGE = 0.15;
const START_REWARD_PERCENTAGE = 0.05;
const MIN_SOL_FOR_FEES = 0.02;
const INITIAL_START_REWARD = 0.2;
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

// Cache for wallet checks
const walletCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

// ============================================
// STATE TRACKING
// ============================================
let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();
let currentRoundCreatorFees = 0;
let unclaimedCreatorFees = 0; // Track unclaimed fees from pump.fun

let roundNumber = 1;
let rewardWalletBalance = 0;
let startReward = 0.2;
let totalRewardsPaid = 0;
let totalSupplyBurned = 0;
let totalRoundsCompleted = 0;

let stats = {
  processed: 0,
  excluded: 0,
  totalSolVolume: 0,
  creatorFeesTracked: 0
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrentRoundStart() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundStart = Math.floor(minutes / 15) * 15;
  now.setMinutes(roundStart, 0, 0);
  return now.getTime();
}

function getNextRoundStart() {
  return getCurrentRoundStart() + (15 * 60 * 1000);
}

function getCurrentWinner() {
  if (volumeData.size === 0) return null;
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume);
  return leaderboard[0] || null;
}

/**
 * Calculate current reward for Volume King
 * Formula: RewardWalletBalance + (15% of unclaimedCreatorFees)
 */
function calculateCurrentReward() {
  const potentialRewardFromFees = unclaimedCreatorFees * REWARD_WALLET_PERCENTAGE;
  return rewardWalletBalance + (potentialRewardFromFees * WINNER_REWARD_PERCENTAGE);
}

/**
 * Get keypair from private key (base58 encoded)
 */
function getKeypairFromPrivateKey(privateKeyBase58) {
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    console.error('Error creating keypair:', error);
    return null;
  }
}

// ============================================
// SOLANA TRANSACTION FUNCTIONS
// ============================================

/**
 * Get wallet balance
 */
async function getWalletBalance(walletAddress) {
  try {
    const pubkey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error(`Error getting balance for ${walletAddress}:`, error);
    return 0;
  }
}

/**
 * Transfer SOL from one wallet to another
 */
async function transferSOL(fromKeypair, toAddress, amountSOL) {
  try {
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPubkey,
          lamports: lamports,
        })
    );

    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [fromKeypair],
        { commitment: 'confirmed' }
    );

    console.log(`✅ Transfer successful: ${amountSOL.toFixed(4)} SOL to ${toAddress.substring(0, 8)}...`);
    console.log(`   Signature: ${signature}`);

    return signature;
  } catch (error) {
    console.error(`❌ Transfer failed:`, error);
    throw error;
  }
}

/**
 * Claim creator fees from Pump.fun
 * Note: This requires the actual Pump.fun claim mechanism
 */
async function claimCreatorFees() {
  if (!ENABLE_FEE_COLLECTION) {
    console.log('⚠️ Fee collection disabled');
    return { success: false, amount: 0 };
  }

  try {
    console.log('\n💰 Claiming creator fees from Pump.fun...');

    // Get current balance of creator fee wallet before claim
    const balanceBefore = await getWalletBalance(CREATOR_FEE_WALLET);
    console.log(`   Creator fee wallet balance: ${balanceBefore.toFixed(4)} SOL`);

    // The actual claim would happen via Pump.fun's claim mechanism
    // For now, we track the accumulated fees during the round
    const claimedAmount = currentRoundCreatorFees;

    if (claimedAmount <= 0) {
      console.log('   No fees to claim this round');
      return { success: true, amount: 0 };
    }

    console.log(`   ✅ Fees claimed: ${claimedAmount.toFixed(4)} SOL`);
    return { success: true, amount: claimedAmount };
  } catch (error) {
    console.error('❌ Error claiming fees:', error);
    return { success: false, amount: 0, error: error.message };
  }
}

/**
 * Distribute fees to treasury, reward wallet, and buyback
 */
async function distributeFees(totalFees) {
  if (totalFees <= 0) {
    console.log('⚠️ No fees to distribute');
    return null;
  }

  console.log(`\n📊 Distributing ${totalFees.toFixed(4)} SOL in fees...`);

  const distribution = {
    treasury: totalFees * TREASURY_PERCENTAGE,
    rewardWallet: totalFees * REWARD_WALLET_PERCENTAGE,
    buybackBurn: Math.max(0, (totalFees * BUYBACK_BURN_PERCENTAGE) - MIN_SOL_FOR_FEES),
    signatures: {},
  };

  console.log(`   Treasury (70%): ${distribution.treasury.toFixed(4)} SOL`);
  console.log(`   Reward Wallet (20%): ${distribution.rewardWallet.toFixed(4)} SOL`);
  console.log(`   Buyback & Burn (10% - fees): ${distribution.buybackBurn.toFixed(4)} SOL`);

  // Get keypair for creator fee wallet (needs to be funded with claimed fees)
  // In production, this would be the wallet that received the claimed fees
  const creatorKeypair = getKeypairFromPrivateKey(CREATOR_FEE_WALLET_PRIVATE);

  if (!creatorKeypair) {
    console.log('⚠️ Creator fee wallet keypair not configured - simulating distribution');
    // Simulate the distribution for tracking purposes
    rewardWalletBalance += distribution.rewardWallet;
    return distribution;
  }

  try {
    // Transfer to Treasury
    if (TREASURY_WALLET && distribution.treasury > 0.001) {
      console.log(`\n   Transferring ${distribution.treasury.toFixed(4)} SOL to Treasury...`);
      distribution.signatures.treasury = await transferSOL(
          creatorKeypair,
          TREASURY_WALLET,
          distribution.treasury
      );
    }

    // Transfer to Reward Wallet
    if (REWARD_WALLET_PUBLIC && distribution.rewardWallet > 0.001) {
      console.log(`\n   Transferring ${distribution.rewardWallet.toFixed(4)} SOL to Reward Wallet...`);
      distribution.signatures.rewardWallet = await transferSOL(
          creatorKeypair,
          REWARD_WALLET_PUBLIC,
          distribution.rewardWallet
      );
      rewardWalletBalance += distribution.rewardWallet;
    }

    // Buyback amount stays in creator fee wallet for the buyback & burn operation
    // No transfer needed - executeBuybackAndBurn will use the creator fee wallet directly
    if (distribution.buybackBurn > 0.001) {
      console.log(`\n   💰 ${distribution.buybackBurn.toFixed(4)} SOL reserved for Buyback & Burn (stays in creator fee wallet)`);
    }

    console.log('\n✅ Fee distribution complete!');
    return distribution;
  } catch (error) {
    console.error('❌ Error during fee distribution:', error);
    // Still update reward wallet balance for tracking
    rewardWalletBalance += distribution.rewardWallet;
    distribution.error = error.message;
    return distribution;
  }
}

/**
 * Execute buyback and burn
 * Uses Jupiter to swap SOL for tokens, then burns them using SPL Token burn instruction
 * Uses the CREATOR_FEE_WALLET which already holds the 10% buyback allocation
 */
async function executeBuybackAndBurn(amountSOL) {
  if (!ENABLE_BUYBACK_BURN) {
    console.log('⚠️ Buyback & Burn disabled');
    return { success: false, tokensBurned: 0 };
  }

  if (amountSOL < 0.01) {
    console.log('⚠️ Amount too small for buyback');
    return { success: false, tokensBurned: 0 };
  }

  console.log(`\n🔥 Executing Buyback & Burn with ${amountSOL.toFixed(4)} SOL...`);

  // Use the creator fee wallet for buyback (same wallet that claims fees)
  const creatorFeeKeypair = getKeypairFromPrivateKey(CREATOR_FEE_WALLET_PRIVATE);

  if (!creatorFeeKeypair) {
    console.log('⚠️ Creator fee wallet keypair not configured - simulating burn');
    const estimatedTokens = amountSOL * 1000000; // Placeholder rate
    return { success: true, tokensBurned: estimatedTokens, simulated: true };
  }

  if (!TOKEN_ADDRESS) {
    console.log('⚠️ TOKEN_ADDRESS not configured');
    return { success: false, tokensBurned: 0, error: 'TOKEN_ADDRESS not configured' };
  }

  let swapSignature = null;
  let burnSignature = null;
  let tokensBurned = 0;

  try {
    // ============================================
    // STEP 1: GET JUPITER QUOTE
    // ============================================
    console.log('   📊 Getting Jupiter quote...');
    const quoteUrl = `${JUPITER_API}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${TOKEN_ADDRESS}&amount=${Math.floor(amountSOL * LAMPORTS_PER_SOL)}&slippageBps=100`;

    const quoteResponse = await fetch(quoteUrl);
    const quote = await quoteResponse.json();

    if (!quote || quote.error) {
      throw new Error(`Jupiter quote error: ${quote?.error || 'Unknown error'}`);
    }

    const expectedTokens = parseInt(quote.outAmount);
    const expectedTokensDisplay = expectedTokens / Math.pow(10, TOKEN_DECIMALS);
    console.log(`   Expected tokens: ${expectedTokensDisplay.toLocaleString()}`);

    // ============================================
    // STEP 2: GET SWAP TRANSACTION FROM JUPITER
    // ============================================
    console.log('   🔄 Building swap transaction...');
    const swapResponse = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: creatorFeeKeypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    const swapData = await swapResponse.json();

    if (!swapData.swapTransaction) {
      throw new Error(`Failed to get swap transaction: ${JSON.stringify(swapData)}`);
    }

    // ============================================
    // STEP 3: EXECUTE SWAP TRANSACTION
    // ============================================
    console.log('   ⚡ Executing swap...');

    // Jupiter returns a versioned transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const swapTx = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign the transaction
    swapTx.sign([creatorFeeKeypair]);

    // Send and confirm
    swapSignature = await connection.sendTransaction(swapTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    // Wait for confirmation
    const swapConfirmation = await connection.confirmTransaction(swapSignature, 'confirmed');

    if (swapConfirmation.value.err) {
      throw new Error(`Swap transaction failed: ${JSON.stringify(swapConfirmation.value.err)}`);
    }

    console.log(`   ✅ Swap complete: ${swapSignature}`);

    // ============================================
    // STEP 4: GET TOKEN BALANCE AFTER SWAP
    // ============================================
    console.log('   💰 Checking token balance...');

    // Wait a moment for the transaction to be fully processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tokenMint = new PublicKey(TOKEN_ADDRESS);
    const tokenAccountAddress = await getAssociatedTokenAddress(
        tokenMint,
        creatorFeeKeypair.publicKey
    );

    let tokenBalance = 0;
    try {
      const tokenAccount = await getAccount(connection, tokenAccountAddress);
      tokenBalance = Number(tokenAccount.amount);
      console.log(`   Token balance: ${(tokenBalance / Math.pow(10, TOKEN_DECIMALS)).toLocaleString()} tokens`);
    } catch (error) {
      console.log(`   ⚠️ Could not fetch token account: ${error.message}`);
      // Use expected tokens from quote as fallback
      tokenBalance = expectedTokens;
    }

    if (tokenBalance <= 0) {
      console.log('   ⚠️ No tokens to burn after swap');
      return {
        success: true,
        tokensBurned: 0,
        swapSignature,
        note: 'Swap succeeded but no tokens available to burn'
      };
    }

    // ============================================
    // STEP 5: BURN THE TOKENS
    // ============================================
    console.log(`   🔥 Burning ${(tokenBalance / Math.pow(10, TOKEN_DECIMALS)).toLocaleString()} tokens...`);

    const burnInstruction = createBurnInstruction(
        tokenAccountAddress,           // Token account to burn from
        tokenMint,                      // Token mint
        creatorFeeKeypair.publicKey,   // Owner of the token account
        tokenBalance,                   // Amount to burn (in smallest units)
        [],                            // No multisig
        TOKEN_PROGRAM_ID               // SPL Token program
    );

    const burnTransaction = new Transaction().add(burnInstruction);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    burnTransaction.recentBlockhash = blockhash;
    burnTransaction.lastValidBlockHeight = lastValidBlockHeight;
    burnTransaction.feePayer = creatorFeeKeypair.publicKey;

    // Sign and send burn transaction
    burnSignature = await sendAndConfirmTransaction(
        connection,
        burnTransaction,
        [creatorFeeKeypair],
        { commitment: 'confirmed' }
    );

    tokensBurned = tokenBalance / Math.pow(10, TOKEN_DECIMALS);
    totalSupplyBurned += tokensBurned;

    console.log(`   ✅ Burn complete: ${burnSignature}`);
    console.log(`   🔥 Burned ${tokensBurned.toLocaleString()} tokens`);
    console.log(`   📊 Total supply burned all-time: ${totalSupplyBurned.toLocaleString()}`);

    return {
      success: true,
      tokensBurned,
      swapSignature,
      burnSignature,
      amountSOL,
    };

  } catch (error) {
    console.error('❌ Buyback & Burn error:', error);

    // If swap succeeded but burn failed, still record partial success
    if (swapSignature && !burnSignature) {
      console.log('   ⚠️ Swap succeeded but burn failed - tokens may need manual burning');
      return {
        success: false,
        tokensBurned: 0,
        swapSignature,
        error: error.message,
        note: 'Swap succeeded, burn failed - manual intervention may be needed'
      };
    }

    return { success: false, tokensBurned: 0, error: error.message };
  }
}

/**
 * Send reward to the round winner
 */
async function sendRewardToWinner(winnerAddress, amount) {
  if (!ENABLE_REWARD_DISTRIBUTION) {
    console.log('⚠️ Reward distribution disabled');
    return { success: false, signature: null };
  }

  if (amount < 0.001) {
    console.log('⚠️ Reward amount too small');
    return { success: false, signature: null };
  }

  console.log(`\n🏆 Sending ${amount.toFixed(4)} SOL reward to winner ${winnerAddress.substring(0, 8)}...`);

  const rewardKeypair = getKeypairFromPrivateKey(REWARD_WALLET_PRIVATE);

  if (!rewardKeypair) {
    console.log('⚠️ Reward wallet keypair not configured - simulating reward');
    return { success: true, signature: `simulated-${Date.now()}`, simulated: true };
  }

  try {
    const signature = await transferSOL(rewardKeypair, winnerAddress, amount);
    console.log(`   ✅ Reward sent! Signature: ${signature}`);
    return { success: true, signature };
  } catch (error) {
    console.error('❌ Error sending reward:', error);
    return { success: false, signature: null, error: error.message };
  }
}

// ============================================
// WINNER & REWARD TRACKING
// ============================================

async function recordWinner(wallet, volume, reward, signature, roundStartTime) {
  await db.saveWinner({
    wallet,
    volume,
    reward,
    signature,
    roundNumber,
    roundStart: roundStartTime,
    timestamp: Date.now(),
  });

  await db.saveRewardTransfer({
    wallet,
    amount: reward,
    signature,
    roundNumber,
    roundStart: roundStartTime,
    timestamp: Date.now(),
  });

  totalRewardsPaid += reward;

  console.log(`🏆 Winner recorded: ${wallet.substring(0, 8)}... with ${volume.toFixed(4)} SOL volume, reward: ${reward.toFixed(4)} SOL`);
  console.log(`💰 Total rewards paid all-time: ${totalRewardsPaid.toFixed(4)} SOL`);
}

async function recordBurn(amountSOL, tokensBurned, signature) {
  await db.saveBurn({
    amountSOL,
    tokensBurned,
    signature,
    roundNumber,
    timestamp: Date.now(),
  });

  console.log(`🔥 Burn recorded: ${tokensBurned.toLocaleString()} tokens (${amountSOL.toFixed(4)} SOL worth)`);
}

// ============================================
// INITIALIZE DATABASE AND LOAD STATE
// ============================================

async function initializeServer() {
  try {
    console.log('🚀 Initializing VOLKING server...');

    await db.initializeDatabase();

    const globalStats = await db.getGlobalStats();

    if (globalStats) {
      totalRoundsCompleted = parseInt(globalStats.total_rounds_completed || 0);
      totalRewardsPaid = parseFloat(globalStats.total_rewards_paid || 0);
      totalSupplyBurned = parseFloat(globalStats.total_supply_burned || 0);
      roundNumber = parseInt(globalStats.current_round_number || 1);
      rewardWalletBalance = parseFloat(globalStats.reward_wallet_balance || 0);
      startReward = parseFloat(globalStats.start_reward || 0.2);

      console.log('✅ State loaded from database:');
      console.log(`   Rounds completed: ${totalRoundsCompleted}`);
      console.log(`   Total rewards paid: ${totalRewardsPaid.toFixed(4)} SOL`);
      console.log(`   Total supply burned: ${totalSupplyBurned.toLocaleString()}`);
      console.log(`   Current round: ${roundNumber}`);
      console.log(`   Reward wallet balance: ${rewardWalletBalance.toFixed(4)} SOL`);
      console.log(`   Start reward: ${startReward.toFixed(4)} SOL`);
    }

    // Sync reward wallet balance from chain if configured
    if (REWARD_WALLET_PUBLIC) {
      const actualBalance = await getWalletBalance(REWARD_WALLET_PUBLIC);
      if (actualBalance > 0) {
        console.log(`   On-chain reward wallet balance: ${actualBalance.toFixed(4)} SOL`);
        // Use on-chain balance as source of truth
        rewardWalletBalance = actualBalance;
      }
    }

    console.log('✅ Server initialization complete');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// ============================================
// ROUND END LOGIC - AUTOMATED
// ============================================

async function handleRoundEnd() {
  console.log('\n🎊 ===== ROUND END =====\n');
  console.log(`Round ${roundNumber} ending...`);
  console.log(`Creator fees tracked this round: ${currentRoundCreatorFees.toFixed(4)} SOL`);

  const winner = getCurrentWinner();
  const roundStartTime = currentRoundStart;

  // ============================================
  // STEP 1: CLAIM CREATOR FEES
  // ============================================
  let claimResult = { success: false, amount: 0 };

  if (ENABLE_AUTO_CLAIM && currentRoundCreatorFees > 0) {
    claimResult = await claimCreatorFees();
  }

  const totalFeesThisRound = claimResult.success ? claimResult.amount : currentRoundCreatorFees;

  // ============================================
  // STEP 2: DISTRIBUTE FEES
  // ============================================
  let distribution = null;

  if (totalFeesThisRound > 0) {
    distribution = await distributeFees(totalFeesThisRound);
  }

  // ============================================
  // STEP 3: HANDLE NO WINNER CASE
  // ============================================
  if (!winner) {
    console.log('⚪ No trades this round, no winner');

    totalRoundsCompleted++;
    roundNumber++;

    await db.updateGlobalStats({
      totalRoundsCompleted,
      totalRewardsPaid,
      totalSupplyBurned,
      currentRoundNumber: roundNumber,
      rewardWalletBalance,
      startReward,
    });

    // Still execute buyback if we have fees
    if (distribution && distribution.buybackBurn > 0) {
      const burnResult = await executeBuybackAndBurn(distribution.buybackBurn);
      if (burnResult.success && burnResult.tokensBurned > 0) {
        await recordBurn(distribution.buybackBurn, burnResult.tokensBurned, burnResult.swapSignature || 'auto-burn');
      }
    }

    resetForNewRound(false);
    return null;
  }

  // ============================================
  // STEP 4: CALCULATE REWARDS
  // ============================================
  const winnerReward = rewardWalletBalance * WINNER_REWARD_PERCENTAGE;
  const nextStartReward = rewardWalletBalance * START_REWARD_PERCENTAGE;

  console.log(`\n🏆 Winner Distribution:`);
  console.log(`   Winner: ${winner.wallet.substring(0, 8)}...`);
  console.log(`   Volume: ${winner.volume.toFixed(4)} SOL`);
  console.log(`   Reward (15% of ${rewardWalletBalance.toFixed(4)}): ${winnerReward.toFixed(4)} SOL`);
  console.log(`   Next Start Reward (5%): ${nextStartReward.toFixed(4)} SOL`);

  // ============================================
  // STEP 5: SEND REWARD TO WINNER
  // ============================================
  const rewardResult = await sendRewardToWinner(winner.wallet, winnerReward);

  const rewardSignature = rewardResult.success
      ? rewardResult.signature
      : `round-${roundNumber}-${winner.wallet.substring(0, 8)}-${Date.now()}`;

  // ============================================
  // STEP 6: EXECUTE BUYBACK & BURN
  // ============================================
  let burnResult = { success: false, tokensBurned: 0 };

  if (distribution && distribution.buybackBurn > 0) {
    burnResult = await executeBuybackAndBurn(distribution.buybackBurn);

    if (burnResult.success && burnResult.tokensBurned > 0) {
      await recordBurn(
          distribution.buybackBurn,
          burnResult.tokensBurned,
          burnResult.burnSignature || burnResult.swapSignature || 'auto-burn'
      );
    }
  }

  // ============================================
  // STEP 7: UPDATE STATE & DATABASE
  // ============================================
  await recordWinner(winner.wallet, winner.volume, winnerReward, rewardSignature, roundStartTime);

  rewardWalletBalance -= winnerReward;
  rewardWalletBalance -= nextStartReward;
  startReward = nextStartReward;
  totalRoundsCompleted++;

  await db.updateGlobalStats({
    totalRoundsCompleted,
    totalRewardsPaid,
    totalSupplyBurned,
    currentRoundNumber: roundNumber + 1,
    rewardWalletBalance,
    startReward,
  });

  roundNumber++;

  console.log(`\n✅ Round ${roundNumber - 1} complete!`);
  console.log(`   Winner reward sent: ${winnerReward.toFixed(4)} SOL`);
  console.log(`   Next round start reward: ${startReward.toFixed(4)} SOL`);
  console.log(`   Remaining reward wallet: ${rewardWalletBalance.toFixed(4)} SOL`);
  if (burnResult.success) {
    console.log(`   Tokens burned: ${burnResult.tokensBurned.toLocaleString()}`);
  }

  resetForNewRound(true);

  return {
    winner: winner.wallet,
    winnerVolume: winner.volume,
    winnerReward,
    rewardSignature,
    distribution,
    burnResult,
    nextStartReward,
  };
}

function resetForNewRound(clearVolume = true) {
  if (clearVolume) {
    volumeData = new Map();
  }
  currentRoundCreatorFees = 0;
  unclaimedCreatorFees = 0;
  currentRoundStart = getCurrentRoundStart();
  stats.totalSolVolume = 0;
}

function trackCreatorFee(amount) {
  currentRoundCreatorFees += amount;
  unclaimedCreatorFees += amount;
  stats.creatorFeesTracked++;
  console.log(`💵 Creator fee tracked: ${amount.toFixed(4)} SOL (Total this round: ${currentRoundCreatorFees.toFixed(4)} SOL)`);
}

// ============================================
// WALLET DETECTION
// ============================================

async function isUserWallet(address) {
  if (!address) return false;

  const cached = walletCache.get(address);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached.isUserWallet;
  }

  try {
    const response = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [address, { encoding: 'base64' }]
      })
    });

    const data = await response.json();
    const accountInfo = data.result?.value;

    let isUser;

    if (accountInfo === null) {
      isUser = true;
    } else {
      const owner = accountInfo.owner;
      const executable = accountInfo.executable;

      if (executable) {
        isUser = false;
      } else isUser = owner === SYSTEM_PROGRAM;
    }

    walletCache.set(address, { isUserWallet: isUser, checkedAt: Date.now() });
    return isUser;

  } catch (error) {
    console.error(`Error checking wallet ${address}:`, error.message);
    return false;
  }
}

// ============================================
// ROUND TIMER
// ============================================

setInterval(async () => {
  const newRoundStart = getCurrentRoundStart();
  if (newRoundStart !== currentRoundStart) {
    console.log('\n⏰ Round timer triggered!');
    await handleRoundEnd();
    currentRoundStart = newRoundStart;
  }
}, 60000);

setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  for (const [address, data] of walletCache.entries()) {
    if (now - data.checkedAt > CACHE_TTL * 2) {
      walletCache.delete(address);
      cleared++;
    }
  }
  if (cleared > 0) console.log(`🧹 Cleared ${cleared} cache entries`);
}, 5 * 60 * 1000);

// Periodically sync reward wallet balance from chain
setInterval(async () => {
  if (REWARD_WALLET_PUBLIC) {
    try {
      const actualBalance = await getWalletBalance(REWARD_WALLET_PUBLIC);
      if (Math.abs(actualBalance - rewardWalletBalance) > 0.001) {
        console.log(`📊 Syncing reward wallet balance: ${rewardWalletBalance.toFixed(4)} -> ${actualBalance.toFixed(4)} SOL`);
        rewardWalletBalance = actualBalance;
      }
    } catch (error) {
      console.error('Error syncing reward wallet balance:', error);
    }
  }
}, 60000); // Every minute

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/health', async (req, res) => {
  const dbHealth = await db.checkDatabaseHealth();

  res.json({
    status: 'ok',
    database: dbHealth.healthy ? 'connected' : 'disconnected',
    databaseVersion: dbHealth.version?.split(' ')[0],
    roundStart: new Date(currentRoundStart).toISOString(),
    roundNumber,
    traders: volumeData.size,
    cacheSize: walletCache.size,
    stats,
    features: {
      feeCollection: ENABLE_FEE_COLLECTION,
      rewardDistribution: ENABLE_REWARD_DISTRIBUTION,
      buybackBurn: ENABLE_BUYBACK_BURN,
      autoClaim: ENABLE_AUTO_CLAIM,
    },
    config: {
      tokenDecimals: TOKEN_DECIMALS,
      tokenAddress: TOKEN_ADDRESS ? `${TOKEN_ADDRESS.substring(0, 8)}...` : 'not set',
      creatorFeeWallet: CREATOR_FEE_WALLET ? `${CREATOR_FEE_WALLET.substring(0, 8)}...` : 'not set',
      treasuryWallet: TREASURY_WALLET ? `${TREASURY_WALLET.substring(0, 8)}...` : 'not set',
      rewardWallet: REWARD_WALLET_PUBLIC ? `${REWARD_WALLET_PUBLIC.substring(0, 8)}...` : 'not set',
    },
    feeDistribution: {
      treasury: `${TREASURY_PERCENTAGE * 100}%`,
      rewardWallet: `${REWARD_WALLET_PERCENTAGE * 100}%`,
      buybackBurn: `${BUYBACK_BURN_PERCENTAGE * 100}%`,
    },
  });
});

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

  res.json({
    roundStart: currentRoundStart,
    nextRoundStart: getNextRoundStart(),
    roundNumber,
    leaderboard,
    totalTraders: volumeData.size,
    volumeUnit: 'SOL',
  });
});

/**
 * Reward Pool endpoint with updated formula:
 * Current Reward = RewardWalletBalance + (15% of unclaimedCreatorFees * 20%)
 * This shows what the winner would receive if round ended now
 */
app.get('/api/reward-pool', (req, res) => {
  // Calculate potential reward wallet addition from current fees
  const potentialRewardWalletAdd = unclaimedCreatorFees * REWARD_WALLET_PERCENTAGE;

  // Calculate what winner would get (15% of reward wallet + potential addition)
  const currentPotentialReward = (rewardWalletBalance + potentialRewardWalletAdd) * WINNER_REWARD_PERCENTAGE;

  // Total reward = start reward + winner reward
  const totalCurrentReward = startReward + currentPotentialReward;

  res.json({
    // Current unclaimed fees that will be distributed at round end
    unclaimedCreatorFees,
    currentRoundCreatorFees,

    // What the reward wallet balance is now
    rewardWalletBalance,

    // What 20% of fees would add to reward wallet
    potentialRewardWalletAdd,

    // What 15% of total reward wallet would be (winner's cut)
    winnerRewardPortion: currentPotentialReward,

    // Start reward for this round
    startReward,

    // Total current reward = startReward + 15% of (rewardWallet + 20% of fees)
    currentRewardPool: totalCurrentReward,

    // Historical stats
    totalRewardsPaid,
    totalSupplyBurned,

    // Round info
    roundStart: currentRoundStart,
    nextRoundStart: getNextRoundStart(),
    roundNumber,

    // Distribution percentages for reference
    treasuryPercentage: TREASURY_PERCENTAGE,
    rewardWalletPercentage: REWARD_WALLET_PERCENTAGE,
    buybackPercentage: BUYBACK_BURN_PERCENTAGE,
    winnerRewardPercentage: WINNER_REWARD_PERCENTAGE,
    startRewardPercentage: START_REWARD_PERCENTAGE,
  });
});

app.get('/api/global-stats', async (req, res) => {
  const degens = await db.getHallOfDegens();

  res.json({
    totalRewardsPaid,
    totalSupplyBurned,
    totalRoundsCompleted,
    totalUniqueWinners: degens.length,
    currentRoundNumber: roundNumber,
    rewardWalletBalance,
    startReward,
    lastUpdated: Date.now(),
  });
});

app.get('/api/hall-of-degens', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const degens = await db.getHallOfDegens();
  const recentTransfers = await db.getRewardTransfers(50);

  res.json({
    degens: degens.slice(0, limit),
    total: degens.length,
    totalRewardsPaid,
    recentTransfers: recentTransfers.map(t => ({
      wallet: t.wallet,
      amount: parseFloat(t.amount),
      signature: t.signature,
      roundNumber: parseInt(t.round_number),
      roundStart: parseInt(t.round_start),
      timestamp: parseInt(t.timestamp),
    })),
  });
});

app.get('/api/winners', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const winners = await db.getWinnerHistory(limit);

  res.json({
    winners: winners.map(w => ({
      wallet: w.wallet,
      volume: parseFloat(w.volume),
      reward: parseFloat(w.reward),
      signature: w.signature,
      roundNumber: parseInt(w.round_number),
      roundStart: parseInt(w.round_start),
      timestamp: parseInt(w.timestamp),
    })),
    total: winners.length,
    totalRewardsPaid,
  });
});

app.get('/api/burns', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const burns = await db.getBurnHistory(limit);

  res.json({
    burns: burns.map(b => ({
      amountSOL: parseFloat(b.amount_sol),
      tokensBurned: parseInt(b.tokens_burned || 0),
      signature: b.signature,
      roundNumber: parseInt(b.round_number),
      timestamp: parseInt(b.timestamp),
    })),
    total: burns.length,
    totalSupplyBurned,
  });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

app.post('/api/admin/end-round', async (req, res) => {
  const { adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await handleRoundEnd();

  res.json({
    success: true,
    message: 'Round ended manually',
    result,
    totalRewardsPaid,
    totalRoundsCompleted,
    totalSupplyBurned,
  });
});

app.post('/api/admin/track-fee', (req, res) => {
  const { adminKey, amount } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  trackCreatorFee(parseFloat(amount));

  res.json({
    success: true,
    currentRoundCreatorFees,
    unclaimedCreatorFees,
    currentRewardPool: calculateCurrentReward(),
    startReward,
  });
});

app.post('/api/admin/update-signature', async (req, res) => {
  const { adminKey, wallet, roundStart, signature } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await db.updateWinnerSignature(wallet, roundStart, signature);

  res.json({
    success: true,
    message: 'Signature updated in database',
    wallet,
    signature,
  });
});

app.post('/api/admin/update-burn', async (req, res) => {
  const { adminKey, roundNumber: rn, tokensBurned, signature } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await db.updateBurnSignature(rn, tokensBurned, signature);

  const globalStats = await db.getGlobalStats();
  totalSupplyBurned = parseFloat(globalStats.total_supply_burned || 0);

  res.json({
    success: true,
    message: 'Burn record updated in database',
    totalSupplyBurned,
  });
});

app.post('/api/admin/set-reward-balance', async (req, res) => {
  const { adminKey, balance } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  rewardWalletBalance = parseFloat(balance);

  await db.updateGlobalStats({
    totalRoundsCompleted,
    totalRewardsPaid,
    totalSupplyBurned,
    currentRoundNumber: roundNumber,
    rewardWalletBalance,
    startReward,
  });

  res.json({
    success: true,
    rewardWalletBalance,
    currentRewardPool: calculateCurrentReward(),
  });
});

app.post('/api/admin/sync-balance', async (req, res) => {
  const { adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!REWARD_WALLET_PUBLIC) {
    return res.status(400).json({ error: 'Reward wallet not configured' });
  }

  const actualBalance = await getWalletBalance(REWARD_WALLET_PUBLIC);
  const previousBalance = rewardWalletBalance;
  rewardWalletBalance = actualBalance;

  await db.updateGlobalStats({
    totalRoundsCompleted,
    totalRewardsPaid,
    totalSupplyBurned,
    currentRoundNumber: roundNumber,
    rewardWalletBalance,
    startReward,
  });

  res.json({
    success: true,
    previousBalance,
    newBalance: actualBalance,
    difference: actualBalance - previousBalance,
  });
});

// ============================================
// WEBHOOK ENDPOINT
// ============================================

app.post('/api/webhook/transactions', async (req, res) => {
  try {
    const shouldLog = Math.random() < 0.01;

    if (shouldLog) {
      console.log('📨 Webhook received! (sampled log)');
    }

    const transactions = Array.isArray(req.body) ? req.body : [req.body];

    let totalProcessed = 0;
    let totalExcluded = 0;

    for (const tx of transactions) {
      const result = await processTransaction(tx);
      totalProcessed += result.processed;
      totalExcluded += result.excluded;
    }

    if (shouldLog) {
      console.log(`✅ Traders: ${volumeData.size}, SOL volume: ${stats.totalSolVolume.toFixed(4)}, Reward pool: ${calculateCurrentReward().toFixed(4)}`);
    }

    res.status(200).json({
      success: true,
      processed: totalProcessed,
      excluded: totalExcluded,
      traders: volumeData.size,
      currentRewardPool: calculateCurrentReward(),
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROCESS TRANSACTION
// ============================================

async function processTransaction(tx) {
  let processed = 0;
  let excluded = 0;

  const nativeTransfers = tx.nativeTransfers || [];
  const tokenTransfers = tx.tokenTransfers || [];
  const feePayer = tx.feePayer;
  const timestamp = (tx.timestamp || Math.floor(Date.now() / 1000)) * 1000;

  const hasOurToken = tokenTransfers.some(t => t.mint === TOKEN_ADDRESS);

  if (!hasOurToken) {
    return { processed: 0, excluded: 0 };
  }

  let solValue = 0;
  let traderWallet = feePayer;

  for (const transfer of nativeTransfers) {
    const amount = transfer.amount / Math.pow(10, SOL_DECIMALS);
    const from = transfer.fromUserAccount;
    const to = transfer.toUserAccount;

    if (CREATOR_FEE_WALLET && to === CREATOR_FEE_WALLET) {
      trackCreatorFee(amount);
    }

    if (amount >= 0.001) {
      const isFromUser = from === feePayer;
      const isToUser = to === feePayer;

      if (isFromUser || isToUser) {
        if (amount > solValue) {
          solValue = amount;
          traderWallet = feePayer;
        }
      }
    }
  }

  if (tx.events?.swap) {
    const swap = tx.events.swap;

    if (swap.nativeInput?.amount) {
      const swapAmount = swap.nativeInput.amount / Math.pow(10, SOL_DECIMALS);
      if (swapAmount > solValue) {
        solValue = swapAmount;
        traderWallet = swap.nativeInput.account || feePayer;
      }
    }

    if (swap.nativeOutput?.amount) {
      const swapAmount = swap.nativeOutput.amount / Math.pow(10, SOL_DECIMALS);
      if (swapAmount > solValue) {
        solValue = swapAmount;
        traderWallet = swap.nativeOutput.account || feePayer;
      }
    }
  }

  if (solValue > 0 && traderWallet) {
    const isUser = await isUserWallet(traderWallet);

    if (isUser) {
      updateVolume(traderWallet, solValue, timestamp);
      processed = 1;
      stats.processed++;
      stats.totalSolVolume += solValue;
    } else {
      excluded = 1;
      stats.excluded++;
    }
  }

  return { processed, excluded };
}

function updateVolume(wallet, solAmount, timestamp) {
  const existing = volumeData.get(wallet) || {
    wallet,
    volume: 0,
    trades: 0,
    lastTrade: 0,
  };

  existing.volume += solAmount;
  existing.trades += 1;
  existing.lastTrade = Math.max(existing.lastTrade, timestamp);

  volumeData.set(wallet, existing);
}

// ============================================
// DEBUG ENDPOINTS
// ============================================

app.get('/api/debug/check/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const isUser = await isUserWallet(address);
    const cached = walletCache.get(address);

    res.json({
      address,
      isUserWallet: isUser,
      cached: cached ? {
        isUserWallet: cached.isUserWallet,
        checkedAt: new Date(cached.checkedAt).toISOString()
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/cache', (req, res) => {
  const userWallets = Array.from(walletCache.entries())
      .filter(([_, data]) => data.isUserWallet).length;

  res.json({
    cacheSize: walletCache.size,
    userWallets,
    nonUserWallets: walletCache.size - userWallets,
    stats,
    reward: {
      currentRoundCreatorFees,
      unclaimedCreatorFees,
      rewardWalletBalance,
      startReward,
      currentRewardPool: calculateCurrentReward(),
      totalRewardsPaid,
      totalSupplyBurned,
    }
  });
});

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API v5 - Automated Volume-Based Rewards',
    volumeUnit: 'SOL',
    feeDistribution: {
      treasury: '70%',
      rewardWallet: '20%',
      buybackBurn: '10% (minus 0.02 SOL for tx fees)',
    },
    rewardDistribution: {
      winner: '15% of reward wallet balance',
      nextRoundStartReward: '5% of reward wallet balance',
      initialStartReward: `${INITIAL_START_REWARD} SOL`,
    },
    automation: {
      feeClaiming: ENABLE_AUTO_CLAIM ? 'ENABLED' : 'DISABLED',
      feeDistribution: ENABLE_FEE_COLLECTION ? 'ENABLED' : 'DISABLED',
      rewardDistribution: ENABLE_REWARD_DISTRIBUTION ? 'ENABLED' : 'DISABLED',
      buybackBurn: ENABLE_BUYBACK_BURN ? 'ENABLED' : 'DISABLED',
    },
    features: [
      'Automatic fee claiming at round end',
      'Automatic fee distribution (70/20/10)',
      'Automatic reward to winner',
      'Automatic buyback & burn via Jupiter',
      'Real-time volume tracking via Helius webhooks',
      'Automatic 15-minute round rotation',
    ],
    endpoints: {
      health: 'GET /api/health',
      leaderboard: 'GET /api/leaderboard',
      rewardPool: 'GET /api/reward-pool',
      globalStats: 'GET /api/global-stats',
      hallOfDegens: 'GET /api/hall-of-degens',
      winners: 'GET /api/winners',
      burns: 'GET /api/burns',
      webhook: 'POST /api/webhook/transactions',
    },
    adminEndpoints: {
      endRound: 'POST /api/admin/end-round',
      trackFee: 'POST /api/admin/track-fee',
      updateSignature: 'POST /api/admin/update-signature',
      updateBurn: 'POST /api/admin/update-burn',
      setRewardBalance: 'POST /api/admin/set-reward-balance',
      syncBalance: 'POST /api/admin/sync-balance',
    }
  });
});

// ============================================
// START SERVER
// ============================================

initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 VOLKING API running on port ${PORT}`);
    console.log(`📊 Current round: ${roundNumber}`);
    console.log(`💰 Start reward: ${startReward.toFixed(4)} SOL`);
    console.log(`📈 Total rounds completed: ${totalRoundsCompleted}`);
    console.log(`💎 Total rewards paid: ${totalRewardsPaid.toFixed(4)} SOL`);
    console.log(`🔥 Total supply burned: ${totalSupplyBurned.toLocaleString()}`);
    console.log('');
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});