// backend/test/testFeeDistribution.js
// Test script for fee collection, reward distribution, and buyback/burn

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    Keypair,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createBurnInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';
import * as readline from 'readline';

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const NETWORK = process.env.SOLANA_NETWORK || 'mainnet-beta';
const HELIUS_RPC = HELIUS_API_KEY
    ? `https://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : `https://api.${NETWORK}.solana.com`;

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const CREATOR_WALLET_PUBLIC = process.env.CREATOR_FEE_WALLET || '';
const TREASURY_WALLET = process.env.TREASURY_WALLET || '';
const REWARD_WALLET_PUBLIC = process.env.REWARD_WALLET_PUBLIC || '';

// Fee distribution percentages
const TREASURY_PERCENTAGE = 0.70;
const REWARD_WALLET_PERCENTAGE = 0.20;
const BUYBACK_BURN_PERCENTAGE = 0.10;
const WINNER_REWARD_PERCENTAGE = 0.15;
const MIN_SOL_FOR_FEES = 0.02;

const connection = new Connection(HELIUS_RPC, 'confirmed');

// ============================================
// KEYPAIR MANAGEMENT
// ============================================

let creatorKeypair = null;
let rewardWalletKeypair = null;

function initializeKeypairs() {
    try {
        const creatorKey = process.env.CREATOR_PRIVATE_KEY;
        const rewardKey = process.env.REWARD_WALLET_PRIVATE_KEY;

        if (!creatorKey || !rewardKey) {
            throw new Error('Private keys not set in environment variables');
        }

        const creatorSecretKey = bs58.decode(creatorKey);
        const rewardSecretKey = bs58.decode(rewardKey);

        creatorKeypair = Keypair.fromSecretKey(creatorSecretKey);
        rewardWalletKeypair = Keypair.fromSecretKey(rewardSecretKey);

        console.log('✅ Keypairs initialized');
        console.log(`   Creator: ${creatorKeypair.publicKey.toString()}`);
        console.log(`   Reward: ${rewardWalletKeypair.publicKey.toString()}`);

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize keypairs:', error.message);
        return false;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getBalance(address) {
    try {
        const pubkey = new PublicKey(address);
        const balance = await connection.getBalance(pubkey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error(`Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

async function displayBalances() {
    console.log('\n📊 CURRENT BALANCES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const creatorBalance = await getBalance(CREATOR_WALLET_PUBLIC);
    const treasuryBalance = await getBalance(TREASURY_WALLET);
    const rewardBalance = await getBalance(REWARD_WALLET_PUBLIC);

    console.log(`Creator Wallet:  ${creatorBalance.toFixed(4)} SOL`);
    console.log(`Treasury:        ${treasuryBalance.toFixed(4)} SOL`);
    console.log(`Reward Wallet:   ${rewardBalance.toFixed(4)} SOL`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return { creatorBalance, treasuryBalance, rewardBalance };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// FEE COLLECTION & DISTRIBUTION
// ============================================

async function collectAndDistributeFees(dryRun = false) {
    console.log('\n💰 STEP 1: COLLECT AND DISTRIBUTE FEES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (dryRun) {
        console.log('⚠️  DRY RUN MODE - No transactions will be sent\n');
    }

    const balance = await connection.getBalance(creatorKeypair.publicKey);
    const totalFeesSOL = balance / LAMPORTS_PER_SOL;

    console.log(`Creator wallet balance: ${totalFeesSOL.toFixed(4)} SOL`);

    if (totalFeesSOL < 0.01) {
        console.log('❌ Insufficient fees (minimum 0.01 SOL)');
        return null;
    }

    // Reserve for rent and fees
    const reserveLamports = 0.01 * LAMPORTS_PER_SOL;
    const distributableLamports = balance - reserveLamports;

    // Calculate distribution
    const treasuryLamports = Math.floor(distributableLamports * TREASURY_PERCENTAGE);
    const rewardWalletLamports = Math.floor(distributableLamports * REWARD_WALLET_PERCENTAGE);
    const buybackLamports = Math.floor(distributableLamports * BUYBACK_BURN_PERCENTAGE);

    console.log(`\n📊 Distribution Breakdown:`);
    console.log(`   Distributable: ${(distributableLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Treasury (70%): ${(treasuryLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Reward Wallet (20%): ${(rewardWalletLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Buyback (10%): ${(buybackLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (dryRun) {
        console.log('\n✅ Dry run complete - no transactions sent');
        return {
            totalFees: totalFeesSOL,
            treasuryAmount: treasuryLamports / LAMPORTS_PER_SOL,
            rewardWalletAmount: rewardWalletLamports / LAMPORTS_PER_SOL,
            buybackAmount: buybackLamports / LAMPORTS_PER_SOL,
            dryRun: true,
        };
    }

    // Create transaction
    console.log('\n📝 Creating transaction...');

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    const transaction = new Transaction({
        feePayer: creatorKeypair.publicKey,
        blockhash,
        lastValidBlockHeight,
    });

    // Add compute budget
    transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
    );

    // Transfer to treasury
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: creatorKeypair.publicKey,
            toPubkey: new PublicKey(TREASURY_WALLET),
            lamports: treasuryLamports,
        })
    );

    // Transfer to reward wallet
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: creatorKeypair.publicKey,
            toPubkey: new PublicKey(REWARD_WALLET_PUBLIC),
            lamports: rewardWalletLamports,
        })
    );

    console.log('📤 Sending transaction...');

    transaction.sign(creatorKeypair);

    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    console.log(`⏳ Confirming transaction: ${signature}`);

    await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed');

    console.log(`✅ Fees distributed successfully!`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}`);

    return {
        totalFees: totalFeesSOL,
        treasuryAmount: treasuryLamports / LAMPORTS_PER_SOL,
        rewardWalletAmount: rewardWalletLamports / LAMPORTS_PER_SOL,
        buybackAmount: buybackLamports / LAMPORTS_PER_SOL,
        signature,
        dryRun: false,
    };
}

// ============================================
// REWARD DISTRIBUTION
// ============================================

async function sendRewardToWinner(winnerAddress, dryRun = false) {
    console.log('\n🏆 STEP 2: SEND REWARD TO WINNER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (dryRun) {
        console.log('⚠️  DRY RUN MODE - No transactions will be sent\n');
    }

    const rewardBalance = await connection.getBalance(rewardWalletKeypair.publicKey);
    const rewardBalanceSOL = rewardBalance / LAMPORTS_PER_SOL;

    console.log(`Reward wallet balance: ${rewardBalanceSOL.toFixed(4)} SOL`);

    const winnerRewardSOL = rewardBalanceSOL * WINNER_REWARD_PERCENTAGE;
    const winnerRewardLamports = Math.floor(winnerRewardSOL * LAMPORTS_PER_SOL);

    console.log(`Winner reward (15%): ${winnerRewardSOL.toFixed(4)} SOL`);
    console.log(`Winner address: ${winnerAddress}`);

    if (winnerRewardLamports < 1000) {
        console.log('❌ Reward too small');
        return null;
    }

    if (dryRun) {
        console.log('\n✅ Dry run complete - no transactions sent');
        return {
            winner: winnerAddress,
            amount: winnerRewardSOL,
            dryRun: true,
        };
    }

    console.log('\n📝 Creating reward transaction...');

    const winnerPubkey = new PublicKey(winnerAddress);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    const transaction = new Transaction({
        feePayer: rewardWalletKeypair.publicKey,
        blockhash,
        lastValidBlockHeight,
    });

    transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        SystemProgram.transfer({
            fromPubkey: rewardWalletKeypair.publicKey,
            toPubkey: winnerPubkey,
            lamports: winnerRewardLamports,
        })
    );

    console.log('📤 Sending transaction...');

    transaction.sign(rewardWalletKeypair);

    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    console.log(`⏳ Confirming transaction: ${signature}`);

    await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed');

    console.log(`✅ Reward sent successfully!`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}`);

    return {
        winner: winnerAddress,
        amount: winnerRewardSOL,
        signature,
        dryRun: false,
    };
}

// ============================================
// BUYBACK AND BURN
// ============================================

async function executeBuybackAndBurn(buybackAmountSOL, dryRun = false) {
    console.log('\n🔥 STEP 3: BUYBACK AND BURN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (dryRun) {
        console.log('⚠️  DRY RUN MODE - No transactions will be sent\n');
    }

    const actualBuybackSOL = Math.max(0, buybackAmountSOL - MIN_SOL_FOR_FEES);

    console.log(`Buyback amount: ${actualBuybackSOL.toFixed(4)} SOL`);

    if (actualBuybackSOL < 0.001) {
        console.log('❌ Buyback amount too small after fees');
        return null;
    }

    if (!TOKEN_ADDRESS) {
        console.log('❌ TOKEN_ADDRESS not configured');
        return null;
    }

    console.log(`Token to buy: ${TOKEN_ADDRESS}`);

    if (dryRun) {
        console.log('\n✅ Dry run complete - no transactions sent');
        console.log('ℹ️  In production, this would:');
        console.log(`   1. Swap ${actualBuybackSOL.toFixed(4)} SOL for VOLK tokens via Jupiter`);
        console.log(`   2. Burn all received tokens`);
        return {
            amountSOL: actualBuybackSOL,
            dryRun: true,
        };
    }

    const buybackLamports = Math.floor(actualBuybackSOL * LAMPORTS_PER_SOL);

    // Step 1: Get Jupiter quote
    console.log('\n📊 Getting Jupiter quote...');

    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.append('inputMint', 'So11111111111111111111111111111111111111112'); // SOL
    quoteUrl.searchParams.append('outputMint', TOKEN_ADDRESS);
    quoteUrl.searchParams.append('amount', buybackLamports.toString());
    quoteUrl.searchParams.append('slippageBps', '100'); // 1%

    const quoteResponse = await fetch(quoteUrl.toString());
    if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.status}`);
    }

    const quoteData = await quoteResponse.json();
    const expectedTokens = parseInt(quoteData.outAmount);
    console.log(`   Expected tokens: ${expectedTokens.toLocaleString()}`);

    // Step 2: Get swap transaction
    console.log('📝 Creating swap transaction...');

    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: creatorKeypair.publicKey.toString(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 'auto',
        }),
    });

    if (!swapResponse.ok) {
        throw new Error(`Jupiter swap failed: ${swapResponse.status}`);
    }

    const swapData = await swapResponse.json();
    const swapTransaction = Transaction.from(
        Buffer.from(swapData.swapTransaction, 'base64')
    );

    console.log('📤 Sending swap transaction...');

    swapTransaction.partialSign(creatorKeypair);

    const buySignature = await connection.sendRawTransaction(
        swapTransaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    console.log(`⏳ Confirming swap: ${buySignature}`);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    await connection.confirmTransaction({
        signature: buySignature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed');

    console.log(`✅ Buyback completed!`);
    console.log(`   Transaction: https://solscan.io/tx/${buySignature}`);

    // Step 3: Wait for tokens to arrive
    console.log('\n⏳ Waiting for tokens to arrive...');
    await sleep(3000);

    // Step 4: Get token balance and burn
    const tokenMintPubkey = new PublicKey(TOKEN_ADDRESS);
    const tokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        creatorKeypair.publicKey
    );

    const tokenBalanceInfo = await connection.getTokenAccountBalance(tokenAccount);
    const tokensToBurn = parseInt(tokenBalanceInfo.value.amount);

    if (tokensToBurn === 0) {
        throw new Error('No tokens received from buyback');
    }

    console.log(`🔥 Burning ${tokensToBurn.toLocaleString()} tokens...`);

    const { blockhash: burnBlockhash, lastValidBlockHeight: burnLastValid } =
        await connection.getLatestBlockhash('confirmed');

    const burnTransaction = new Transaction({
        feePayer: creatorKeypair.publicKey,
        blockhash: burnBlockhash,
        lastValidBlockHeight: burnLastValid,
    });

    burnTransaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        createBurnInstruction(
            tokenAccount,
            tokenMintPubkey,
            creatorKeypair.publicKey,
            tokensToBurn
        )
    );

    burnTransaction.sign(creatorKeypair);

    const burnSignature = await connection.sendRawTransaction(
        burnTransaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    console.log(`⏳ Confirming burn: ${burnSignature}`);

    await connection.confirmTransaction({
        signature: burnSignature,
        blockhash: burnBlockhash,
        lastValidBlockHeight: burnLastValid,
    }, 'confirmed');

    console.log(`✅ Tokens burned successfully!`);
    console.log(`   Transaction: https://solscan.io/tx/${burnSignature}`);

    return {
        amountSOL: actualBuybackSOL,
        tokensBought: tokensToBurn,
        tokensBurned: tokensToBurn,
        buySignature,
        burnSignature,
        dryRun: false,
    };
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

async function runTest(options = {}) {
    const {
        dryRun = false,
        skipFeeCollection = false,
        skipRewardDistribution = false,
        skipBuybackBurn = false,
        winnerAddress = null,
    } = options;

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  VOLKING FEE DISTRIBUTION TEST SCRIPT     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    if (dryRun) {
        console.log('⚠️  DRY RUN MODE ENABLED - No transactions will be sent');
    }

    console.log('Configuration:');
    console.log(`  Fee Collection: ${skipFeeCollection ? '❌ DISABLED' : '✅ ENABLED'}`);
    console.log(`  Reward Distribution: ${skipRewardDistribution ? '❌ DISABLED' : '✅ ENABLED'}`);
    console.log(`  Buyback & Burn: ${skipBuybackBurn ? '❌ DISABLED' : '✅ ENABLED'}`);

    // Initialize
    if (!initializeKeypairs()) {
        console.error('\n❌ Cannot proceed without private keys');
        return;
    }

    // Show initial balances
    const initialBalances = await displayBalances();

    let feeResult = null;
    let rewardResult = null;
    let buybackResult = null;

    // Step 1: Fee Collection
    if (!skipFeeCollection) {
        feeResult = await collectAndDistributeFees(dryRun);
        if (feeResult && !dryRun) {
            await sleep(2000);
        }
    } else {
        console.log('\n💰 STEP 1: COLLECT AND DISTRIBUTE FEES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏭️  SKIPPED (disabled in config)\n');
    }

    // Step 2: Reward Distribution
    if (!skipRewardDistribution && winnerAddress) {
        rewardResult = await sendRewardToWinner(winnerAddress, dryRun);
        if (rewardResult && !dryRun) {
            await sleep(2000);
        }
    } else if (!skipRewardDistribution && !winnerAddress) {
        console.log('\n🏆 STEP 2: SEND REWARD TO WINNER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏭️  SKIPPED (no winner address provided)\n');
    } else {
        console.log('\n🏆 STEP 2: SEND REWARD TO WINNER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏭️  SKIPPED (disabled in config)\n');
    }

    // Step 3: Buyback and Burn
    if (!skipBuybackBurn && feeResult?.buybackAmount) {
        buybackResult = await executeBuybackAndBurn(feeResult.buybackAmount, dryRun);
    } else if (!skipBuybackBurn) {
        console.log('\n🔥 STEP 3: BUYBACK AND BURN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏭️  SKIPPED (no buyback amount available)\n');
    } else {
        console.log('\n🔥 STEP 3: BUYBACK AND BURN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏭️  SKIPPED (disabled in config)\n');
    }

    // Show final balances
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║              TEST COMPLETE                 ║');
    console.log('╚════════════════════════════════════════════╝');

    if (!dryRun) {
        await displayBalances();
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (feeResult) {
        console.log('Fee Distribution:');
        console.log(`  ✅ Treasury: ${feeResult.treasuryAmount.toFixed(4)} SOL`);
        console.log(`  ✅ Reward Wallet: ${feeResult.rewardWalletAmount.toFixed(4)} SOL`);
        console.log(`  ✅ Buyback: ${feeResult.buybackAmount.toFixed(4)} SOL`);
        if (!feeResult.dryRun) {
            console.log(`  🔗 TX: https://solscan.io/tx/${feeResult.signature}`);
        }
    }

    if (rewardResult) {
        console.log('\nReward Distribution:');
        console.log(`  ✅ Winner: ${rewardResult.winner.substring(0, 8)}...`);
        console.log(`  ✅ Amount: ${rewardResult.amount.toFixed(4)} SOL`);
        if (!rewardResult.dryRun) {
            console.log(`  🔗 TX: https://solscan.io/tx/${rewardResult.signature}`);
        }
    }

    if (buybackResult) {
        console.log('\nBuyback & Burn:');
        console.log(`  ✅ SOL Used: ${buybackResult.amountSOL.toFixed(4)} SOL`);
        if (!buybackResult.dryRun) {
            console.log(`  ✅ Tokens Burned: ${buybackResult.tokensBurned.toLocaleString()}`);
            console.log(`  🔗 Buy TX: https://solscan.io/tx/${buybackResult.buySignature}`);
            console.log(`  🔗 Burn TX: https://solscan.io/tx/${buybackResult.burnSignature}`);
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ============================================
// INTERACTIVE CLI
// ============================================

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function interactiveMode() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  VOLKING FEE DISTRIBUTION TEST (INTERACTIVE)║');
    console.log('╚════════════════════════════════════════════╝\n');

    const dryRunAnswer = await askQuestion('Run in DRY RUN mode? (no real transactions) [Y/n]: ');
    const dryRun = dryRunAnswer.toLowerCase() !== 'n';

    const feeAnswer = await askQuestion('Enable Fee Collection & Distribution? [Y/n]: ');
    const skipFeeCollection = feeAnswer.toLowerCase() === 'n';

    const rewardAnswer = await askQuestion('Enable Reward Distribution? [Y/n]: ');
    const skipRewardDistribution = rewardAnswer.toLowerCase() === 'n';

    let winnerAddress = null;
    if (!skipRewardDistribution) {
        winnerAddress = await askQuestion('Enter winner wallet address: ');
    }

    const buybackAnswer = await askQuestion('Enable Buyback & Burn? [Y/n]: ');
    const skipBuybackBurn = buybackAnswer.toLowerCase() === 'n';

    console.log('\n');

    await runTest({
        dryRun,
        skipFeeCollection,
        skipRewardDistribution,
        skipBuybackBurn,
        winnerAddress,
    });
}

// ============================================
// COMMAND LINE EXECUTION
// ============================================

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
VOLKING Fee Distribution Test Script

Usage:
  node testFeeDistribution.js [options]

Options:
  --dry-run                     Simulate without sending transactions
  --skip-fees                   Skip fee collection
  --skip-reward                 Skip reward distribution
  --skip-buyback                Skip buyback & burn
  --winner <address>            Winner wallet address
  --interactive                 Interactive mode (asks questions)
  --help, -h                    Show this help

Examples:
  # Interactive mode (recommended for first test)
  node testFeeDistribution.js --interactive

  # Dry run (no real transactions)
  node testFeeDistribution.js --dry-run

  # Only test fee collection (no reward, no buyback)
  node testFeeDistribution.js --skip-reward --skip-buyback

  # Full test with specific winner
  node testFeeDistribution.js --winner 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

  # Observe mode (no on-chain operations)
  node testFeeDistribution.js --skip-fees --skip-reward --skip-buyback
    `);
        process.exit(0);
    }

    if (args.includes('--interactive')) {
        interactiveMode().catch(console.error);
    } else {
        const options = {
            dryRun: args.includes('--dry-run'),
            skipFeeCollection: args.includes('--skip-fees'),
            skipRewardDistribution: args.includes('--skip-reward'),
            skipBuybackBurn: args.includes('--skip-buyback'),
            winnerAddress: args.includes('--winner') ? args[args.indexOf('--winner') + 1] : null,
        };

        runTest(options).catch(console.error);
    }
}

export { runTest, collectAndDistributeFees, sendRewardToWinner, executeBuybackAndBurn };