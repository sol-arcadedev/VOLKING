// ============================================
// BACKEND-ONLY FEE MANAGEMENT SERVICE
// ============================================
// This file handles all on-chain operations for fee distribution
// MUST be in backend/services/ directory
// NEVER import this in frontend code
// ============================================

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    Keypair,
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createBurnInstruction,

} from '@solana/spl-token';
import bs58 from 'bs58';

// ============================================
// CONFIGURATION - From Environment Variables
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const NETWORK = process.env.SOLANA_NETWORK || 'mainnet-beta';
const HELIUS_RPC = HELIUS_API_KEY
    ? `https://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : `https://api.${NETWORK}.solana.com`;

// Public addresses (safe to expose)
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const CREATOR_WALLET_PUBLIC = process.env.CREATOR_FEE_WALLET || '';
const TREASURY_WALLET = process.env.TREASURY_WALLET || '';
const REWARD_WALLET_PUBLIC = process.env.REWARD_WALLET_PUBLIC || '';

// ============================================
// FEE DISTRIBUTION CONSTANTS
// ============================================
// Per requirements:
// - 70% to Treasury
// - 20% to Reward Wallet
// - 10% to Buyback & Burn (minus 0.02 SOL for fees)
//
// From Reward Wallet:
// - 15% to winner
// - 5% as next round start reward

const TREASURY_PERCENTAGE = 0.70;
const REWARD_WALLET_PERCENTAGE = 0.20;
const BUYBACK_BURN_PERCENTAGE = 0.10;

const WINNER_REWARD_PERCENTAGE = 0.15;
const START_REWARD_PERCENTAGE = 0.05;

const MIN_SOL_FOR_FEES = 0.02;  // Always reserve for transaction fees
const MIN_DISTRIBUTABLE = 0.01; // Minimum SOL to trigger distribution

// ============================================
// CONNECTION
// ============================================

export const connection = new Connection(HELIUS_RPC, 'confirmed');

// ============================================
// INTERFACES
// ============================================

export interface FeeBalance {
    wallet: string;
    balanceSOL: number;
    balanceLamports: number;
    timestamp: number;
}

export interface FeeDistribution {
    totalFees: number;
    treasuryAmount: number;
    rewardWalletAmount: number;
    buybackAmount: number;
    treasurySignature: string;
    rewardWalletSignature: string;
    timestamp: number;
}

export interface RewardDistribution {
    winner: string;
    amount: number;
    signature: string;
    roundNumber: number;
    timestamp: number;
}

export interface BuybackResult {
    amountSOL: number;
    tokensBought: number;
    tokensBurned: number;
    buySignature: string;
    burnSignature: string;
    timestamp: number;
}

export interface RoundEndResult {
    success: boolean;
    winner: string | null;
    feeDistribution: FeeDistribution | null;
    rewardDistribution: RewardDistribution | null;
    buybackResult: BuybackResult | null;
    nextStartReward: number;
    error?: string;
}

// ============================================
// KEYPAIR MANAGEMENT
// ============================================
// Keypairs are loaded at runtime from environment variables
// They are NEVER stored in code or config files

let creatorKeypair: Keypair | null = null;
let rewardWalletKeypair: Keypair | null = null;
let initialized = false;

/**
 * Initialize keypairs from environment variables
 * Call this once at server startup
 */
