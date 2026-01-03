import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, RefreshCw, Search, ArrowUpDown } from 'lucide-react';

// Types
interface VolumeData {
    wallet: string;
    volume: number;
    trades: number;
    lastTrade: number;
}

interface VolumeTrackerResponse {
    leaderboard: VolumeData[];
    totalTraders: number;
    roundStart: number;
    nextRoundStart: number;
}

// Utility functions
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
    return volume.toFixed(4);
};

const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

type SortField = 'rank' | 'volume' | 'trades';
type SortDirection = 'asc' | 'desc';

export const VolumeTracker: React.FC = () => {
    const [entries, setEntries] = useState<VolumeData[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<VolumeData[]>([]);
    const [totalTraders, setTotalTraders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('rank');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

    // Fetch all traders data from backend
    const fetchVolumeData = useCallback(async () => {
        try {
            setError(null);
            console.log('Fetching all traders from backend API...');

            const response = await fetch(`${API_URL}/api/leaderboard`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: VolumeTrackerResponse = await response.json();

            // Sort by volume descending (for rank)
            const sortedData = data.leaderboard.sort((a, b) => b.volume - a.volume);

            setEntries(sortedData);
            setFilteredEntries(sortedData);
            setTotalTraders(data.totalTraders);
            setLastUpdate(new Date());
            setLoading(false);

            console.log(`Volume tracker updated: ${sortedData.length} traders`);
        } catch (err) {
            console.error('Error fetching volume data:', err);
            setError('Failed to fetch volume data');
            setLoading(false);
        }
    }, [API_URL]);

    // Initial fetch and set up polling
    useEffect(() => {
        fetchVolumeData();
        const interval = setInterval(fetchVolumeData, 10000);
        return () => clearInterval(interval);
    }, [fetchVolumeData]);

    // Filter and sort entries
    useEffect(() => {
        let filtered = [...entries];

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(entry =>
                entry.wallet.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'rank':
                    // Rank is based on volume (higher volume = lower rank number)
                    comparison = b.volume - a.volume;
                    break;
                case 'volume':
                    comparison = a.volume - b.volume;
                    break;
                case 'trades':
                    comparison = a.trades - b.trades;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        setFilteredEntries(filtered);
    }, [entries, searchQuery, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'rank' ? 'asc' : 'desc');
        }
    };

    const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);

    if (loading && entries.length === 0) {
        return (
            <section id="volume-tracker" className="py-24 bg-retro-black">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="pixel-box p-12 bg-retro-black">
                        <div className="text-candle-green font-display text-2xl mb-4 animate-pulse">
                            LOADING VOLUME TRACKER...
                        </div>
                        <p className="text-retro-white font-body">
                            Fetching all traders
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="volume-tracker" className="py-24 bg-retro-black">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Title & Status */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase">
                        VOLUME TRACKER
                    </h2>
                    <p className="text-xl text-retro-white font-body mb-4">
                        All traders contributing to this round
                    </p>

                    {/* Stats Bar */}
                    <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
                        <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
              <span className="text-candle-green font-display text-sm">
                {totalTraders} Active Traders
              </span>
                        </div>
                        <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
              <span className="text-candle-green font-display text-sm">
                {formatVolume(totalVolume)} SOL Total Volume
              </span>
                        </div>
                        <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
              <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                {error ? '⚠️ Offline' : '🟢 Live'}
              </span>
                        </div>
                        <button
                            onClick={fetchVolumeData}
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

                    <div className="text-retro-white font-body text-sm opacity-60">
                        Last updated: {lastUpdate.toLocaleTimeString()} • Updates every 10s
                    </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search Box */}
                    <div className="flex-1 w-full md:max-w-md">
                        <div className="pixel-box bg-retro-black p-3 flex items-center space-x-3">
                            <Search className="w-5 h-5 text-candle-green" />
                            <input
                                type="text"
                                placeholder="Search wallet address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-retro-white font-body outline-none placeholder-retro-white placeholder-opacity-40"
                            />
                        </div>
                    </div>

                    {/* Results Count */}
                    <div className="pixel-box bg-retro-black px-4 py-2">
            <span className="text-candle-green font-display text-sm">
              Showing {filteredEntries.length} of {totalTraders} traders
            </span>
                    </div>
                </div>

                {/* Volume Tracker Table */}
                <div className="pixel-box bg-retro-black mb-8">
                    {/* Header */}
                    <div className="border-b-3 border-candle-green px-6 py-4 bg-retro-gray-dark">
                        <div className="grid grid-cols-12 gap-4 font-display text-xs text-candle-green uppercase">
                            <button
                                onClick={() => handleSort('rank')}
                                className="col-span-2 flex items-center space-x-1 hover:text-candle-green-dark transition-colors"
                            >
                                <span>RANK</span>
                                <ArrowUpDown className="w-3 h-3" />
                            </button>
                            <div className="col-span-5">WALLET ADDRESS</div>
                            <button
                                onClick={() => handleSort('volume')}
                                className="col-span-3 text-right flex items-center justify-end space-x-1 hover:text-candle-green-dark transition-colors"
                            >
                                <span>VOLUME (SOL)</span>
                                <ArrowUpDown className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => handleSort('trades')}
                                className="col-span-2 text-center flex items-center justify-center space-x-1 hover:text-candle-green-dark transition-colors"
                            >
                                <span>TRADES</span>
                                <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="max-h-[600px] overflow-y-auto">
                        {filteredEntries.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <div className="text-retro-white font-body text-lg mb-2">
                                    {searchQuery ? 'No traders found matching your search' : 'No trades yet this round'}
                                </div>
                                <div className="text-candle-green font-display text-sm">
                                    {searchQuery ? 'Try a different wallet address' : 'Be the first to trade! 🔥'}
                                </div>
                            </div>
                        ) : (
                            filteredEntries.map((entry, index) => {
                                // Calculate actual rank based on original sorted order
                                const actualRank = entries.findIndex(e => e.wallet === entry.wallet) + 1;

                                return (
                                    <motion.div
                                        key={entry.wallet}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: Math.min(index * 0.02, 0.5) }}
                                        className={`px-6 py-4 border-b-2 border-retro-gray-dark hover:bg-retro-gray-dark transition-colors ${
                                            actualRank <= 3 ? 'bg-candle-green bg-opacity-5' : ''
                                        }`}
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Rank */}
                                            <div className="col-span-2">
                        <span className={`font-display text-lg ${
                            actualRank <= 3 ? 'text-candle-green' : 'text-retro-white'
                        }`}>
                          #{actualRank}
                        </span>
                                                {actualRank <= 3 && (
                                                    <span className="ml-2 text-xs">
                            {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                          </span>
                                                )}
                                            </div>

                                            {/* Wallet Address */}
                                            <div className="col-span-5">
                                                <a
                                                    href={`https://solscan.io/account/${entry.wallet}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-body text-base text-retro-white hover:text-candle-green transition-colors break-all"
                                                >
                                                    {formatWallet(entry.wallet, 8)}
                                                </a>
                                                <div className="text-xs text-retro-white opacity-60 mt-1">
                                                    Last trade: {formatTimeAgo(entry.lastTrade)}
                                                </div>
                                            </div>

                                            {/* Volume */}
                                            <div className="col-span-3 text-right">
                                                <div className="font-display text-candle-green text-lg">
                                                    {formatVolume(entry.volume)}
                                                </div>
                                                <div className="text-xs text-retro-white opacity-60">
                                                    {((entry.volume / totalVolume) * 100).toFixed(2)}% of total
                                                </div>
                                            </div>

                                            {/* Trades */}
                                            <div className="col-span-2 text-center">
                                                <div className="pixel-box bg-retro-black px-3 py-2 inline-block">
                          <span className="font-display text-candle-green text-base">
                            {entry.trades}
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="pixel-box p-6 bg-retro-black">
                        <div className="flex items-center space-x-3 mb-2">
                            <Users className="w-6 h-6 text-candle-green" />
                            <span className="text-retro-white font-body text-sm">Total Traders</span>
                        </div>
                        <div className="text-3xl font-display text-candle-green text-shadow-retro">
                            {totalTraders}
                        </div>
                        <div className="text-xs text-retro-white opacity-60 mt-1">
                            Active this round
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black">
                        <div className="flex items-center space-x-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-candle-green" />
                            <span className="text-retro-white font-body text-sm">Total Volume</span>
                        </div>
                        <div className="text-3xl font-display text-candle-green text-shadow-retro">
                            {formatVolume(totalVolume)}
                        </div>
                        <div className="text-xs text-retro-white opacity-60 mt-1">
                            SOL traded
                        </div>
                    </div>

                    <div className="pixel-box p-6 bg-retro-black">
                        <div className="flex items-center space-x-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-candle-green" />
                            <span className="text-retro-white font-body text-sm">Avg Volume/Trader</span>
                        </div>
                        <div className="text-3xl font-display text-candle-green text-shadow-retro">
                            {totalTraders > 0 ? formatVolume(totalVolume / totalTraders) : '0'}
                        </div>
                        <div className="text-xs text-retro-white opacity-60 mt-1">
                            SOL per wallet
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-8 pixel-box bg-retro-black p-4">
                    <p className="text-candle-green font-display text-xs text-center">
                        🔥 All traders tracked via Helius webhooks • Volume resets every 15 minutes • Only user wallets counted
                    </p>
                </div>
            </div>
        </section>
    );
};