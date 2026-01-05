import { transferSOL } from './transactionService.js';
import { getKeypairFromPrivateKey } from './walletService.js';
import { ENV } from '../config/env.js';
import { FEATURES } from '../config/features.js';
import { FEE_DISTRIBUTION } from '../config/constants.js';

export function calculateCurrentReward(baseReward, claimedCreatorFees) {
    const fifteenPercentOfFees = claimedCreatorFees * FEE_DISTRIBUTION.WINNER_REWARD;
    return baseReward + fifteenPercentOfFees;
}

export async function sendRewardToWinner(winnerAddress, amount) {
    if (!FEATURES.REWARD_DISTRIBUTION) {
        console.log('⚠️ Reward distribution disabled');
        return { success: false, signature: null, error: 'Reward distribution disabled' };
    }

    if (amount < 0.001) {
        console.log('⚠️ Reward amount too small');
        return { success: false, signature: null, error: 'Reward amount too small' };
    }

    console.log(`\n🏆 Sending ${amount.toFixed(4)} SOL reward to winner ${winnerAddress.substring(0, 8)}...`);

    const rewardKeypair = getKeypairFromPrivateKey(ENV.REWARD_WALLET_PRIVATE);

    if (!rewardKeypair) {
        console.log('❌ Reward wallet keypair not configured - CANNOT send reward');
        return { success: false, signature: null, error: 'Reward wallet keypair not configured' };
    }

    try {
        const signature = await transferSOL(rewardKeypair, winnerAddress, amount);

        if (!signature) {
            throw new Error('Transfer failed - no signature returned');
        }

        console.log(`   ✅ Reward sent successfully!`);
        console.log(`   🔍 Signature: ${signature}`);

        return { success: true, signature };
    } catch (error) {
        console.error('❌ Error sending reward:', error.message);
        return { success: false, signature: null, error: error.message };
    }
}