export function initializeKeypairs(): boolean {
    try {
        const creatorKey = process.env.CREATOR_PRIVATE_KEY;
        const rewardKey = process.env.REWARD_WALLET_PRIVATE_KEY;

        if (!creatorKey || !rewardKey) {
            console.warn('⚠️ Private keys not set - fee management disabled');
            return false;
        }

        const creatorSecretKey = bs58.decode(creatorKey);
        const rewardSecretKey = bs58.decode(rewardKey);

        creatorKeypair = Keypair.fromSecretKey(creatorSecretKey);
        rewardWalletKeypair = Keypair.fromSecretKey(rewardSecretKey);

        // Verify public keys match expected
        if (CREATOR_WALLET_PUBLIC && creatorKeypair.publicKey.toString() !== CREATOR_WALLET_PUBLIC) {
            console.warn('⚠️ Creator keypair does not match CREATOR_FEE_WALLET');
        }
        if (REWARD_WALLET_PUBLIC && rewardWalletKeypair.publicKey.toString() !== REWARD_WALLET_PUBLIC) {
            console.warn('⚠️ Reward keypair does not match REWARD_WALLET_PUBLIC');
        }

        initialized = true;
        console.log('✅ Fee management keypairs initialized');
        console.log(`   Creator: ${creatorKeypair.publicKey.toString().substring(0, 8)}...`);
        console.log(`   Reward: ${rewardWalletKeypair.publicKey.toString().substring(0, 8)}...`);

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize keypairs:', error);
        return false;
    }
}

function ensureInitialized(): void {
    if (!initialized || !creatorKeypair || !rewardWalletKeypair) {
        throw new Error('Fee management not initialized. Call initializeKeypairs() first.');
    }
}

// ============================================
// READ-ONLY FUNCTIONS (Safe)
// ============================================

