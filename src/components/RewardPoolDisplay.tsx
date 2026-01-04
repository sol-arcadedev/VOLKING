import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Crown } from 'lucide-react';

interface RewardPoolData {
    currentRoundCreatorFees: number;
    currentRewardPool: number;
    startReward: number;
    rewardWalletBalance: number;
    totalRewardsPaid: number;
    roundStart: number;
    nextRoundStart: number;
}

const formatSOL = (amount: number): string => {
    return amount.toFixed(4);
};

export const RewardPoolDisplay: React.FC = () => {
    const [poolData, setPoolData] = useState<RewardPoolData>({
        currentRoundCreatorFees: 0,
        currentRewardPool: 0,
        startReward: 0.2, // Default start reward for first round
        rewardWalletBalance: 0,
        totalRewardsPaid: 0,
        roundStart: Date.now(),
        nextRoundStart: Date.now() + 15 * 60 * 1000,
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

    // Calculate the current potential reward for the Volume King
    // Formula: startReward + (15% of current claimable creator fees)
    const calculateCurrentReward = (): number => {
        const creatorFeeContribution = poolData.currentRoundCreatorFees * 0.15;
        return poolData.startReward + creatorFeeContribution;
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
    // const estimatedWinnerReward = calculateWinnerReward();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        className="mb-4"
                    >
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2 tabular-nums">
                            {formatSOL(currentReward)} SOL
                        </div>
                        <div className="text-sm text-retro-white opacity-80 font-body">
                            Winner receives 15% of reward wallet funds
                        </div>
                    </motion.div>

                    {/* Breakdown Info */}
                    <div className="pixel-box bg-retro-gray-dark p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-retro-white font-body text-sm">Start Reward:</span>
                            <span className="text-candle-green font-display text-base">
                                {formatSOL(poolData.startReward)} SOL
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-retro-white font-body text-sm">Creator Fees This Round:</span>
                            <span className="text-candle-green font-display text-base">
                                {formatSOL(poolData.currentRoundCreatorFees)} SOL
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-retro-white font-body text-sm">15% of Creator Fees:</span>
                            <span className="text-candle-green font-display text-base">
                                +{formatSOL(poolData.currentRoundCreatorFees * 0.15)} SOL
                            </span>
                        </div>
                        <div className="border-t border-candle-green-dark pt-2 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-retro-white font-body text-sm font-bold">Reward Wallet Balance:</span>
                                <span className="text-candle-green font-display text-base">
                                    {formatSOL(poolData.rewardWalletBalance)} SOL
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-candle-green'} animate-pulse`} />
                            <span className="text-retro-white opacity-60 font-body">
                                {error ? 'Offline' : 'Updates every 15s'}
                            </span>
                        </div>
                        <span className="text-retro-white opacity-60 font-body">
                            {lastUpdate.toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {/* Corner decoration */}
                <div className="absolute top-2 right-2 text-candle-green opacity-20 text-4xl font-display">
                    📊
                </div>
            </motion.div>
        </div>
    );
};