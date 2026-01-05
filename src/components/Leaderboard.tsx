import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, RefreshCw, Users, Crown, Timer as TimerIcon } from 'lucide-react';
import { RewardPoolDisplay } from './RewardPoolDisplay';


// Types
interface VolumeData {
  wallet: string;
  volume: number;
  trades: number;
}

interface LeaderboardResponse {
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

const getCurrentRoundStart = (): number => {
  const now = Date.now();
  const roundDuration = 15 * 60 * 1000;
  return now - (now % roundDuration);
};

const getNextRoundStart = (): number => {
  return getCurrentRoundStart() + 15 * 60 * 1000;
};

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<VolumeData[]>([]);
  const [totalTraders, setTotalTraders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [currentRoundStart, setCurrentRoundStart] = useState<number>(getCurrentRoundStart());

  const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

  const fetchLeaderboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/leaderboard`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: LeaderboardResponse = await response.json();

      setEntries(data.leaderboard);
      setTotalTraders(data.totalTraders);
      setCurrentRoundStart(data.roundStart);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to fetch leaderboard data');
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  const nextRoundStart = getNextRoundStart();
  const timeUntilNextRound = Math.max(0, nextRoundStart - Date.now());
  const roundProgress = ((15 * 60 * 1000 - timeUntilNextRound) / (15 * 60 * 1000)) * 100;
  const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);
  const currentLeader = entries[0]?.wallet || '---';

  if (loading && entries.length === 0) {
    return (
        <section id="leaderboard" className="py-32 bg-retro-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="pixel-box p-16 bg-retro-gray-dark">
              <div className="text-candle-green font-display text-3xl mb-6 animate-pulse">
                LOADING LEADERBOARD...
              </div>
              <div className="flex justify-center space-x-2">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-4 h-4 bg-candle-green"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                ))}
              </div>
            </div>
          </div>
        </section>
    );
  }

  return (
      <section id="leaderboard" className="py-32 bg-retro-black relative overflow-hidden">
        <div className="absolute inset-0 retro-grid opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title & Status */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
          >
            <div className="inline-block pixel-box-pepe px-8 py-4 mb-6">
              <h2 className="text-5xl md:text-6xl font-display text-black uppercase flex items-center justify-center gap-4">
                <Crown className="w-12 h-12" />
                LIVE LEADERBOARD
                <Crown className="w-12 h-12" />
              </h2>
            </div>
            <p className="text-2xl text-retro-white font-body mb-8">
              Current round volume leaders • <span className="text-candle-green">15-minute intervals</span>
            </p>

            {/* Round Info Cards */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <div className="pixel-box bg-retro-gray-dark px-6 py-3">
                <div className="flex items-center space-x-2">
                  <TimerIcon className="w-5 h-5 text-candle-green" />
                  <span className="text-candle-green font-display text-sm">
                    Started: {new Date(currentRoundStart).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="pixel-box bg-retro-gray-dark px-6 py-3">
                <span className="text-candle-green font-display text-sm">
                  Progress: {roundProgress.toFixed(0)}%
                </span>
              </div>
              <div className="pixel-box bg-retro-gray-dark px-6 py-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${error ? 'bg-red-500' : 'bg-candle-green'} animate-pulse`} />
                  <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                    {error ? '⚠️ Offline' : '🟢 Live'}
                  </span>
                </div>
              </div>
              <motion.button
                  onClick={fetchLeaderboardData}
                  disabled={loading}
                  className="pixel-box bg-retro-gray-dark px-4 py-3 text-candle-green hover:bg-retro-gray transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pixel-box-red bg-retro-gray-dark px-6 py-3 inline-block"
                >
                  <span className="text-red-500 font-body">{error}</span>
                </motion.div>
            )}

            <div className="text-retro-white font-body text-sm opacity-70 mt-4">
              Last updated: {lastUpdate.toLocaleTimeString()} • {totalTraders} total traders
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="pixel-box p-8 bg-retro-gray-dark relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-candle-green opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-8 h-8 text-candle-green" />
                  <span className="text-retro-white font-body text-lg">Total Volume</span>
                </div>
                <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                  {formatVolume(totalVolume)} SOL
                </div>
                <div className="text-xs text-retro-white opacity-60 font-body">
                  This round
                </div>
              </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="pixel-box p-8 bg-retro-gray-dark relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-yellow-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative">
                <div className="flex items-center space-x-3 mb-4">
                  <Crown className="w-8 h-8 text-candle-green animate-pulse" />
                  <span className="text-retro-white font-body text-lg">Current Leader</span>
                </div>
                <div className="text-4xl font-display text-candle-green text-shadow-retro mb-2">
                  {formatWallet(currentLeader, 5)}
                </div>
                <div className="text-xs text-retro-white opacity-60 font-body">
                  {entries[0] ? `${entries[0].trades} trades` : 'No trades yet'}
                </div>
              </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="pixel-box p-8 bg-retro-gray-dark relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-8 h-8 text-candle-green" />
                  <span className="text-retro-white font-body text-lg">Active Traders</span>
                </div>
                <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                  {totalTraders}
                </div>
                <div className="text-xs text-retro-white opacity-60 font-body">
                  Competing this round
                </div>
              </div>
            </motion.div>
          </div>

          {/* Leaderboard Table */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pixel-box bg-retro-gray-dark"
          >
            {/* Header */}
            <div className="border-b-4 border-candle-green px-8 py-5 bg-retro-black">
              <div className="grid grid-cols-12 gap-4 font-display text-sm text-candle-green uppercase">
                <div className="col-span-2">RANK</div>
                <div className="col-span-5">WALLET</div>
                <div className="col-span-3 text-right">VOLUME</div>
                <div className="col-span-2 text-right">TRADES</div>
              </div>
            </div>

            {/* Rows */}
            <div className="max-h-[600px] overflow-y-auto">
              {entries.length === 0 ? (
                  <div className="px-8 py-16 text-center">
                    <div className="text-3xl mb-4">👑</div>
                    <div className="text-retro-white font-body text-xl mb-3">
                      No trades yet this round
                    </div>
                    <div className="text-candle-green font-display text-base">
                      Be the first to trade and claim the crown!
                    </div>
                  </div>
              ) : (
                  entries.slice(0, 10).map((entry, index) => {
                    const isWinner = index === 0;
                    const isTopThree = index < 3;

                    return (
                        <motion.div
                            key={entry.wallet}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`px-8 py-5 border-b-2 border-retro-gray transition-all hover:bg-retro-black ${
                                isWinner ? 'bg-candle-green bg-opacity-15' : ''
                            }`}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Rank */}
                            <div className="col-span-2">
                              <div className="flex items-center space-x-3">
                                {isWinner && (
                                    <Crown className="w-7 h-7 text-candle-green animate-pulse" />
                                )}
                                {index === 1 && (
                                    <Trophy className="w-6 h-6 text-gray-400" />
                                )}
                                {index === 2 && (
                                    <Trophy className="w-6 h-6 text-amber-600" />
                                )}
                                <span className={`font-display text-xl ${
                                    isTopThree ? 'text-candle-green' : 'text-retro-white'
                                }`}>
                                  #{index + 1}
                                </span>
                              </div>
                            </div>

                            {/* Wallet */}
                            <div className="col-span-5">
                              <a
                                  href={`https://solscan.io/account/${entry.wallet}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-body text-lg text-retro-white hover:text-candle-green transition-colors"
                              >
                                {formatWallet(entry.wallet, 6)}
                              </a>
                              {isWinner && (
                                  <div className="text-xs font-display text-candle-green mt-1 animate-pulse">
                                    👑 CURRENT VOLUME KING
                                  </div>
                              )}
                            </div>

                            {/* Volume */}
                            <div className="col-span-3 text-right">
                              <div className="font-display text-candle-green text-xl">
                                {formatVolume(entry.volume)} SOL
                              </div>
                            </div>

                            {/* Trades */}
                            <div className="col-span-2 text-right">
                              <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
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
          </motion.div>


          {/* Reward Pool Display */}
          <div className="mb-16">
            <RewardPoolDisplay />
          </div>
        </div>
      </section>
  );
};