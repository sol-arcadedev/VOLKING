import { BLOCKCHAIN } from '../config/constants.js';

export class RoundState {
    constructor() {
        this.volumeData = new Map();
        this.currentRoundStart = 0;
        this.claimedCreatorFees = 0;
        this.roundNumber = 1;
        this.baseReward = BLOCKCHAIN.INITIAL_BASE_REWARD;
        this.totalRewardsPaid = 0;
        this.totalSupplyBurned = 0;
        this.totalRoundsCompleted = 0;
        this.roundInProgress = true;
        this.stats = {
            processed: 0,
            excluded: 0,
            totalSolVolume: 0,
            feesClaimedCount: 0,
        };
    }

    getCurrentWinner() {
        if (this.volumeData.size === 0) return null;
        const leaderboard = Array.from(this.volumeData.values())
            .sort((a, b) => b.volume - a.volume);
        return leaderboard[0] || null;
    }

    updateVolume(wallet, solAmount, timestamp) {
        const existing = this.volumeData.get(wallet) || {
            wallet,
            volume: 0,
            trades: 0,
            lastTrade: 0,
        };

        existing.volume += solAmount;
        existing.trades += 1;
        existing.lastTrade = Math.max(existing.lastTrade, timestamp);

        this.volumeData.set(wallet, existing);
    }

    resetForNewRound(clearVolume = true) {
        if (clearVolume) {
            this.volumeData = new Map();
        }
        this.claimedCreatorFees = 0;
        this.stats.totalSolVolume = 0;
        this.stats.feesClaimedCount = 0;
    }

    loadFromDatabase(globalStats) {
        if (globalStats) {
            this.totalRoundsCompleted = parseInt(globalStats.total_rounds_completed || 0);
            this.totalRewardsPaid = parseFloat(globalStats.total_rewards_paid || 0);
            this.totalSupplyBurned = parseFloat(globalStats.total_supply_burned || 0);
            this.roundNumber = parseInt(globalStats.current_round_number || 1);
            this.baseReward = parseFloat(globalStats.start_reward || BLOCKCHAIN.INITIAL_BASE_REWARD);
        }
    }

    getLeaderboard(limit = 10) {
        return Array.from(this.volumeData.values())
            .sort((a, b) => b.volume - a.volume)
            .slice(0, limit);
    }

    toDatabase() {
        return {
            totalRoundsCompleted: this.totalRoundsCompleted,
            totalRewardsPaid: this.totalRewardsPaid,
            totalSupplyBurned: this.totalSupplyBurned,
            currentRoundNumber: this.roundNumber,
            rewardWalletBalance: this.baseReward,
            startReward: this.baseReward,
        };
    }
}
