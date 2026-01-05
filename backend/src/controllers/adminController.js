import { handleRoundEnd } from '../services/roundService.js';
import { claimCreatorFeesViaPumpPortal } from '../services/feeService.js';
import { calculateCurrentReward } from '../services/rewardService.js';
import * as db from '../services/database.js';

export function endRound(roundState, startFeeClaimingInterval, stopFeeClaimingInterval) {
    return async (req, res) => {
        const result = await handleRoundEnd(roundState, startFeeClaimingInterval, stopFeeClaimingInterval);

        res.json({
            success: true,
            message: 'Round ended manually',
            result,
            totalRewardsPaid: roundState.totalRewardsPaid,
            totalRoundsCompleted: roundState.totalRoundsCompleted,
            totalSupplyBurned: roundState.totalSupplyBurned,
        });
    };
}

export function claimFees(roundState) {
    return async (req, res) => {
        const result = await claimCreatorFeesViaPumpPortal();

        if (result.success && result.amount > 0) {
            roundState.claimedCreatorFees += result.amount;
            roundState.stats.feesClaimedCount++;
        }

        res.json({
            success: result.success,
            amount: result.amount,
            signature: result.signature,
            claimedCreatorFees: roundState.claimedCreatorFees,
            currentRewardPool: calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees),
            error: result.error,
        });
    };
}

export async function updateSignature(req, res) {
    const { wallet, roundStart, signature } = req.body;

    await db.updateWinnerSignature(wallet, roundStart, signature);

    res.json({
        success: true,
        message: 'Signature updated in database',
        wallet,
        signature,
    });
}

export function updateBurn(roundState) {
    return async (req, res) => {
        const { roundNumber, tokensBurned, signature } = req.body;

        await db.updateBurnSignature(roundNumber, tokensBurned, signature);

        const globalStats = await db.getGlobalStats();
        roundState.totalSupplyBurned = parseFloat(globalStats.total_supply_burned || 0);

        res.json({
            success: true,
            message: 'Burn record updated in database',
            totalSupplyBurned: roundState.totalSupplyBurned,
        });
    };
}

export function setBaseReward(roundState) {
    return async (req, res) => {
        const { reward } = req.body;

        roundState.baseReward = parseFloat(reward);

        await db.updateGlobalStats({
            totalRoundsCompleted: roundState.totalRoundsCompleted,
            totalRewardsPaid: roundState.totalRewardsPaid,
            totalSupplyBurned: roundState.totalSupplyBurned,
            currentRoundNumber: roundState.roundNumber,
            rewardWalletBalance: roundState.baseReward,
            startReward: roundState.baseReward,
        });

        res.json({
            success: true,
            baseReward: roundState.baseReward,
            currentRewardPool: calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees),
        });
    };
}