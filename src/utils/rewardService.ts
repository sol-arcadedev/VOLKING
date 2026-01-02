import {
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { connection } from './solanaService';

const REWARD_WALLET = import.meta.env.VITE_REWARD_WALLET_ADDRESS || '';
const CREATOR_FEE_WALLET = import.meta.env.VITE_CREATOR_FEE_WALLET || '';

export interface RewardDistribution {
  winner: string;
  amount: number;
  signature: string;
  timestamp: number;
}

/**
 * Get balance of reward wallet
 */
export async function getRewardWalletBalance(): Promise<number> {
  try {
    if (!REWARD_WALLET) {
      console.warn('REWARD_WALLET not configured');
      return 0;
    }

    const pubkey = new PublicKey(REWARD_WALLET);
    const balance = await connection.getBalance(pubkey);

    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting reward wallet balance:', error);
    return 0;
  }
}

/**
 * Get balance of creator fee wallet
 */
export async function getCreatorFeeBalance(): Promise<number> {
  try {
    if (!CREATOR_FEE_WALLET) {
      console.warn('CREATOR_FEE_WALLET not configured');
      return 0;
    }

    const pubkey = new PublicKey(CREATOR_FEE_WALLET);
    const balance = await connection.getBalance(pubkey);

    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting creator fee balance:', error);
    return 0;
  }
}

/**
 * Transfer 20% of fees to reward wallet
 * This should be called by backend/admin with proper authentication
 */
export async function transferFeesToRewardWallet(
    fromKeypair: Keypair,
    amount: number
): Promise<string> {
  try {
    if (!REWARD_WALLET) throw new Error('REWARD_WALLET not configured');

    const toPubkey = new PublicKey(REWARD_WALLET);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
    );

    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [fromKeypair]
    );

    console.log('Transferred to reward wallet:', signature);
    return signature;
  } catch (error) {
    console.error('Error transferring fees:', error);
    throw error;
  }
}

/**
 * Send reward to winner
 * This should be called by backend/admin with proper authentication
 */
export async function sendRewardToWinner(
    rewardWalletKeypair: Keypair,
    winnerAddress: string,
    amount: number
): Promise<RewardDistribution> {
  try {
    const winnerPubkey = new PublicKey(winnerAddress);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: rewardWalletKeypair.publicKey,
          toPubkey: winnerPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
    );

    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [rewardWalletKeypair]
    );

    const distribution: RewardDistribution = {
      winner: winnerAddress,
      amount,
      signature,
      timestamp: Date.now(),
    };

    console.log('Reward sent:', distribution);
    return distribution;
  } catch (error) {
    console.error('Error sending reward:', error);
    throw error;
  }
}

/**
 * Calculate reward amount (20% of creator fees)
 */
export function calculateRewardAmount(totalFees: number): number {
  return totalFees * 0.2;
}

/**
 * Get transaction history for reward wallet
 */
export async function getRewardWalletHistory(limit: number = 50) {
  try {
    if (!REWARD_WALLET) {
      console.warn('REWARD_WALLET not configured');
      return [];
    }

    const pubkey = new PublicKey(REWARD_WALLET);
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit });

    const transactions = [];

    for (const sig of signatures) {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.meta && tx.blockTime) {
        transactions.push({
          signature: sig.signature,
          timestamp: tx.blockTime * 1000,
          success: tx.meta.err === null,
        });
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error getting reward history:', error);
    return [];
  }
}