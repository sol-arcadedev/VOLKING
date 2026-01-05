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
  systemActive: boolean;
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

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<VolumeData[]>([]);
  const [totalTraders, setTotalTraders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [roundStart, setRoundStart] = useState<number | null>(null);
  const [nextRoundStart, setNextRoundStart] = useState<number | null>(null);
  const [systemActive, setSystemActive] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

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
      setSystemActive(data.systemActive || false);

      // Only set round times if system is active
      if (data.systemActive) {
        setRoundStart(data.roundStart);
        setNextRoundStart(data.nextRoundStart);
      } else {
        setRoundStart(null);
        setNextRoundStart(null);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to fetch leaderboard data');
      setLoading(false);
    }
  }, [API_URL]);

  // Update countdown every second
  useEffect(() => {
    if (!systemActive || !nextRoundStart) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const timeLeft = Math.max(0, nextRoundStart - now);
      setCountdown(timeLeft);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [systemActive, nextRoundStart]);

  useEffect(() => {
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);
  const currentLeader = entries[0]?.wallet || '---';

  if (loading && entries.length === 0) {
    return (
        <section id="leaderboard" className="py-12 bg-retro-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="pixel-box p-8 bg-retro-gray-dark">
              <div className="text-candle-green font-display text-xl mb-4 animate-pulse">
                LOADING LEADERBOARD...
              </div>
              <div className="flex justify-center space-x-2">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-3 h-3 bg-candle-green"
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
      <section id="leaderboard" className="py-12 bg-retro-black relative overflow-hidden">
        <div className="absolute inset-0 retro-grid opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title & Status */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-6"
          >
            <div className="inline-block pixel-box-pepe px-4 py-2 mb-3">
              <h2 className="text-2xl md:text-3xl font-display text-black uppercase flex items-center justify-center gap-2">
                <Crown className="w-6 h-6" />
                LIVE LEADERBOARD
                <Crown className="w-6 h-6" />
              </h2>
            </div>

            {/* Round Info Cards */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              {systemActive && roundStart ? (
                  <>
                    <div className="pixel-box bg-retro-gray-dark px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <TimerIcon className="w-4 h-4 text-candle-green" />
                        <span className="text-candle-green font-display text-xs">
                      Started: {new Date(roundStart).toLocaleTimeString()}
                    </span>
                      </div>
                    </div>
                    <div className="pixel-box bg-retro-gray-dark px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <TimerIcon className="w-4 h-4 text-candle-green animate-pulse" />
                        <span className="text-candle-green font-display text-lg">
                      {formatCountdown(countdown)}
                    </span>
                      </div>
                    </div>
                  </>
              ) : (
                  <div className="pixel-box bg-retro-gray-dark px-4 py-2">
                <span className="text-yellow-500 font-display text-xs">
                  ⚠️ SYSTEM INACTIVE - Waiting for admin to start
                </span>
                  </div>
              )}
              <div className="pixel-box bg-retro-gray-dark px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${error ? 'bg-red-500' : systemActive ? 'bg-candle-green' : 'bg-yellow-500'} animate-pulse`} />
                  <span className={`font-display text-xs ${error ? 'text-red-500' : systemActive ? 'text-candle-green' : 'text-yellow-500'}`}>
                  {error ? '⚠️ Offline' : systemActive ? '🟢 Live' : '⏸️ Inactive'}
                </span>
                </div>
              </div>
              <motion.button
                  onClick={fetchLeaderboardData}
                  disabled={loading}
                  className="pixel-box bg-retro-gray-dark px-3 py-2 text-candle-green hover:bg-retro-gray transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pixel-box-red bg-retro-gray-dark px-4 py-2 inline-block"
                >
                  <span className="text-red-500 font-body text-sm">{error}</span>
                </motion.div>
            )}

            <div className="text-retro-white font-body text-xs opacity-70 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()} • {totalTraders} total traders
            </div>
          </motion.div>

          {/* Main Content: Leaderboard + Reward Pool Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT SIDE: Leaderboard Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="pixel-box bg-retro-gray-dark"
            >
              {/* Quick Stats */}
              <div className="border-b-4 border-candle-green px-4 py-3 bg-retro-black">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-candle-green" />
                    <span className="text-candle-green font-display text-sm">{formatVolume(totalVolume)} SOL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-candle-green" />
                    <span className="text-candle-green font-display text-sm">{formatWallet(currentLeader, 4)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-candle-green" />
                    <span className="text-candle-green font-display text-sm">{totalTraders}</span>
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="border-b-2 border-candle-green px-3 py-2 bg-retro-black">
                <div className="grid grid-cols-12 gap-3 font-display text-xs text-candle-green uppercase">
                  <div className="col-span-2">RANK</div>
                  <div className="col-span-5">WALLET</div>
                  <div className="col-span-3 text-right">VOLUME</div>
                  <div className="col-span-2 text-right">TRADES</div>
                </div>
              </div>

              {/* Rows */}
              <div className="max-h-[500px] overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <div className="text-xl mb-2">👑</div>
                      <div className="text-retro-white font-body text-sm mb-1">
                        {systemActive ? 'No trades yet this round' : 'System is inactive'}
                      </div>
                      <div className="text-candle-green font-display text-xs">
                        {systemActive ? 'Be the first to trade!' : 'Waiting for admin'}
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
                              className={`px-3 py-2 border-b border-retro-gray transition-all hover:bg-retro-black ${
                                  isWinner ? 'bg-candle-green bg-opacity-15' : ''
                              }`}
                          >
                            <div className="grid grid-cols-12 gap-3 items-center">
                              {/* Rank */}
                              <div className="col-span-2">
                                <div className="flex items-center space-x-1">
                                  {isWinner && (
                                      <Crown className="w-4 h-4 text-candle-green animate-pulse" />
                                  )}
                                  {index === 1 && (
                                      <Trophy className="w-3 h-3 text-gray-400" />
                                  )}
                                  {index === 2 && (
                                      <Trophy className="w-3 h-3 text-amber-600" />
                                  )}
                                  <span className={`font-display text-sm ${
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
                                    className="font-body text-sm text-retro-white hover:text-candle-green transition-colors"
                                >
                                  {formatWallet(entry.wallet, 5)}
                                </a>
                              </div>

                              {/* Volume */}
                              <div className="col-span-3 text-right">
                                <div className="font-display text-candle-green text-sm">
                                  {formatVolume(entry.volume)}
                                </div>
                              </div>

                              {/* Trades */}
                              <div className="col-span-2 text-right">
                                <div className="pixel-box bg-retro-black px-2 py-0.5 inline-block">
                          <span className="font-display text-candle-green text-xs">
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

            {/* RIGHT SIDE: Reward Pool Display */}
            <div className="flex flex-col gap-6">
              <RewardPoolDisplay />
            </div>

          </div>
        </div>
      </section>
  );
};