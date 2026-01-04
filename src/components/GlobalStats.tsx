import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Flame, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';

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
        const interval = setInterval(fetchGlobalStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section id="global-stats" className="py-32 bg-gradient-to-b from-retro-black via-retro-gray-dark to-retro-black relative overflow-hidden">
            <div className="absolute inset-0 retro-grid opacity-20" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <div className="inline-block pixel-box-pepe px-8 py-4 mb-6">
                        <h2 className="text-5xl md:text-6xl font-display text-black uppercase flex items-center gap-4">
                            <BarChart3 className="w-12 h-12" />
                            VOLKING STATS
                        </h2>
                    </div>
                    <p className="text-2xl text-retro-white font-body">
                        Real-time protocol statistics
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <div className="pixel-box bg-retro-black px-6 py-3">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 ${error ? 'bg-red-500' : 'bg-candle-green'} animate-pulse`} />
                                <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                                    {error ? '⚠️ Offline' : '🟢 Live'}
                                </span>
                            </div>
                        </div>
                        <motion.button
                            onClick={fetchGlobalStats}
                            disabled={loading}
                            className="pixel-box bg-retro-black px-4 py-3 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </motion.button>
                    </div>
                </motion.div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Total Rewards Paid Out */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="pixel-box p-10 bg-retro-black relative overflow-hidden group card-hover"
                    >
                        <motion.div
                            className="absolute inset-0 bg-candle-green"
                            initial={{ opacity: 0.05 }}
                            animate={{ opacity: [0.05, 0.12, 0.05] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="pixel-box bg-candle-green p-4">
                                    <DollarSign className="w-10 h-10 text-black" strokeWidth={3} />
                                </div>
                                <h3 className="text-3xl font-display text-candle-green uppercase text-shadow-retro">
                                    TOTAL REWARDS PAID
                                </h3>
                            </div>

                            <motion.div
                                key={stats.totalRewardsPaid}
                                initial={{ scale: 1.05 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-6xl md:text-7xl font-display text-candle-green text-shadow-retro mb-3 tabular-nums">
                                    {formatSOL(stats.totalRewardsPaid)} SOL
                                </div>
                                <div className="text-retro-white font-body text-xl opacity-90">
                                    Distributed to Volume Kings
                                </div>
                            </motion.div>

                            <div className="mt-8 flex items-center space-x-3 text-base text-retro-white opacity-70">
                                <TrendingUp className="w-5 h-5" />
                                <span className="font-body">Growing every 15 minutes</span>
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 text-8xl opacity-10">
                            💰
                        </div>
                    </motion.div>

                    {/* Supply Burned */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="pixel-box p-10 bg-retro-black relative overflow-hidden group card-hover"
                    >
                        <motion.div
                            className="absolute inset-0 bg-candle-red"
                            initial={{ opacity: 0.05 }}
                            animate={{ opacity: [0.05, 0.12, 0.05] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="pixel-box bg-candle-red p-4">
                                    <Flame className="w-10 h-10 text-white" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-3xl font-display text-candle-red uppercase text-shadow-retro">
                                    SUPPLY BURNED
                                </h3>
                            </div>

                            <motion.div
                                key={stats.totalSupplyBurned}
                                initial={{ scale: 1.05 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-6xl md:text-7xl font-display text-candle-red text-shadow-retro mb-3 tabular-nums">
                                    {formatTokens(stats.totalSupplyBurned)}
                                </div>
                                <div className="text-retro-white font-body text-xl opacity-90">
                                    $VOLK tokens burned forever
                                </div>
                            </motion.div>

                            <div className="mt-8 flex items-center space-x-3 text-base text-retro-white opacity-70">
                                <Flame className="w-5 h-5" />
                                <span className="font-body">10% of fees = buyback & burn</span>
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 text-8xl opacity-10">
                            🔥
                        </div>
                    </motion.div>
                </div>

                {/* Secondary Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10"
                >
                    <div className="pixel-box p-8 bg-retro-black text-center group hover:bg-retro-gray-dark transition-all card-hover">
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-3">
                            {stats.totalRoundsCompleted}
                        </div>
                        <div className="text-retro-white font-body opacity-90">
                            Rounds Completed
                        </div>
                    </div>

                    <div className="pixel-box p-8 bg-retro-black text-center group hover:bg-retro-gray-dark transition-all card-hover">
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-3">
                            {stats.totalUniqueWinners}
                        </div>
                        <div className="text-retro-white font-body opacity-90">
                            Unique Winners
                        </div>
                    </div>

                    <div className="pixel-box p-8 bg-retro-black text-center group hover:bg-retro-gray-dark transition-all card-hover">
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-3">
                            15 MIN
                        </div>
                        <div className="text-retro-white font-body opacity-90">
                            Round Duration
                        </div>
                    </div>

                    <div className="pixel-box p-8 bg-retro-black text-center group hover:bg-retro-gray-dark transition-all card-hover">
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-3">
                            15%
                        </div>
                        <div className="text-retro-white font-body opacity-90">
                            Winner Reward
                        </div>
                    </div>
                </motion.div>

                {/* Info Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="pixel-box bg-pepe-green p-6"
                >
                    <p className="text-black font-display text-base text-center">
                        📊 70% Treasury • 20% Reward Pool • 10% Buyback & Burn
                    </p>
                </motion.div>

                <div className="mt-4 text-center text-retro-white font-body text-sm opacity-60">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>
        </section>
    );
};