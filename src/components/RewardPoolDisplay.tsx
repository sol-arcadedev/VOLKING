import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Crown, Wallet, TrendingUp } from 'lucide-react';

interface RewardPoolData {
    claimedCreatorFees: number;
    fifteenPercentOfFees: number;
    fivePercentOfFees: number;
    baseReward: number;
    currentRewardPool: number;
    totalRewardsPaid: number;
    totalSupplyBurned: number;
    roundStart: number;
    nextRoundStart: number;
    roundNumber: number;
    roundInProgress: boolean;
    treasuryPercentage: number;
    rewardWalletPercentage: number;
    buybackPercentage: number;
    winnerRewardPercentage: number;
    nextRoundBasePercentage: number;
}

const formatSOL = (amount: number): string => {
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(4);
};

export const RewardPoolDisplay: React.FC = () => {
    const [poolData, setPoolData] = useState<RewardPoolData>({
        claimedCreatorFees: 0,
        fifteenPercentOfFees: 0,
        fivePercentOfFees: 0,
        baseReward: 0.2,
        currentRewardPool: 0.2,
        totalRewardsPaid: 0,
        totalSupplyBurned: 0,
        roundStart: Date.now(),
        nextRoundStart: Date.now() + 15 * 60 * 1000,
        roundNumber: 1,
        roundInProgress: true,
        treasuryPercentage: 0.70,
        rewardWalletPercentage: 0.05,
        buybackPercentage: 0.10,
        winnerRewardPercentage: 0.15,
        nextRoundBasePercentage: 0.05,
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
        const interval = setInterval(fetchRewardPool, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading && poolData.currentRewardPool === 0) {
        return (
            <div className="pixel-box p-4 bg-retro-black">
                <div className="text-candle-green font-display text-sm animate-pulse text-center">
                    LOADING...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Current Reward */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pixel-box p-4 bg-retro-black relative overflow-hidden"
            >
                <motion.div
                    className="absolute inset-0 bg-candle-green opacity-5"
                    animate={{ opacity: [0.05, 0.1, 0.05] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <Crown className="w-5 h-5 text-candle-green" />
                            <h3 className="text-sm font-display text-candle-green uppercase">
                                VOLUME KING REWARD
                            </h3>
                        </div>
                        <button
                            onClick={fetchRewardPool}
                            disabled={loading}
                            className="pixel-box bg-retro-black p-1.5 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <motion.div
                        key={poolData.currentRewardPool}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        className="mb-3"
                    >
                        <div className="text-4xl font-display text-candle-green text-shadow-retro mb-1">
                            {formatSOL(poolData.currentRewardPool)} SOL
                        </div>
                        <div className="text-xs text-retro-white opacity-80 font-body">
                            15% of claimed fees + base reward
                        </div>
                    </motion.div>

                    {/* Formula Breakdown */}
                    <div className="pixel-box bg-retro-gray-dark p-3 space-y-2">
                        <div className="text-xs text-retro-white opacity-60 font-body mb-1">
                            BREAKDOWN
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-retro-white font-body flex items-center gap-1">
                                <Wallet className="w-3 h-3 text-blue-400" />
                                Base Reward:
                            </span>
                            <span className="text-blue-400 font-display">
                                {formatSOL(poolData.baseReward)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-retro-white font-body flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-yellow-400" />
                                Claimed Fees:
                            </span>
                            <span className="text-yellow-400 font-display">
                                {formatSOL(poolData.claimedCreatorFees)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs opacity-80 pl-4">
                            <span className="text-retro-white font-body">
                                → 15% of Fees:
                            </span>
                            <span className="text-candle-green font-display">
                                {formatSOL(poolData.fifteenPercentOfFees)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs opacity-80 pl-4">
                            <span className="text-retro-white font-body">
                                → 5% next round:
                            </span>
                            <span className="text-blue-400 font-display">
                                {formatSOL(poolData.fivePercentOfFees)}
                            </span>
                        </div>

                        <div className="border-t border-candle-green pt-2 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-candle-green font-body font-bold text-xs">
                                    TOTAL:
                                </span>
                                <span className="text-candle-green font-display text-base">
                                    {formatSOL(poolData.currentRewardPool)} SOL
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-xs mt-2">
                        <div className="flex items-center space-x-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : poolData.roundInProgress ? 'bg-candle-green' : 'bg-yellow-500'} animate-pulse`} />
                            <span className="text-retro-white opacity-60 font-body">
                                {error ? 'Offline' : poolData.roundInProgress ? 'Live' : 'Ending...'}
                            </span>
                        </div>
                        <span className="text-retro-white opacity-60 font-body">
                            #{poolData.roundNumber}
                        </span>
                    </div>

                    <div className="text-xs text-retro-white opacity-40 font-body mt-1 text-right">
                        Updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                </div>
            </motion.div>

            {/* Fee Distribution */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="pixel-box p-4 bg-retro-black"
            >

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className=""
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div className="pixel-box bg-retro-gray-dark p-3 text-center">
                            <div className="text-2xl font-display text-candle-green text-shadow-retro mb-1">
                                {formatSOL(poolData.totalRewardsPaid)}
                            </div>
                            <div className="text-sm text-retro-white opacity-70 font-body">
                                Rewards Paid (SOL)
                            </div>
                        </div>
                        <div className="pixel-box bg-retro-gray-dark p-3 text-center">
                            <div className="text-2xl font-display text-orange-500 text-shadow-retro mb-1">
                                {poolData.totalSupplyBurned > 1000000
                                    ? `${(poolData.totalSupplyBurned / 1000000).toFixed(2)}M`
                                    : poolData.totalSupplyBurned > 1000
                                        ? `${(poolData.totalSupplyBurned / 1000).toFixed(2)}K`
                                        : poolData.totalSupplyBurned.toFixed(0)}
                            </div>
                            <div className="text-sm text-retro-white opacity-70 font-body">
                                Supply Burned
                            </div>
                        </div>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
};