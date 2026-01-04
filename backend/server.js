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
    'https://volking.fun',
    'https://www.volking.fun',
    'https://volking.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
    /\.pages\.dev$/,
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
const PUMP_PORTAL_API = 'https://pumpportal.fun/api/trade-local';

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
const WINNER_REWARD_PERCENTAGE = 0.15;
const NEXT_ROUND_BASE_PERCENTAGE = 0.05;
const BUYBACK_BURN_PERCENTAGE = 0.10;
const MIN_SOL_FOR_FEES = 0.02;
const INITIAL_BASE_REWARD = 0.2;
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

// Fee claiming interval (1 minute)
const FEE_CLAIM_INTERVAL = 60 * 1000; // 1 minute in milliseconds

// Cache for wallet checks
const walletCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

// ============================================
// STATE TRACKING
// ============================================
let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();
let claimedCreatorFees = 0; // Total claimed fees this round (accumulated every minute)
let roundNumber = 1;
let baseReward = INITIAL_BASE_REWARD; // Base reward for current round (from previous round's 5%)
let totalRewardsPaid = 0;
let totalSupplyBurned = 0;
let totalRoundsCompleted = 0;
let roundInProgress = true;
let feeClaimInterval = null;

let stats = {
  processed: 0,
  excluded: 0,
  totalSolVolume: 0,
  feesClaimedCount: 0,
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
 * Formula: baseReward + (15% of claimed creator fees)
 */
function calculateCurrentReward() {
  const fifteenPercentOfFees = claimedCreatorFees * WINNER_REWARD_PERCENTAGE;
  return baseReward + fifteenPercentOfFees;
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
 * Claim creator fees using PumpPortal API
 * This will be called every minute during a round
 */
async function claimCreatorFeesViaPumpPortal() {
  if (!ENABLE_FEE_COLLECTION || !ENABLE_AUTO_CLAIM) {
    console.log('⚠️ Fee collection or auto-claim disabled');
    return { success: false, amount: 0 };
  }

  if (!CREATOR_FEE_WALLET || !CREATOR_FEE_WALLET_PRIVATE) {
    console.log('⚠️ Creator fee wallet not configured');
    return { success: false, amount: 0 };
  }

  try {
    console.log('\n💰 Claiming creator fees via PumpPortal...');

    // Get balance before claiming
    const balanceBefore = await getWalletBalance(CREATOR_FEE_WALLET);

    // Call PumpPortal API to generate claim transaction
    const response = await fetch(PUMP_PORTAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey: CREATOR_FEE_WALLET,
        action: 'collectCreatorFee',
        priorityFee: 0.000001,
      })
    });

    if (response.status !== 200) {
      const errorText = await response.text();
      console.log(`   ⚠️ PumpPortal API error: ${response.status} - ${errorText}`);
      return { success: false, amount: 0, error: errorText };
    }

    // Deserialize and sign the transaction
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));

    const signerKeyPair = getKeypairFromPrivateKey(CREATOR_FEE_WALLET_PRIVATE);
    if (!signerKeyPair) {
      throw new Error('Failed to create keypair from private key');
    }

    tx.sign([signerKeyPair]);

    // Send transaction
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`   ✅ Fee claim transaction: https://solscan.io/tx/${signature}`);

    // Wait a moment for balance to update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get balance after claiming
    const balanceAfter = await getWalletBalance(CREATOR_FEE_WALLET);
    const claimedAmount = Math.max(0, balanceAfter - balanceBefore);

    console.log(`   💵 Balance before: ${balanceBefore.toFixed(4)} SOL`);
    console.log(`   💵 Balance after: ${balanceAfter.toFixed(4)} SOL`);
    console.log(`   💵 Claimed: ${claimedAmount.toFixed(4)} SOL`);

    return { success: true, amount: claimedAmount, signature };
  } catch (error) {
    console.error('❌ Error claiming fees:', error);
    return { success: false, amount: 0, error: error.message };
  }
}

/**
 * Start claiming fees every minute
 */
