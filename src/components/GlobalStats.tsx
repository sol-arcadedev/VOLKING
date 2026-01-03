import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Flame, RefreshCw, TrendingUp } from 'lucide-react';

interface GlobalStatsData {
    totalRewardsPaid: number;
    totalSupplyBurned: number;
    totalRoundsCompleted: number;
    totalUniqueWinners: number;
    lastUpdated: number;
}

const formatSOL = (amount: number): string => {
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(2)}K`;
    }
    return amount.toFixed(4);
};

const formatTokens = (amount: number): string => {
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(2)}K`;
    }
    return amount.toLocaleString();
};

export const GlobalStats: React.FC = () => {
    const [stats, setStats] = useState<GlobalStatsData>({
        totalRewardsPaid: 0,
        totalSupplyBurned: 0,
        totalRoundsCompleted: 0,
        totalUniqueWinners: 0,
        lastUpdated: Date.now(),
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

    const fetchGlobalStats = async () => {
        try {
            setError(null);
            const response = await fetch(`${API_URL}/api/global-stats`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: GlobalStatsData = await response.json();
            setStats(data);
            setLastUpdate(new Date());
            setLoading(false);
        } catch (err) {
            console.error('Error fetching global stats:', err);
            setError('Failed to fetch global stats');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGlobalStats();
        // Update every 30 seconds
        const interval = setInterval(fetchGlobalStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section id="global-stats" className="py-16 bg-retro-black">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Title */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase">
                        VOLKING STATS
                    </h2>
                    <p className="text-xl text-retro-white font-body">
                        Real-time protocol statistics
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
                            <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                                {error ? '⚠️ Offline' : '🟢 Live'}
                            </span>
                        </div>
                        <button
                            onClick={fetchGlobalStats}
                            disabled={loading}
                            className="pixel-box bg-retro-black p-2 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                            title="Refresh stats"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Total Rewards Paid Out */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="pixel-box p-8 bg-retro-black relative overflow-hidden"
                    >
                        <motion.div
                            className="absolute inset-0 bg-candle-green opacity-5"
                            animate={{ opacity: [0.05, 0.1, 0.05] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="pixel-box bg-candle-green p-3">
                                    <DollarSign className="w-8 h-8 text-black" />
                                </div>
                                <h3 className="text-2xl font-display text-candle-green uppercase text-shadow-retro">
                                    TOTAL REWARDS PAID
                                </h3>
                            </div>

                            <motion.div
                                key={stats.totalRewardsPaid}
                                initial={{ scale: 1.02 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="text-5xl md:text-6xl font-display text-candle-green text-shadow-retro mb-2 tabular-nums">
                                    {formatSOL(stats.totalRewardsPaid)} SOL
                                </div>
                                <div className="text-retro-white font-body text-lg opacity-80">
                                    Distributed to Volume Kings
                                </div>
                            </motion.div>

                            <div className="mt-6 flex items-center space-x-2 text-sm text-retro-white opacity-60">
                                <TrendingUp className="w-4 h-4" />
                                <span className="font-body">Growing every 15 minutes</span>
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 text-6xl opacity-10">
                            💰
                        </div>
                    </motion.div>

                    {/* Supply Burned */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="pixel-box p-8 bg-retro-black relative overflow-hidden"
                    >
                        <motion.div
                            className="absolute inset-0 bg-candle-red opacity-5"
                            animate={{ opacity: [0.05, 0.1, 0.05] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="pixel-box bg-candle-red p-3">
                                    <Flame className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-display text-candle-red uppercase text-shadow-retro">
                                    SUPPLY BURNED
                                </h3>
                            </div>

                            <motion.div
                                key={stats.totalSupplyBurned}
                                initial={{ scale: 1.02 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="text-5xl md:text-6xl font-display text-candle-red text-shadow-retro mb-2 tabular-nums">
                                    {formatTokens(stats.totalSupplyBurned)}
                                </div>
                                <div className="text-retro-white font-body text-lg opacity-80">
                                    $VOLK tokens burned forever
                                </div>
                            </motion.div>

                            <div className="mt-6 flex items-center space-x-2 text-sm text-retro-white opacity-60">
                                <Flame className="w-4 h-4" />
                                <span className="font-body">10% of fees = buyback & burn</span>
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 text-6xl opacity-10">
                            🔥
                        </div>
                    </motion.div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="pixel-box p-6 bg-retro-black text-center">
                        <div className="text-3xl font-display text-candle-green text-shadow-retro mb-2">
                            {stats.totalRoundsCompleted}
                        </div>
                        <div className="text-retro-white font-body text-sm opacity-80">
                            Rounds Completed
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black text-center">
                        <div className="text-3xl font-display text-candle-green text-shadow-retro mb-2">
                            {stats.totalUniqueWinners}
                        </div>
                        <div className="text-retro-white font-body text-sm opacity-80">
                            Unique Winners
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black text-center">
                        <div className="text-3xl font-display text-candle-green text-shadow-retro mb-2">
                            15 MIN
                        </div>
                        <div className="text-retro-white font-body text-sm opacity-80">
                            Round Duration
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black text-center">
                        <div className="text-3xl font-display text-candle-green text-shadow-retro mb-2">
                            15%
                        </div>
                        <div className="text-retro-white font-body text-sm opacity-80">
                            Winner Reward
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-8 pixel-box bg-retro-black p-4">
                    <p className="text-candle-green font-display text-xs text-center">
                        📊 70% Treasury • 20% Reward Pool • 10% Buyback & Burn
                    </p>
                </div>

                <div className="mt-2 text-center text-retro-white font-body text-sm opacity-60">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>
        </section>
    );
};