export async function getWalletBalance(address: string): Promise<FeeBalance> {
    try {
        const pubkey = new PublicKey(address);
        const balance = await connection.getBalance(pubkey);

        return {
            wallet: address,
            balanceSOL: balance / LAMPORTS_PER_SOL,
            balanceLamports: balance,
            timestamp: Date.now(),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to get balance for ${address}: ${errorMessage}`);
    }
}

export async function getCreatorBalance(): Promise<FeeBalance> {
    if (!CREATOR_WALLET_PUBLIC) {
        throw new Error('CREATOR_FEE_WALLET not configured');
    }
    return getWalletBalance(CREATOR_WALLET_PUBLIC);
}

export async function getRewardWalletBalance(): Promise<FeeBalance> {
    if (!REWARD_WALLET_PUBLIC) {
        throw new Error('REWARD_WALLET_PUBLIC not configured');
    }
    return getWalletBalance(REWARD_WALLET_PUBLIC);
}

export async function getTreasuryBalance(): Promise<FeeBalance> {
    if (!TREASURY_WALLET) {
        throw new Error('TREASURY_WALLET not configured');
    }
    return getWalletBalance(TREASURY_WALLET);
}

/**
 * Estimate fee distribution without executing
 */
export async function estimateFeeDistribution(): Promise<{
    totalFees: number;
    distributable: number;
    treasury: number;
    rewardWallet: number;
    buyback: number;
}> {
    const balance = await getCreatorBalance();
    const distributable = Math.max(0, balance.balanceSOL - MIN_DISTRIBUTABLE);

    return {
        totalFees: balance.balanceSOL,
        distributable,
        treasury: distributable * TREASURY_PERCENTAGE,
        rewardWallet: distributable * REWARD_WALLET_PERCENTAGE,
        buyback: Math.max(0, (distributable * BUYBACK_BURN_PERCENTAGE) - MIN_SOL_FOR_FEES),
    };
}

/**
 * Calculate winner reward from reward wallet
 */
export async function calculateWinnerReward(): Promise<{
    rewardWalletBalance: number;
    winnerReward: number;
    nextStartReward: number;
}> {
    const balance = await getRewardWalletBalance();

    return {
        rewardWalletBalance: balance.balanceSOL,
        winnerReward: balance.balanceSOL * WINNER_REWARD_PERCENTAGE,
        nextStartReward: balance.balanceSOL * START_REWARD_PERCENTAGE,
    };
}

// ============================================
// WRITE FUNCTIONS (Require Private Keys)
// ============================================

/**
 * Collect creator fees and distribute to treasury + reward wallet
 * Does NOT execute buyback (that's a separate step)
 */
export async function collectAndDistributeFees(): Promise<FeeDistribution> {
    ensureInitialized();

    console.log('💰 Collecting and distributing fees...');

    const balance = await connection.getBalance(creatorKeypair!.publicKey);
    const totalFeesSOL = balance / LAMPORTS_PER_SOL;

    if (totalFeesSOL < MIN_DISTRIBUTABLE) {
        throw new Error(`Insufficient fees: ${totalFeesSOL.toFixed(4)} SOL (minimum ${MIN_DISTRIBUTABLE} SOL)`);
    }

    // Reserve for rent and fees
    const reserveLamports = MIN_DISTRIBUTABLE * LAMPORTS_PER_SOL;
    const distributableLamports = balance - reserveLamports;

    // Calculate distribution
    const treasuryLamports = Math.floor(distributableLamports * TREASURY_PERCENTAGE);
    const rewardWalletLamports = Math.floor(distributableLamports * REWARD_WALLET_PERCENTAGE);
    const buybackLamports = Math.floor(distributableLamports * BUYBACK_BURN_PERCENTAGE);

    console.log(`   Total fees: ${totalFeesSOL.toFixed(4)} SOL`);
    console.log(`   Treasury (70%): ${(treasuryLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Reward Wallet (20%): ${(rewardWalletLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Buyback (10%): ${(buybackLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    // Create transaction with both transfers
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    const transaction = new Transaction({
        feePayer: creatorKeypair!.publicKey,
        blockhash,
        lastValidBlockHeight,
    });

    // Add compute budget for priority
    transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
    );

    // Transfer to treasury
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: creatorKeypair!.publicKey,
            toPubkey: new PublicKey(TREASURY_WALLET),
            lamports: treasuryLamports,
        })
    );

    // Transfer to reward wallet
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: creatorKeypair!.publicKey,
            toPubkey: new PublicKey(REWARD_WALLET_PUBLIC),
            lamports: rewardWalletLamports,
        })
    );

    // Sign and send
    transaction.sign(creatorKeypair!);

    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed');

    console.log(`✅ Fees distributed: ${signature}`);

    return {
        totalFees: totalFeesSOL,
        treasuryAmount: treasuryLamports / LAMPORTS_PER_SOL,
        rewardWalletAmount: rewardWalletLamports / LAMPORTS_PER_SOL,
        buybackAmount: buybackLamports / LAMPORTS_PER_SOL,
        treasurySignature: signature,
        rewardWalletSignature: signature, // Same TX
        timestamp: Date.now(),
    };
}

/**
 * Send reward to winner (15% of reward wallet)
 */
export async function sendRewardToWinner(
    winnerAddress: string,
    roundNumber: number
): Promise<RewardDistribution> {
    ensureInitialized();

    console.log(`🏆 Sending reward to winner: ${winnerAddress.substring(0, 8)}...`);

    // Get reward wallet balance
    const rewardBalance = await connection.getBalance(rewardWalletKeypair!.publicKey);
    const rewardBalanceSOL = rewardBalance / LAMPORTS_PER_SOL;

    // Calculate 15% for winner
    const winnerRewardSOL = rewardBalanceSOL * WINNER_REWARD_PERCENTAGE;
    const winnerRewardLamports = Math.floor(winnerRewardSOL * LAMPORTS_PER_SOL);

    if (winnerRewardLamports < 1000) { // Minimum 0.000001 SOL
        throw new Error(`Reward too small: ${winnerRewardSOL.toFixed(6)} SOL`);
    }

    console.log(`   Reward wallet balance: ${rewardBalanceSOL.toFixed(4)} SOL`);
    console.log(`   Winner reward (15%): ${winnerRewardSOL.toFixed(4)} SOL`);

    const winnerPubkey = new PublicKey(winnerAddress);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    const transaction = new Transaction({
        feePayer: rewardWalletKeypair!.publicKey,
        blockhash,
        lastValidBlockHeight,
    });

    transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        SystemProgram.transfer({
            fromPubkey: rewardWalletKeypair!.publicKey,
            toPubkey: winnerPubkey,
            lamports: winnerRewardLamports,
        })
    );

    transaction.sign(rewardWalletKeypair!);

    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed');

    console.log(`✅ Reward sent: ${signature}`);

    return {
        winner: winnerAddress,
        amount: winnerRewardSOL,
        signature,
        roundNumber,
        timestamp: Date.now(),
    };
}