function startFeeClaimingInterval() {
  if (feeClaimInterval) {
    clearInterval(feeClaimInterval);
  }

  console.log('🔄 Starting fee claiming interval (every 1 minute)');

  feeClaimInterval = setInterval(async () => {
    if (!roundInProgress) {
      console.log('⚠️ Round not in progress, skipping fee claim');
      return;
    }

    const result = await claimCreatorFeesViaPumpPortal();

    if (result.success && result.amount > 0) {
      claimedCreatorFees += result.amount;
      stats.feesClaimedCount++;

      console.log(`📊 Total claimed fees this round: ${claimedCreatorFees.toFixed(4)} SOL`);
      console.log(`💰 Current reward pool: ${calculateCurrentReward().toFixed(4)} SOL`);
    }
  }, FEE_CLAIM_INTERVAL);
}

/**
 * Stop fee claiming interval
 */
function stopFeeClaimingInterval() {
  if (feeClaimInterval) {
    clearInterval(feeClaimInterval);
    feeClaimInterval = null;
    console.log('⏸️  Stopped fee claiming interval');
  }
}

// ============================================
// CONTINUATION FROM PART 1
// ============================================

/**
 * Distribute fees to treasury, reward wallet, and buyback
 * 70% to treasury, 5% to reward wallet (next round base), 10% stays for buyback
 */
async function distributeFees(totalFees) {
  if (totalFees <= 0) {
    console.log('⚠️ No fees to distribute');
    return null;
  }

  console.log(`\n📊 Distributing ${totalFees.toFixed(4)} SOL in fees...`);

  const distribution = {
    treasury: totalFees * TREASURY_PERCENTAGE,
    nextRoundBase: totalFees * NEXT_ROUND_BASE_PERCENTAGE,
    buybackBurn: Math.max(0, (totalFees * BUYBACK_BURN_PERCENTAGE) - MIN_SOL_FOR_FEES),
    winnerAmount: totalFees * WINNER_REWARD_PERCENTAGE, // For tracking only
    signatures: {},
  };

  console.log(`   Treasury (70%): ${distribution.treasury.toFixed(4)} SOL`);
  console.log(`   Next Round Base (5%): ${distribution.nextRoundBase.toFixed(4)} SOL`);
  console.log(`   Winner Amount (15%): ${distribution.winnerAmount.toFixed(4)} SOL`);
  console.log(`   Buyback & Burn (10% - fees): ${distribution.buybackBurn.toFixed(4)} SOL`);

  const creatorKeypair = getKeypairFromPrivateKey(CREATOR_FEE_WALLET_PRIVATE);

  if (!creatorKeypair) {
    console.log('⚠️ Creator fee wallet keypair not configured - simulating distribution');
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

    // Transfer to Reward Wallet (next round base)
    if (REWARD_WALLET_PUBLIC && distribution.nextRoundBase > 0.001) {
      console.log(`\n   Transferring ${distribution.nextRoundBase.toFixed(4)} SOL to Reward Wallet (next round base)...`);
      distribution.signatures.rewardWallet = await transferSOL(
          creatorKeypair,
          REWARD_WALLET_PUBLIC,
          distribution.nextRoundBase
      );
    }

    // Buyback amount stays in creator fee wallet for the buyback & burn operation
    if (distribution.buybackBurn > 0.001) {
      console.log(`\n   💰 ${distribution.buybackBurn.toFixed(4)} SOL reserved for Buyback & Burn (stays in creator fee wallet)`);
    }

    console.log('\n✅ Fee distribution complete!');
    return distribution;
  } catch (error) {
    console.error('❌ Error during fee distribution:', error);
    distribution.error = error.message;
    return distribution;
  }
}

