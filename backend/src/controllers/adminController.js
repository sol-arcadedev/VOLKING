import { handleRoundEnd } from '../services/roundService.js';
import { claimCreatorFeesViaPumpPortal } from '../services/feeService.js';
import { calculateCurrentReward } from '../services/rewardService.js';
import * as db from '../services/database.js';

// ============================================
// SYSTEM CONTROL CONTROLLERS
// ============================================

export function getSystemStatus(systemControl) {
    return (req, res) => {
        try {
            const status = systemControl.getSystemStatus();

            res.json({
                success: true,
                status,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting system status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get system status',
                details: error.message
            });
        }
    };
}

export function startSystem(systemControl) {
    return async (req, res) => {
        try {
            console.log('🎮 Admin requested system START');
            const result = systemControl.startSystem();

            res.json({
                success: result.success,
                message: result.message,
                systemStatus: systemControl.getSystemStatus(),
                roundNumber: result.roundNumber,
                baseReward: result.baseReward,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error starting system:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start system',
                details: error.message
            });
        }
    };
}

export function stopSystem(systemControl) {
    return async (req, res) => {
        try {
            console.log('🛑 Admin requested system STOP (EMERGENCY)');
            const result = systemControl.stopSystem();

            res.json({
                success: result.success,
                message: result.message,
                systemStatus: systemControl.getSystemStatus(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error stopping system:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to stop system',
                details: error.message
            });
        }
    };
}

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