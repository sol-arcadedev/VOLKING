import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, RefreshCw, Crown, ExternalLink, DollarSign } from 'lucide-react';
import { RewardPoolDisplay } from './RewardPoolDisplay';

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
            // Limit to last 50 reward transactions as per requirements
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
        if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
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
            <section id="hall-of-degens" className="py-24 bg-retro-black">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="pixel-box p-12 bg-retro-black">
                        <div className="text-candle-green font-display text-2xl mb-4 animate-pulse">
                            LOADING HALL OF DEGENS...
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="hall-of-degens" className="py-24 bg-retro-black">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Title & Status */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <Crown className="w-12 h-12 text-candle-green mr-4" />
                        <h2 className="text-4xl md:text-5xl font-display text-candle-green text-shadow-retro uppercase">
                            HALL OF DEGENS
                        </h2>
                        <Crown className="w-12 h-12 text-candle-green ml-4" />
                    </div>
                    <p className="text-xl text-retro-white font-body mb-4">
                        Legendary traders who conquered the volume wars
                    </p>

                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
                            <span className="text-candle-green font-display text-sm">
                                {degens.length} Unique Winners
                            </span>
                        </div>
                        <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
                            <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                                {error ? '⚠️ Offline' : '🟢 Live'}
                            </span>
                        </div>
                        <button
                            onClick={fetchHallOfDegens}
                            disabled={loading}
                            className="pixel-box bg-retro-black p-2 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 pixel-box-red bg-retro-black px-4 py-2 inline-block">
                            <span className="text-red-500 font-body text-sm">{error}</span>
                        </div>
                    )}

                    <div className="mt-2 text-retro-white font-body text-sm opacity-60">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                </div>

                {/* Sort Controls */}
                <div className="flex justify-center gap-4 mb-8 flex-wrap">
                    <button
                        onClick={() => setSortBy('wins')}
                        className={`pixel-box px-6 py-3 font-display text-sm uppercase transition-colors ${
                            sortBy === 'wins'
                                ? 'bg-candle-green text-black'
                                : 'bg-retro-black text-candle-green hover:bg-retro-gray-dark'
                        }`}
                    >
                        Sort by Wins
                    </button>
                    <button
                        onClick={() => setSortBy('rewards')}
                        className={`pixel-box px-6 py-3 font-display text-sm uppercase transition-colors ${
                            sortBy === 'rewards'
                                ? 'bg-candle-green text-black'
                                : 'bg-retro-black text-candle-green hover:bg-retro-gray-dark'
                        }`}
                    >
                        Sort by Rewards
                    </button>
                    <button
                        onClick={() => setSortBy('volume')}
                        className={`pixel-box px-6 py-3 font-display text-sm uppercase transition-colors ${
                            sortBy === 'volume'
                                ? 'bg-candle-green text-black'
                                : 'bg-retro-black text-candle-green hover:bg-retro-gray-dark'
                        }`}
                    >
                        Sort by Volume
                    </button>
                </div>

                {/* Reward Pool Display */}
                <div className="mb-12">
                    <RewardPoolDisplay />
                </div>

                {/* Hall of Degens Table */}
                <div className="pixel-box bg-retro-black mb-12">
                    <div className="border-b-3 border-candle-green px-6 py-4 bg-retro-gray-dark">
                        <div className="grid grid-cols-12 gap-4 font-display text-xs text-candle-green uppercase">
                            <div className="col-span-1">RANK</div>
                            <div className="col-span-4">WALLET</div>
                            <div className="col-span-2 text-center">WINS</div>
                            <div className="col-span-3 text-right">TOTAL REWARDS</div>
                            <div className="col-span-2 text-right">VOLUME (WON)</div>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {sortedDegens.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <div className="text-retro-white font-body text-lg mb-2">
                                    No winners yet
                                </div>
                                <div className="text-candle-green font-display text-sm">
                                    Be the first to enter the Hall of Degens! 👑
                                </div>
                            </div>
                        ) : (
                            sortedDegens.map((degen, index) => {
                                const displayRank = index + 1;
                                const isTopThree = displayRank <= 3;

                                return (
                                    <motion.div
                                        key={degen.wallet}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`px-6 py-4 border-b-2 border-retro-gray-dark ${
                                            isTopThree ? 'bg-candle-green bg-opacity-10' : ''
                                        }`}
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Rank */}
                                            <div className="col-span-1">
                                                <div className="flex items-center space-x-2">
                                                    {getRankIcon(displayRank)}
                                                    <span className={`font-display text-lg ${
                                                        isTopThree ? 'text-candle-green' : 'text-retro-white'
                                                    }`}>
                                                        {getRankLabel(displayRank)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Wallet Address */}
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
                                                    <div className="text-xs font-display text-candle-green mt-1">
                                                        👑 ULTIMATE DEGEN
                                                    </div>
                                                )}
                                            </div>

                                            {/* Total Won Rounds */}
                                            <div className="col-span-2 text-center">
                                                <div className="pixel-box bg-retro-black px-3 py-2 inline-block">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <Trophy className="w-4 h-4 text-candle-green" />
                                                        <span className="font-display text-candle-green text-lg">
                                                            {degen.totalWins}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Total Won Rewards */}
                                            <div className="col-span-3 text-right">
                                                <div className="font-display text-candle-green text-lg">
                                                    {formatReward(degen.totalRewards)} SOL
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60">
                                                    Total earned
                                                </div>
                                            </div>

                                            {/* Total Contributed Volume (when won) */}
                                            <div className="col-span-2 text-right">
                                                <div className="font-display text-candle-green text-lg">
                                                    {formatVolume(degen.totalVolume)} SOL
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60">
                                                    Win volume
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Last 50 Reward Transactions */}
                <div className="mb-12">
                    <div className="flex items-center justify-center mb-6">
                        <DollarSign className="w-8 h-8 text-candle-green mr-3" />
                        <h3 className="text-3xl font-display text-candle-green text-shadow-retro uppercase">
                            LAST 50 REWARD TRANSACTIONS
                        </h3>
                    </div>

                    <div className="pixel-box bg-retro-black">
                        <div className="border-b-3 border-candle-green px-6 py-4 bg-retro-gray-dark">
                            <div className="grid grid-cols-12 gap-4 font-display text-xs text-candle-green uppercase">
                                <div className="col-span-1">#</div>
                                <div className="col-span-4">WINNER WALLET</div>
                                <div className="col-span-2 text-right">AMOUNT</div>
                                <div className="col-span-3 text-right">TIME</div>
                                <div className="col-span-2 text-center">VERIFY TX</div>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {recentTransfers.length === 0 ? (
                                <div className="px-6 py-12 text-center">
                                    <div className="text-retro-white font-body text-lg mb-2">
                                        No reward transfers yet
                                    </div>
                                    <div className="text-candle-green font-display text-sm">
                                        Win rounds to receive SOL rewards! 💰
                                    </div>
                                </div>
                            ) : (
                                recentTransfers.map((transfer, index) => (
                                    <motion.div
                                        key={`${transfer.signature}-${index}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.01 }}
                                        className="px-6 py-4 border-b-2 border-retro-gray-dark hover:bg-retro-gray-dark transition-colors"
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Index */}
                                            <div className="col-span-1">
                                                <div className="pixel-box bg-retro-black px-2 py-1 inline-block">
                                                    <span className="font-display text-candle-green text-xs">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Wallet Address */}
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

                                            {/* Amount of SOL */}
                                            <div className="col-span-2 text-right">
                                                <div className="font-display text-candle-green text-base">
                                                    {formatReward(transfer.amount)} SOL
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="col-span-3 text-right">
                                                <div className="text-retro-white font-body text-sm">
                                                    {formatTimeAgo(transfer.timestamp)}
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60">
                                                    Round #{transfer.roundNumber || 'N/A'}
                                                </div>
                                            </div>

                                            {/* Verify TX Link to Solscan */}
                                            <div className="col-span-2 text-center">
                                                <a
                                                    href={`https://solscan.io/tx/${transfer.signature}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pixel-box bg-candle-green px-4 py-2 inline-flex items-center justify-center text-black hover:bg-candle-green-dark transition-colors font-display text-xs"
                                                    title="View transaction on Solscan"
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

                    <div className="mt-4 text-center text-retro-white font-body text-sm opacity-60">
                        Showing last {recentTransfers.length} of 50 reward transactions • All transactions verifiable on-chain
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="pixel-box p-6 bg-retro-black">
                        <div className="flex items-center space-x-3 mb-2">
                            <Award className="w-6 h-6 text-candle-green" />
                            <span className="text-retro-white font-body text-sm">Total Winners</span>
                        </div>
                        <div className="text-3xl font-display text-candle-green text-shadow-retro">
                            {degens.length}
                        </div>
                        <div className="text-xs text-retro-white opacity-60 mt-1">
                            Unique wallets
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black">
                        <div className="flex items-center space-x-3 mb-2">
                            <Trophy className="w-6 h-6 text-candle-green" />
                            <span className="text-retro-white font-body text-sm">Total Wins</span>
                        </div>
                        <div className="text-3xl font-display text-candle-green text-shadow-retro">
                            {degens.reduce((sum, d) => sum + d.totalWins, 0)}
                        </div>
                        <div className="text-xs text-retro-white opacity-60 mt-1">
                            All rounds combined
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black">
                        <div className="flex items-center space-x-3 mb-2">
                            <DollarSign className="w-6 h-6 text-candle-green" />
                            <span className="text-retro-white font-body text-sm">Total Rewards</span>
                        </div>
                        <div className="text-3xl font-display text-candle-green text-shadow-retro">
                            {formatReward(degens.reduce((sum, d) => sum + d.totalRewards, 0))} SOL
                        </div>
                        <div className="text-xs text-retro-white opacity-60 mt-1">
                            All-time payouts
                        </div>
                    </div>
                </div>

                <div className="mt-8 pixel-box bg-retro-black p-4">
                    <p className="text-candle-green font-display text-xs text-center">
                        🔥 Only winners are immortalized • Updated after every round • Forever on-chain
                    </p>
                </div>
            </div>
        </section>
    );
};