/**
 * Execute buyback and burn
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

  const creatorFeeKeypair = getKeypairFromPrivateKey(CREATOR_FEE_WALLET_PRIVATE);

  if (!creatorFeeKeypair) {
    console.log('⚠️ Creator fee wallet keypair not configured - simulating burn');
    const estimatedTokens = amountSOL * 1000000;
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
    // Get Jupiter quote
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

    // Get swap transaction
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

    // Execute swap
    console.log('   ⚡ Executing swap...');
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const swapTx = VersionedTransaction.deserialize(swapTransactionBuf);
    swapTx.sign([creatorFeeKeypair]);

    swapSignature = await connection.sendTransaction(swapTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    const swapConfirmation = await connection.confirmTransaction(swapSignature, 'confirmed');

    if (swapConfirmation.value.err) {
      throw new Error(`Swap transaction failed: ${JSON.stringify(swapConfirmation.value.err)}`);
    }

    console.log(`   ✅ Swap complete: ${swapSignature}`);

    // Get token balance
    console.log('   💰 Checking token balance...');
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

    // Burn the tokens
    console.log(`   🔥 Burning ${(tokenBalance / Math.pow(10, TOKEN_DECIMALS)).toLocaleString()} tokens...`);

    const burnInstruction = createBurnInstruction(
        tokenAccountAddress,
        tokenMint,
        creatorFeeKeypair.publicKey,
        tokenBalance,
        [],
        TOKEN_PROGRAM_ID
    );

    const burnTransaction = new Transaction().add(burnInstruction);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    burnTransaction.recentBlockhash = blockhash;
    burnTransaction.lastValidBlockHeight = lastValidBlockHeight;
    burnTransaction.feePayer = creatorFeeKeypair.publicKey;

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
      baseReward = parseFloat(globalStats.start_reward || INITIAL_BASE_REWARD);

      console.log('✅ State loaded from database:');
      console.log(`   Rounds completed: ${totalRoundsCompleted}`);
      console.log(`   Total rewards paid: ${totalRewardsPaid.toFixed(4)} SOL`);
      console.log(`   Total supply burned: ${totalSupplyBurned.toLocaleString()}`);
      console.log(`   Current round: ${roundNumber}`);
      console.log(`   Base reward: ${baseReward.toFixed(4)} SOL`);
    }

    console.log('✅ Server initialization complete');

    // Start fee claiming interval
    startFeeClaimingInterval();

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

  // Stop the round
  roundInProgress = false;
  stopFeeClaimingInterval();

  // Wait for trades to be processed (5 seconds)
  console.log('⏳ Waiting for final trades to be processed...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Claim fees one last time
  console.log('\n💰 Final fee claim...');
  const finalClaimResult = await claimCreatorFeesViaPumpPortal();
  if (finalClaimResult.success && finalClaimResult.amount > 0) {
    claimedCreatorFees += finalClaimResult.amount;
    stats.feesClaimedCount++;
  }

  console.log(`\n📊 Round Summary:`);
  console.log(`   Total fees claimed: ${claimedCreatorFees.toFixed(4)} SOL`);
  console.log(`   Base reward: ${baseReward.toFixed(4)} SOL`);
  console.log(`   Total reward pool: ${calculateCurrentReward().toFixed(4)} SOL`);

  const winner = getCurrentWinner();
  const roundStartTime = currentRoundStart;

  // Calculate distributions
  const fifteenPercentOfFees = claimedCreatorFees * WINNER_REWARD_PERCENTAGE;
  const fivePercentOfFees = claimedCreatorFees * NEXT_ROUND_BASE_PERCENTAGE;
  const winnerReward = baseReward + fifteenPercentOfFees;

  console.log(`\n💰 Reward Breakdown:`);
  console.log(`   Base Reward: ${baseReward.toFixed(4)} SOL`);
  console.log(`   15% of Fees: ${fifteenPercentOfFees.toFixed(4)} SOL`);
  console.log(`   TOTAL Winner Reward: ${winnerReward.toFixed(4)} SOL`);
  console.log(`   Next Round Base (5% of fees): ${fivePercentOfFees.toFixed(4)} SOL`);

  // Handle no winner case
  if (!winner) {
    console.log('⚪ No trades this round, no winner');

    // Distribute fees anyway
    if (ENABLE_FEE_COLLECTION && claimedCreatorFees > 0) {
      console.log('\n📤 Distributing fees...');
      await distributeFees(claimedCreatorFees);
    }

    // Update base reward for next round
    baseReward = fivePercentOfFees;
    totalRoundsCompleted++;
    roundNumber++;

    await db.updateGlobalStats({
      totalRoundsCompleted,
      totalRewardsPaid,
      totalSupplyBurned,
      currentRoundNumber: roundNumber,
      rewardWalletBalance: baseReward,
      startReward: baseReward,
    });

    resetForNewRound(false);
    roundInProgress = true;
    startFeeClaimingInterval();
    return null;
  }

  // We have a winner!
  console.log(`\n🏆 Winner: ${winner.wallet.substring(0, 8)}...`);
  console.log(`   Volume: ${winner.volume.toFixed(4)} SOL`);
  console.log(`   Reward: ${winnerReward.toFixed(4)} SOL`);

  // Step 1: Distribute fees (70% treasury, 5% reward wallet, 10% stays for buyback)
  let distribution = null;
  if (ENABLE_FEE_COLLECTION && claimedCreatorFees > 0) {
    console.log('\n📤 Distributing fees...');
    distribution = await distributeFees(claimedCreatorFees);
  }

  // Step 2: Send reward to winner
  let rewardSignature = `pending-${roundNumber}-${winner.wallet.substring(0, 8)}-${Date.now()}`;

  if (ENABLE_REWARD_DISTRIBUTION && winnerReward >= 0.001) {
    console.log('\n💸 Sending reward to winner...');
    const rewardResult = await sendRewardToWinner(winner.wallet, winnerReward);

    if (rewardResult.success && rewardResult.signature && !rewardResult.simulated) {
      rewardSignature = rewardResult.signature;
      console.log(`   ✅ Reward sent! Transaction: ${rewardSignature}`);
    } else {
      console.log(`   ⚠️ Reward not sent on-chain. Reason: ${rewardResult.error || 'Unknown'}`);
    }
  }

  // Wait for transaction to confirm
  if (rewardSignature && !rewardSignature.startsWith('pending') && !rewardSignature.startsWith('simulated')) {
    console.log('\n⏳ Waiting for reward transaction to confirm...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Step 3: Execute buyback & burn
  let burnResult = { success: false, tokensBurned: 0 };

  if (ENABLE_BUYBACK_BURN && distribution && distribution.buybackBurn > 0) {
    console.log('\n🔥 Executing buyback & burn...');
    burnResult = await executeBuybackAndBurn(distribution.buybackBurn);

    if (burnResult.success && burnResult.tokensBurned > 0) {
      await recordBurn(
          distribution.buybackBurn,
          burnResult.tokensBurned,
          burnResult.burnSignature || burnResult.swapSignature || 'auto-burn'
      );
    }
  }

  // Step 4: Record winner
  await recordWinner(winner.wallet, winner.volume, winnerReward, rewardSignature, roundStartTime);

  // Step 5: Update state for next round
  baseReward = fivePercentOfFees; // Next round's base is 5% of this round's fees
  totalRoundsCompleted++;

  await db.updateGlobalStats({
    totalRoundsCompleted,
    totalRewardsPaid,
    totalSupplyBurned,
    currentRoundNumber: roundNumber + 1,
    rewardWalletBalance: baseReward,
    startReward: baseReward,
  });

  roundNumber++;

  console.log(`\n✅ Round ${roundNumber - 1} complete!`);
  console.log(`   Winner reward sent: ${winnerReward.toFixed(4)} SOL`);
  console.log(`   Next round base reward: ${baseReward.toFixed(4)} SOL`);
  if (burnResult.success) {
    console.log(`   Tokens burned: ${burnResult.tokensBurned.toLocaleString()}`);
  }

  resetForNewRound(true);

  // Start next round
  roundInProgress = true;
  startFeeClaimingInterval();

  return {
    winner: winner.wallet,
    winnerVolume: winner.volume,
    winnerReward,
    rewardSignature,
    distribution,
    burnResult,
    nextBaseReward: baseReward,
  };
}

function resetForNewRound(clearVolume = true) {
  if (clearVolume) {
    volumeData = new Map();
  }
  claimedCreatorFees = 0;
  currentRoundStart = getCurrentRoundStart();
  stats.totalSolVolume = 0;
  stats.feesClaimedCount = 0;
}
// ============================================
// CONTINUATION FROM PART 2 - API ENDPOINTS
// ============================================

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

// Cache cleanup
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
    roundInProgress,
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
      winnerReward: `${WINNER_REWARD_PERCENTAGE * 100}%`,
      nextRoundBase: `${NEXT_ROUND_BASE_PERCENTAGE * 100}%`,
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
 * Reward Pool endpoint
 * Returns the current reward calculation based on claimed fees
 */
