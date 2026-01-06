import { calculateCurrentReward } from '../services/rewardService.js';
import * as db from '../services/database.js';
import { FEE_DISTRIBUTION, TIMING } from '../config/constants.js';

export function getHealth(roundState, getSystemActiveStatus) {
    return async (req, res) => {
        const systemActive = getSystemActiveStatus ? getSystemActiveStatus() : true;
        const dbHealth = await db.checkDatabaseHealth();
        const { FEATURES } = await import('../config/features.js');
        const { ENV } = await import('../config/env.js');
        const { BLOCKCHAIN } = await import('../config/constants.js');
        const { getWalletCache } = await import('../services/walletService.js');

        res.json({
            status: 'ok',
            systemActive,
            database: dbHealth.healthy ? 'connected' : 'disconnected',
            databaseVersion: dbHealth.version?.split(' ')[0],
            roundStart: new Date(roundState.currentRoundStart).toISOString(),
            roundNumber: roundState.roundNumber,
            traders: roundState.volumeData.size,
            cacheSize: getWalletCache().size,
            roundInProgress: roundState.roundInProgress,
            stats: roundState.stats,
            features: {
                feeCollection: FEATURES.FEE_COLLECTION,
                rewardDistribution: FEATURES.REWARD_DISTRIBUTION,
                buybackBurn: FEATURES.BUYBACK_BURN,
                autoClaim: FEATURES.AUTO_CLAIM,
            },
            config: {
                tokenDecimals: BLOCKCHAIN.TOKEN_DECIMALS,
                tokenAddress: ENV.TOKEN_ADDRESS ? `${ENV.TOKEN_ADDRESS.substring(0, 8)}...` : 'not set',
                creatorFeeWallet: ENV.CREATOR_FEE_WALLET ? `${ENV.CREATOR_FEE_WALLET.substring(0, 8)}...` : 'not set',
                treasuryWallet: ENV.TREASURY_WALLET ? `${ENV.TREASURY_WALLET.substring(0, 8)}...` : 'not set',
                rewardWallet: ENV.REWARD_WALLET_PUBLIC ? `${ENV.REWARD_WALLET_PUBLIC.substring(0, 8)}...` : 'not set',
            },
            feeDistribution: {
                treasury: `${FEE_DISTRIBUTION.TREASURY * 100}%`,
                winnerReward: `${FEE_DISTRIBUTION.WINNER_REWARD * 100}%`,
                nextRoundBase: `${FEE_DISTRIBUTION.NEXT_ROUND_BASE * 100}%`,
                buybackBurn: `${FEE_DISTRIBUTION.BUYBACK_BURN * 100}%`,
            },
        });
    };
}

export function getLeaderboard(roundState, getSystemActiveStatus) {
    return (req, res) => {
        const systemActive = getSystemActiveStatus ? getSystemActiveStatus() : true;
        const leaderboard = roundState.getLeaderboard(10);

        // Calculate next round start based on current round start + configured duration
        const nextRoundStart = roundState.currentRoundStart + TIMING.ROUND_DURATION;

        res.json({
            systemActive,
            roundStart: roundState.currentRoundStart,
            nextRoundStart: nextRoundStart,
            roundNumber: roundState.roundNumber,
            leaderboard,
            totalTraders: roundState.volumeData.size,
            volumeUnit: 'SOL',
        });
    };
}

export function getRewardPool(roundState) {
    return (req, res) => {
        const fifteenPercentOfFees = roundState.claimedCreatorFees * FEE_DISTRIBUTION.WINNER_REWARD;
        const fivePercentOfFees = roundState.claimedCreatorFees * FEE_DISTRIBUTION.NEXT_ROUND_BASE;
        const totalCurrentReward = calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees);

        // Calculate next round start based on current round start + configured duration
        const nextRoundStart = roundState.currentRoundStart + TIMING.ROUND_DURATION;

        res.json({
            claimedCreatorFees: roundState.claimedCreatorFees,
            fifteenPercentOfFees,
            fivePercentOfFees,
            baseReward: roundState.baseReward,
            currentRewardPool: totalCurrentReward,
            totalRewardsPaid: roundState.totalRewardsPaid,
            totalSupplyBurned: roundState.totalSupplyBurned,
            roundStart: roundState.currentRoundStart,
            nextRoundStart: nextRoundStart,
            roundNumber: roundState.roundNumber,
            roundInProgress: roundState.roundInProgress,
            treasuryPercentage: FEE_DISTRIBUTION.TREASURY,
            rewardWalletPercentage: FEE_DISTRIBUTION.NEXT_ROUND_BASE,
            buybackPercentage: FEE_DISTRIBUTION.BUYBACK_BURN,
            winnerRewardPercentage: FEE_DISTRIBUTION.WINNER_REWARD,
            nextRoundBasePercentage: FEE_DISTRIBUTION.NEXT_ROUND_BASE,
        });
    };
}

export function getGlobalStats(roundState) {
    return async (req, res) => {
        const degens = await db.getHallOfDegens();

        res.json({
            totalRewardsPaid: roundState.totalRewardsPaid,
            totalSupplyBurned: roundState.totalSupplyBurned,
            totalRoundsCompleted: roundState.totalRoundsCompleted,
            totalUniqueWinners: degens.length,
            currentRoundNumber: roundState.roundNumber,
            rewardWalletBalance: roundState.baseReward,
            startReward: roundState.baseReward,
            lastUpdated: Date.now(),
        });
    };
}

export async function getHallOfDegens(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const degens = await db.getHallOfDegens();
    const recentTransfers = await db.getRewardTransfers(50);

    res.json({
        degens: degens.slice(0, limit),
        total: degens.length,
        recentTransfers: recentTransfers.map(t => ({
            wallet: t.wallet,
            amount: parseFloat(t.amount),
            signature: t.signature,
            roundNumber: parseInt(t.round_number),
            roundStart: parseInt(t.round_start),
            timestamp: parseInt(t.timestamp),
        })),
    });
}

export async function getWinners(req, res) {
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
    });
}

export async function getBurns(req, res) {
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
    });
}