/**
 * Execute buyback and burn
 * Uses Jupiter for swap, then burns received tokens
 */
export async function executeBuybackAndBurn(
    buybackAmountSOL: number
): Promise<BuybackResult> {
    ensureInitialized();

    if (!TOKEN_ADDRESS) {
        throw new Error('TOKEN_ADDRESS not configured');
    }

    // Ensure minimum amount after fees
    const actualBuybackSOL = Math.max(0, buybackAmountSOL - MIN_SOL_FOR_FEES);

    if (actualBuybackSOL < 0.001) {
        throw new Error(`Buyback amount too small after fees: ${actualBuybackSOL.toFixed(4)} SOL`);
    }

    console.log(`🔥 Executing buyback and burn: ${actualBuybackSOL.toFixed(4)} SOL`);

    const tokenMintPubkey = new PublicKey(TOKEN_ADDRESS);
    const buybackLamports = Math.floor(actualBuybackSOL * LAMPORTS_PER_SOL);

    // Step 1: Get Jupiter quote
    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.append('inputMint', 'So11111111111111111111111111111111111111112'); // SOL
    quoteUrl.searchParams.append('outputMint', TOKEN_ADDRESS);
    quoteUrl.searchParams.append('amount', buybackLamports.toString());
    quoteUrl.searchParams.append('slippageBps', '100'); // 1% slippage

    const quoteResponse = await fetch(quoteUrl.toString());
    if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.status}`);
    }

    const quoteData = await quoteResponse.json();
    const expectedTokens = parseInt(quoteData.outAmount);
    console.log(`   Expected tokens: ${expectedTokens}`);

    // Step 2: Get swap transaction from Jupiter
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: creatorKeypair!.publicKey.toString(),
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

    // Sign and send swap
    swapTransaction.partialSign(creatorKeypair!);

    const buySignature = await connection.sendRawTransaction(
        swapTransaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    await connection.confirmTransaction({
        signature: buySignature,
        blockhash,
        lastValidBlockHeight,
    }, 'confirmed');

    console.log(`✅ Buyback completed: ${buySignature}`);

    // Step 3: Wait for token account to update
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Get token balance and burn
    const tokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        creatorKeypair!.publicKey
    );

    const tokenBalanceInfo = await connection.getTokenAccountBalance(tokenAccount);
    const tokensToBurn = parseInt(tokenBalanceInfo.value.amount);

    if (tokensToBurn === 0) {
        throw new Error('No tokens received from buyback');
    }

    console.log(`   Burning ${tokensToBurn} tokens...`);

    // Create burn transaction
    const { blockhash: burnBlockhash, lastValidBlockHeight: burnLastValid } =
        await connection.getLatestBlockhash('confirmed');

    const burnTransaction = new Transaction({
        feePayer: creatorKeypair!.publicKey,
        blockhash: burnBlockhash,
        lastValidBlockHeight: burnLastValid,
    });

    burnTransaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        createBurnInstruction(
            tokenAccount,
            tokenMintPubkey,
            creatorKeypair!.publicKey,
            tokensToBurn
        )
    );

    burnTransaction.sign(creatorKeypair!);

    const burnSignature = await connection.sendRawTransaction(
        burnTransaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    await connection.confirmTransaction({
        signature: burnSignature,
        blockhash: burnBlockhash,
        lastValidBlockHeight: burnLastValid,
    }, 'confirmed');

    console.log(`✅ Tokens burned: ${burnSignature}`);

    return {
        amountSOL: actualBuybackSOL,
        tokensBought: tokensToBurn,
        tokensBurned: tokensToBurn,
        buySignature,
        burnSignature,
        timestamp: Date.now(),
    };
}

/**
 * Execute complete round end process
 * 1. Collect and distribute fees (70% treasury, 20% reward wallet)
 * 2. Execute buyback and burn (10% minus fees)
 * 3. Send reward to winner (15% of reward wallet)
 */
export async function executeRoundEnd(
    winnerAddress: string,
    roundNumber: number
): Promise<RoundEndResult> {
    ensureInitialized();

    console.log('\n🎊 ===== ROUND END PROCESS =====\n');

    try {
        // Step 1: Distribute fees
        const feeDistribution = await collectAndDistributeFees();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Execute buyback and burn
        let buybackResult: BuybackResult | null = null;
        if (feeDistribution.buybackAmount > MIN_SOL_FOR_FEES) {
            try {
                buybackResult = await executeBuybackAndBurn(feeDistribution.buybackAmount);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (buybackError) {
                console.error('⚠️ Buyback failed (continuing):', buybackError);
            }
        }

        // Step 3: Send reward to winner
        const rewardDistribution = await sendRewardToWinner(winnerAddress, roundNumber);

        // Calculate next start reward (5% of remaining reward wallet)
        const remainingBalance = await getRewardWalletBalance();
        const nextStartReward = remainingBalance.balanceSOL * START_REWARD_PERCENTAGE;

        console.log('\n✅ ===== ROUND END COMPLETE =====\n');

        return {
            success: true,
            winner: winnerAddress,
            feeDistribution,
            rewardDistribution,
            buybackResult,
            nextStartReward,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Round end error:', error);

        return {
            success: false,
            winner: winnerAddress,
            feeDistribution: null,
            rewardDistribution: null,
            buybackResult: null,
            nextStartReward: 0,
            error: errorMessage,
        };
    }
}

// ============================================
// CONFIGURATION VALIDATION
// ============================================

export function validateConfiguration(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
} {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Required for basic operation
    if (!TOKEN_ADDRESS) missing.push('TOKEN_ADDRESS');
    if (!CREATOR_WALLET_PUBLIC) missing.push('CREATOR_FEE_WALLET');
    if (!TREASURY_WALLET) missing.push('TREASURY_WALLET');
    if (!REWARD_WALLET_PUBLIC) missing.push('REWARD_WALLET_PUBLIC');

    // Required for on-chain operations
    if (!process.env.CREATOR_PRIVATE_KEY) {
        warnings.push('CREATOR_PRIVATE_KEY not set - fee collection disabled');
    }
    if (!process.env.REWARD_WALLET_PRIVATE_KEY) {
        warnings.push('REWARD_WALLET_PRIVATE_KEY not set - reward distribution disabled');
    }

    // Optional but recommended
    if (!HELIUS_API_KEY) {
        warnings.push('HELIUS_API_KEY not set - using public RPC (slower)');
    }

    return {
        valid: missing.length === 0,
        missing,
        warnings,
    };
}

/**
 * Get public configuration (safe to expose)
 */
export function getPublicConfig() {
    return {
        network: NETWORK,
        tokenAddress: TOKEN_ADDRESS,
        creatorWallet: CREATOR_WALLET_PUBLIC,
        treasuryWallet: TREASURY_WALLET,
        rewardWallet: REWARD_WALLET_PUBLIC,
        feeDistribution: {
            treasury: `${TREASURY_PERCENTAGE * 100}%`,
            rewardWallet: `${REWARD_WALLET_PERCENTAGE * 100}%`,
            buybackBurn: `${BUYBACK_BURN_PERCENTAGE * 100}%`,
        },
        rewardDistribution: {
            winner: `${WINNER_REWARD_PERCENTAGE * 100}% of reward wallet`,
            startReward: `${START_REWARD_PERCENTAGE * 100}% of reward wallet`,
        },
        minSolForFees: MIN_SOL_FOR_FEES,
        initialized,
    };
}