app.get('/api/reward-pool', (req, res) => {
  const fifteenPercentOfFees = claimedCreatorFees * WINNER_REWARD_PERCENTAGE;
  const fivePercentOfFees = claimedCreatorFees * NEXT_ROUND_BASE_PERCENTAGE;
  const totalCurrentReward = baseReward + fifteenPercentOfFees;

  res.json({
    // Claimed creator fees tracked every minute
    claimedCreatorFees,

    // 15% of claimed fees (winner's portion)
    fifteenPercentOfFees,

    // 5% of claimed fees (next round base)
    fivePercentOfFees,

    // Base reward from previous round
    baseReward,

    // TOTAL CURRENT REWARD = baseReward + 15% of claimed fees
    currentRewardPool: totalCurrentReward,

    // Historical stats
    totalRewardsPaid,
    totalSupplyBurned,

    // Round info
    roundStart: currentRoundStart,
    nextRoundStart: getNextRoundStart(),
    roundNumber,
    roundInProgress,

    // Distribution percentages
    treasuryPercentage: TREASURY_PERCENTAGE,
    rewardWalletPercentage: NEXT_ROUND_BASE_PERCENTAGE,
    buybackPercentage: BUYBACK_BURN_PERCENTAGE,
    winnerRewardPercentage: WINNER_REWARD_PERCENTAGE,
    nextRoundBasePercentage: NEXT_ROUND_BASE_PERCENTAGE,
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
    rewardWalletBalance: baseReward,
    startReward: baseReward,
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

app.post('/api/admin/claim-fees', async (req, res) => {
  const { adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await claimCreatorFeesViaPumpPortal();

  if (result.success && result.amount > 0) {
    claimedCreatorFees += result.amount;
    stats.feesClaimedCount++;
  }

  res.json({
    success: result.success,
    amount: result.amount,
    signature: result.signature,
    claimedCreatorFees,
    currentRewardPool: calculateCurrentReward(),
    error: result.error,
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

app.post('/api/admin/set-base-reward', async (req, res) => {
  const { adminKey, reward } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  baseReward = parseFloat(reward);

  await db.updateGlobalStats({
    totalRoundsCompleted,
    totalRewardsPaid,
    totalSupplyBurned,
    currentRoundNumber: roundNumber,
    rewardWalletBalance: baseReward,
    startReward: baseReward,
  });

  res.json({
    success: true,
    baseReward,
    currentRewardPool: calculateCurrentReward(),
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
      claimedCreatorFees,
      baseReward,
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
    message: 'VOLKING API v6 - Automated Volume-Based Rewards with Minute-by-Minute Fee Claiming',
    volumeUnit: 'SOL',
    feeDistribution: {
      treasury: '70%',
      winnerReward: '15% of claimed fees',
      nextRoundBase: '5% of claimed fees',
      buybackBurn: '10% (minus 0.02 SOL for tx fees)',
    },
    rewardCalculation: {
      formula: 'Base Reward + (15% of Claimed Fees)',
      baseReward: 'Reward wallet balance at round start (5% from previous round)',
      claimedFees: 'Accumulated every 1 minute during round',
    },
    automation: {
      feeClaiming: ENABLE_AUTO_CLAIM ? 'ENABLED (every 1 minute)' : 'DISABLED',
      feeDistribution: ENABLE_FEE_COLLECTION ? 'ENABLED' : 'DISABLED',
      rewardDistribution: ENABLE_REWARD_DISTRIBUTION ? 'ENABLED' : 'DISABLED',
      buybackBurn: ENABLE_BUYBACK_BURN ? 'ENABLED' : 'DISABLED',
    },
    features: [
      'Automatic fee claiming every 1 minute via PumpPortal',
      'Real-time reward pool updates',
      'Automatic fee distribution (70/15/5/10)',
      'Automatic reward to winner',
      'Automatic buyback & burn via Jupiter',
      'Real-time volume tracking via Helius webhooks',
      'Automatic 15-minute round rotation',
      'Next round starts after all rewards distributed',
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
      claimFees: 'POST /api/admin/claim-fees',
      updateSignature: 'POST /api/admin/update-signature',
      updateBurn: 'POST /api/admin/update-burn',
      setBaseReward: 'POST /api/admin/set-base-reward',
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
    console.log(`💰 Base reward: ${baseReward.toFixed(4)} SOL`);
    console.log(`📈 Total rounds completed: ${totalRoundsCompleted}`);
    console.log(`💎 Total rewards paid: ${totalRewardsPaid.toFixed(4)} SOL`);
    console.log(`🔥 Total supply burned: ${totalSupplyBurned.toLocaleString()}`);
    console.log(`🔄 Fee claiming: Every 1 minute`);
    console.log('');
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});