import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, RefreshCw, Crown, ExternalLink, DollarSign } from 'lucide-react';

interface DegenStats {
    wallet: string;
    totalWins: number;
    totalRewards: number;
    totalVolume: number;
    lastWin: number;
    rank: number;
}

interface RewardTransfer {
    wallet: string;
    amount: number;
    signature: string;
    timestamp: number;
    roundNumber: number;
}

interface HallOfDegensResponse {
    degens: DegenStats[];
    recentTransfers: RewardTransfer[];
    totalWinners: number;
    lastUpdated: number;
}

const formatWallet = (wallet: string, chars: number = 4): string => {
    if (!wallet || wallet.length < chars * 2) return wallet || '---';
    return `${wallet.slice(0, chars)}...${wallet.slice(-chars)}`;
};

const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000) {
        return `${(volume / 1_000_000).toFixed(2)}M`;
    }
    if (volume >= 1_000) {
        return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
};

const formatReward = (reward: number): string => {
    return reward.toFixed(4);
};

const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export const HallOfDegens: React.FC = () => {
    const [degens, setDegens] = useState<DegenStats[]>([]);
    const [recentTransfers, setRecentTransfers] = useState<RewardTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [sortBy, setSortBy] = useState<'wins' | 'rewards' | 'volume'>('wins');

    const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

    const fetchHallOfDegens = async () => {
        try {
            setError(null);
            const response = await fetch(`${API_URL}/api/hall-of-degens`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: HallOfDegensResponse = await response.json();
            setDegens(data.degens);
            setRecentTransfers((data.recentTransfers || []).slice(0, 50));
            setLastUpdate(new Date());
            setLoading(false);
        } catch (err) {
            console.error('Error fetching Hall of Degens:', err);
            setError('Failed to fetch Hall of Degens data');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHallOfDegens();
        const interval = setInterval(fetchHallOfDegens, 30000);
        return () => clearInterval(interval);
    }, []);

    const sortedDegens = [...degens].sort((a, b) => {
        switch (sortBy) {
            case 'wins':
                return b.totalWins - a.totalWins;
            case 'rewards':
                return b.totalRewards - a.totalRewards;
            case 'volume':
                return b.totalVolume - a.totalVolume;
            default:
                return b.totalWins - a.totalWins;
        }
    });

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-7 h-7 text-yellow-400 animate-pulse" />;
        if (rank === 2) return <Trophy className="w-6 h-6 text-gray-400" />;
        if (rank === 3) return <Trophy className="w-6 h-6 text-amber-600" />;
        return null;
    };

    const getRankLabel = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    if (loading && degens.length === 0) {
        return (
            <section id="hall-of-degens" className="py-32 bg-retro-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="pixel-box p-16 bg-retro-gray-dark">
                        <div className="text-candle-green font-display text-3xl mb-6 animate-pulse">
                            LOADING HALL OF DEGENS...
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="hall-of-degens" className="py-32 bg-gradient-to-b from-retro-black via-retro-gray-dark to-retro-black relative overflow-hidden">
            <div className="absolute inset-0 retro-grid opacity-20" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Title & Status */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <div className="inline-block pixel-box-pepe px-6 py-3 mb-4">
                        <h2 className="text-3xl md:text-4xl font-display text-black uppercase flex items-center gap-3">
                            <Crown className="w-8 h-8" />
                            HALL OF DEGENS
                            <Crown className="w-8 h-8" />
                        </h2>
                    </div>
                    <p className="text-xl sm:text-2xl text-retro-white font-body mb-6">
                        Legendary traders who conquered the <span className="text-candle-green">volume wars</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                        <div className="pixel-box bg-retro-black px-6 py-3">
                            <span className="text-candle-green font-display text-sm">
                                {degens.length} Unique Winners
                            </span>
                        </div>
                        <div className="pixel-box bg-retro-black px-6 py-3">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 ${error ? 'bg-red-500' : 'bg-candle-green'} animate-pulse`} />
                                <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                                    {error ? '⚠️ Offline' : '🟢 Live'}
                                </span>
                            </div>
                        </div>
                        <motion.button
                            onClick={fetchHallOfDegens}
                            disabled={loading}
                            className="pixel-box bg-retro-black px-4 py-3 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </motion.button>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="pixel-box-red bg-retro-gray-dark px-6 py-3 inline-block"
                        >
                            <span className="text-red-500 font-body">{error}</span>
                        </motion.div>
                    )}

                    <div className="text-retro-white font-body text-sm opacity-60 mt-4">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                </motion.div>

                {/* Sort Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex justify-center gap-4 mb-12 flex-wrap"
                >
                    {[
                        { key: 'wins' as const, label: 'Sort by Wins' },
                        { key: 'rewards' as const, label: 'Sort by Rewards' },
                        { key: 'volume' as const, label: 'Sort by Volume' }
                    ].map((btn) => (
                        <motion.button
                            key={btn.key}
                            onClick={() => setSortBy(btn.key)}
                            className={`pixel-box px-8 py-4 font-display text-sm uppercase transition-all ${
                                sortBy === btn.key
                                    ? 'bg-candle-green text-black shadow-retro-lg'
                                    : 'bg-retro-black text-candle-green hover:bg-retro-gray-dark'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {btn.label}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Hall of Degens Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="pixel-box bg-retro-gray-dark mb-16"
                >
                    <div className="border-b-4 border-candle-green px-8 py-5 bg-retro-black">
                        <div className="grid grid-cols-12 gap-4 font-display text-sm text-candle-green uppercase">
                            <div className="col-span-1">RANK</div>
                            <div className="col-span-4">WALLET</div>
                            <div className="col-span-2 text-center">WINS</div>
                            <div className="col-span-3 text-right">TOTAL REWARDS</div>
                            <div className="col-span-2 text-right">VOLUME</div>
                        </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto">
                        {sortedDegens.length === 0 ? (
                            <div className="px-8 py-16 text-center">
                                <div className="text-5xl mb-4">👑</div>
                                <div className="text-retro-white font-body text-xl mb-3">
                                    No winners yet
                                </div>
                                <div className="text-candle-green font-display text-base">
                                    Be the first to enter the Hall of Degens!
                                </div>
                            </div>
                        ) : (
                            sortedDegens.map((degen, index) => {
                                const displayRank = index + 1;
                                const isTopThree = displayRank <= 3;

                                return (
                                    <motion.div
                                        key={degen.wallet}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`px-8 py-5 border-b-2 border-retro-gray transition-all hover:bg-retro-black ${
                                            isTopThree ? 'bg-candle-green bg-opacity-10' : ''
                                        }`}
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Rank */}
                                            <div className="col-span-1">
                                                <div className="flex items-center space-x-2">
                                                    {getRankIcon(displayRank)}
                                                    <span className={`font-display text-xl ${
                                                        isTopThree ? 'text-candle-green' : 'text-retro-white'
                                                    }`}>
                                                        {getRankLabel(displayRank)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Wallet */}
                                            <div className="col-span-4">
                                                <a
                                                    href={`https://solscan.io/account/${degen.wallet}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-body text-lg text-retro-white hover:text-candle-green transition-colors"
                                                >
                                                    {formatWallet(degen.wallet, 6)}
                                                </a>
                                                {displayRank === 1 && (
                                                    <div className="text-xs font-display text-candle-green mt-1 animate-pulse">
                                                        👑 ULTIMATE DEGEN
                                                    </div>
                                                )}
                                            </div>

                                            {/* Wins */}
                                            <div className="col-span-2 text-center">
                                                <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <Trophy className="w-4 h-4 text-candle-green" />
                                                        <span className="font-display text-candle-green text-lg">
                                                            {degen.totalWins}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rewards */}
                                            <div className="col-span-3 text-right">
                                                <div className="font-display text-candle-green text-xl">
                                                    {formatReward(degen.totalRewards)} SOL
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60 font-body">
                                                    Total earned
                                                </div>
                                            </div>

                                            {/* Volume */}
                                            <div className="col-span-2 text-right">
                                                <div className="font-display text-candle-green text-lg">
                                                    {formatVolume(degen.totalVolume)} SOL
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60 font-body">
                                                    Win volume
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </motion.div>

                {/* Recent Transactions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <div className="inline-block pixel-box-pepe px-6 py-3 mb-4">
                        <h2 className="text-3xl md:text-4xl font-display text-black uppercase flex items-center gap-3">
                            <Crown className="w-8 h-8" />
                            LAST 50 REWARD TRANSACTIONS
                            <Crown className="w-8 h-8" />
                        </h2>
                    </div>

                    <div className="pixel-box bg-retro-gray-dark">
                        <div className="border-b-4 border-candle-green px-8 py-5 bg-retro-black">
                            <div className="grid grid-cols-12 gap-4 font-display text-sm text-candle-green uppercase">
                                <div className="col-span-1">#</div>
                                <div className="col-span-4">WINNER</div>
                                <div className="col-span-2 text-right">AMOUNT</div>
                                <div className="col-span-3 text-right">TIME</div>
                                <div className="col-span-2 text-center">VERIFY</div>
                            </div>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto">
                            {recentTransfers.length === 0 ? (
                                <div className="px-8 py-16 text-center">
                                    <div className="text-5xl mb-4">💰</div>
                                    <div className="text-retro-white font-body text-xl mb-3">
                                        No reward transfers yet
                                    </div>
                                    <div className="text-candle-green font-display text-base">
                                        Win rounds to receive SOL rewards!
                                    </div>
                                </div>
                            ) : (
                                recentTransfers.map((transfer, index) => (
                                    <motion.div
                                        key={`${transfer.signature}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="px-8 py-5 border-b-2 border-retro-gray hover:bg-retro-black transition-all"
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-1">
                                                <div className="pixel-box bg-retro-black px-3 py-1 inline-block">
                                                    <span className="font-display text-candle-green text-sm">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="col-span-4">
                                                <a
                                                    href={`https://solscan.io/account/${transfer.wallet}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-body text-base text-retro-white hover:text-candle-green transition-colors"
                                                >
                                                    {formatWallet(transfer.wallet, 6)}
                                                </a>
                                            </div>

                                            <div className="col-span-2 text-right">
                                                <div className="font-display text-candle-green text-base">
                                                    {formatReward(transfer.amount)} SOL
                                                </div>
                                            </div>

                                            <div className="col-span-3 text-right">
                                                <div className="text-retro-white font-body text-sm">
                                                    {formatTimeAgo(transfer.timestamp)}
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60 font-body">
                                                    Round #{transfer.roundNumber || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <a
                                                    href={`https://solscan.io/tx/${transfer.signature}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pixel-box bg-candle-green px-4 py-2 inline-flex items-center justify-center text-black hover:bg-candle-green-dark transition-colors font-display text-xs"
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    VERIFY
                                                </a>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-6 text-center text-retro-white font-body text-sm opacity-60">
                        Showing {recentTransfers.length} of 50 reward transactions • All verifiable on-chain
                    </div>
                </motion.div>

                {/* Summary Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    <div className="pixel-box p-10 bg-retro-black card-hover">
                        <div className="flex items-center space-x-3 mb-4">
                            <Award className="w-8 h-8 text-candle-green" />
                            <span className="text-retro-white font-body text-lg">Total Winners</span>
                        </div>
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                            {degens.length}
                        </div>
                        <div className="text-sm text-retro-white opacity-60 font-body">
                            Unique wallets
                        </div>
                    </div>

                    <div className="pixel-box p-10 bg-retro-black card-hover">
                        <div className="flex items-center space-x-3 mb-4">
                            <Trophy className="w-8 h-8 text-candle-green" />
                            <span className="text-retro-white font-body text-lg">Total Wins</span>
                        </div>
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                            {degens.reduce((sum, d) => sum + d.totalWins, 0)}
                        </div>
                        <div className="text-sm text-retro-white opacity-60 font-body">
                            All rounds combined
                        </div>
                    </div>

                    <div className="pixel-box p-10 bg-retro-black card-hover">
                        <div className="flex items-center space-x-3 mb-4">
                            <DollarSign className="w-8 h-8 text-candle-green" />
                            <span className="text-retro-white font-body text-lg">Total Rewards</span>
                        </div>
                        <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                            {formatReward(degens.reduce((sum, d) => sum + d.totalRewards, 0))} SOL
                        </div>
                        <div className="text-sm text-retro-white opacity-60 font-body">
                            All-time payouts
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};