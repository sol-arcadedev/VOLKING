import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Crown, Wallet, TrendingUp, Flame } from 'lucide-react';

interface RewardPoolData {
    // Current unclaimed fees that will be distributed at round end
    unclaimedCreatorFees: number;
    currentRoundCreatorFees: number;

    // What the reward wallet balance is now
    rewardWalletBalance: number;

    // What 20% of fees would add to reward wallet
    potentialRewardWalletAdd: number;

    // What 15% of total reward wallet would be (winner's cut)
    winnerRewardPortion: number;

    // Start reward for this round
    startReward: number;

    // Total current reward = startReward + 15% of (rewardWallet + 20% of fees)
    currentRewardPool: number;

    // Historical stats
    totalRewardsPaid: number;
    totalSupplyBurned: number;

    // Round info
    roundStart: number;
    nextRoundStart: number;
    roundNumber: number;

    // Distribution percentages
    treasuryPercentage: number;
    rewardWalletPercentage: number;
    buybackPercentage: number;
    winnerRewardPercentage: number;
    startRewardPercentage: number;
}

const formatSOL = (amount: number): string => {
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(4);
};

export const RewardPoolDisplay: React.FC = () => {
    const [poolData, setPoolData] = useState<RewardPoolData>({
        unclaimedCreatorFees: 0,
        currentRoundCreatorFees: 0,
        rewardWalletBalance: 0,
        potentialRewardWalletAdd: 0,
        winnerRewardPortion: 0,
        startReward: 0.2,
        currentRewardPool: 0.2,
        totalRewardsPaid: 0,
        totalSupplyBurned: 0,
        roundStart: Date.now(),
        nextRoundStart: Date.now() + 15 * 60 * 1000,
        roundNumber: 1,
        treasuryPercentage: 0.70,
        rewardWalletPercentage: 0.20,
        buybackPercentage: 0.10,
        winnerRewardPercentage: 0.15,
        startRewardPercentage: 0.05,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

    const fetchRewardPool = async () => {
        try {
            setError(null);
            const response = await fetch(`${API_URL}/api/reward-pool`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: RewardPoolData = await response.json();
            setPoolData(data);
            setLastUpdate(new Date());
            setLoading(false);
        } catch (err) {
            console.error('Error fetching reward pool:', err);
            setError('Failed to fetch reward pool data');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewardPool();
        // Update every 15 seconds as per requirements
        const interval = setInterval(fetchRewardPool, 15000);
        return () => clearInterval(interval);
    }, []);

    /**
     * Calculate the current potential reward for the Volume King
     * Formula: RewardWalletBalance + (15% of (rewardWalletBalance + 20% of unclaimedCreatorFees))
     *
     * This shows what the winner would receive if the round ended now:
     * - The start reward (base amount)
     * - Plus 15% of the reward wallet (which includes 20% of accumulated fees)
     */
    const calculateCurrentReward = (): number => {
        // 20% of unclaimed fees goes to reward wallet
        const potentialRewardWalletAdd = poolData.unclaimedCreatorFees * poolData.rewardWalletPercentage;

        // Total reward wallet would be current balance + potential addition
        const totalRewardWallet = poolData.rewardWalletBalance + potentialRewardWalletAdd;

        // Winner gets 15% of total reward wallet
        const winnerPortion = totalRewardWallet * poolData.winnerRewardPercentage;

        // Total reward = start reward + winner portion
        return poolData.startReward + winnerPortion;
    };

    if (loading && poolData.currentRewardPool === 0) {
        return (
            <div className="pixel-box p-8 bg-retro-black">
                <div className="text-candle-green font-display text-xl animate-pulse text-center">
                    LOADING REWARD POOL...
                </div>
            </div>
        );
    }

    const currentReward = calculateCurrentReward();
    const potentialRewardWalletAdd = poolData.unclaimedCreatorFees * poolData.rewardWalletPercentage;
    const totalRewardWallet = poolData.rewardWalletBalance + potentialRewardWalletAdd;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Reward for Volume King */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="pixel-box p-8 bg-retro-black relative overflow-hidden"
            >
                {/* Animated background */}
                <motion.div
                    className="absolute inset-0 bg-candle-green opacity-5"
                    animate={{ opacity: [0.05, 0.1, 0.05] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <Crown className="w-8 h-8 text-candle-green" />
                            <h3 className="text-lg font-display text-candle-green uppercase text-shadow-retro">
                                CURRENT REWARD FOR VOLUME KING
                            </h3>
                        </div>
                        <button
                            onClick={fetchRewardPool}
                            disabled={loading}
                            className="pixel-box bg-retro-black p-2 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Main Reward Amount */}
                    <motion.div
                        key={currentReward}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="mb-6"
                    >
                        <div className="text-5xl md:text-6xl font-display text-candle-green text-shadow-retro mb-2 tabular-nums">
                            {formatSOL(currentReward)} SOL
                        </div>
                        <div className="text-sm text-retro-white opacity-80 font-body">
                            Winner receives 15% of reward wallet + start reward
                        </div>
                    </motion.div>

                    {/* Formula Breakdown */}
                    <div className="pixel-box bg-retro-gray-dark p-4 space-y-3">
                        <div className="text-xs text-retro-white opacity-60 font-body mb-2">
                            REWARD CALCULATION BREAKDOWN
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-retro-white font-body text-sm flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-blue-400" />
                                Reward Wallet Balance:
                            </span>
                            <span className="text-blue-400 font-display text-base">
                                {formatSOL(poolData.rewardWalletBalance)} SOL
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-retro-white font-body text-sm flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-yellow-400" />
                                Unclaimed Creator Fees:
                            </span>
                            <span className="text-yellow-400 font-display text-base">
                                {formatSOL(poolData.unclaimedCreatorFees)} SOL
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-retro-white font-body opacity-80 pl-6">
                                → 20% goes to Reward Wallet:
                            </span>
                            <span className="text-candle-green font-display">
                                +{formatSOL(potentialRewardWalletAdd)} SOL
                            </span>
                        </div>

                        <div className="border-t border-retro-gray pt-3 mt-3">
                            <div className="flex justify-between items-center">
                                <span className="text-retro-white font-body text-sm">
                                    Total Reward Wallet (if claimed):
                                </span>
                                <span className="text-candle-green font-display text-base">
                                    {formatSOL(totalRewardWallet)} SOL
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-retro-white font-body opacity-80 pl-6">
                                → 15% to Winner:
                            </span>
                            <span className="text-candle-green font-display">
                                {formatSOL(totalRewardWallet * poolData.winnerRewardPercentage)} SOL
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-retro-white font-body text-sm">
                                Start Reward (Base):
                            </span>
                            <span className="text-candle-green font-display text-base">
                                +{formatSOL(poolData.startReward)} SOL
                            </span>
                        </div>

                        <div className="border-t border-candle-green pt-3 mt-3">
                            <div className="flex justify-between items-center">
                                <span className="text-candle-green font-body font-bold">
                                    TOTAL CURRENT REWARD:
                                </span>
                                <span className="text-candle-green font-display text-xl text-shadow-retro">
                                    {formatSOL(currentReward)} SOL
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-xs mt-4">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-candle-green'} animate-pulse`} />
                            <span className="text-retro-white opacity-60 font-body">
                                {error ? 'Offline' : 'Live • Updates every 15s'}
                            </span>
                        </div>
                        <span className="text-retro-white opacity-60 font-body">
                            Round #{poolData.roundNumber} • {lastUpdate.toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Protocol Stats Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="pixel-box p-8 bg-retro-black relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-6">
                        <Flame className="w-8 h-8 text-orange-500" />
                        <h3 className="text-lg font-display text-orange-500 uppercase text-shadow-retro">
                            FEE DISTRIBUTION
                        </h3>
                    </div>

                    {/* Distribution Visual */}
                    <div className="space-y-4 mb-6">
                        {/* Treasury */}
                        <div className="pixel-box bg-retro-gray-dark p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-retro-white font-body">Treasury</span>
                                <span className="text-blue-400 font-display">70%</span>
                            </div>
                            <div className="w-full bg-retro-black h-2 rounded">
                                <div className="bg-blue-400 h-2 rounded" style={{ width: '70%' }} />
                            </div>
                            <div className="text-xs text-retro-white opacity-60 mt-1">
                                Protocol development & growth
                            </div>
                        </div>

                        {/* Reward Wallet */}
                        <div className="pixel-box bg-retro-gray-dark p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-retro-white font-body">Reward Wallet</span>
                                <span className="text-candle-green font-display">20%</span>
                            </div>
                            <div className="w-full bg-retro-black h-2 rounded">
                                <div className="bg-candle-green h-2 rounded" style={{ width: '20%' }} />
                            </div>
                            <div className="text-xs text-retro-white opacity-60 mt-1">
                                15% to winner • 5% next round start
                            </div>
                        </div>

                        {/* Buyback & Burn */}
                        <div className="pixel-box bg-retro-gray-dark p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-retro-white font-body">Buyback & Burn</span>
                                <span className="text-orange-500 font-display">10%</span>
                            </div>
                            <div className="w-full bg-retro-black h-2 rounded">
                                <div className="bg-orange-500 h-2 rounded" style={{ width: '10%' }} />
                            </div>
                            <div className="text-xs text-retro-white opacity-60 mt-1">
                                Buy VOLK tokens & burn forever
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="pixel-box bg-retro-gray-dark p-4 text-center">
                            <div className="text-2xl font-display text-candle-green text-shadow-retro tabular-nums">
                                {formatSOL(poolData.totalRewardsPaid)}
                            </div>
                            <div className="text-xs text-retro-white opacity-60">
                                Total SOL Paid
                            </div>
                        </div>
                        <div className="pixel-box bg-retro-gray-dark p-4 text-center">
                            <div className="text-2xl font-display text-orange-500 text-shadow-retro tabular-nums">
                                {poolData.totalSupplyBurned > 1000000
                                    ? `${(poolData.totalSupplyBurned / 1000000).toFixed(2)}M`
                                    : poolData.totalSupplyBurned > 1000
                                        ? `${(poolData.totalSupplyBurned / 1000).toFixed(2)}K`
                                        : poolData.totalSupplyBurned.toFixed(0)}
                            </div>
                            <div className="text-xs text-retro-white opacity-60">
                                Tokens Burned
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};