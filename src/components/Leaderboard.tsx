import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, RefreshCw } from 'lucide-react';
import { formatWallet, formatNumber } from '../utils/helpers';
import { fetchLeaderboard, getCurrentRoundStart, getNextRoundStart, type VolumeData } from '../services/apiService';

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<VolumeData[]>([]);
  const [totalTraders, setTotalTraders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [currentRoundStart, setCurrentRoundStart] = useState<number>(getCurrentRoundStart());

  // Fetch leaderboard data from Railway backend
  const fetchLeaderboardData = useCallback(async () => {
    try {
      setError(null);
      console.log('Fetching leaderboard from backend API...');

      const data = await fetchLeaderboard();

      setEntries(data.leaderboard);
      setTotalTraders(data.totalTraders);
      setCurrentRoundStart(data.roundStart);
      setLastUpdate(new Date());
      setLoading(false);

      console.log(`Leaderboard updated: ${data.leaderboard.length} traders`);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to fetch leaderboard data');
      setLoading(false);
    }
  }, []);

  // Initial fetch and set up polling
  useEffect(() => {
    fetchLeaderboardData();

    // Update every 10 seconds
    const interval = setInterval(fetchLeaderboardData, 10000);

    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  // Calculate round information
  const nextRoundStart = getNextRoundStart();
  const timeUntilNextRound = Math.max(0, nextRoundStart - Date.now());
  const roundProgress = ((15 * 60 * 1000 - timeUntilNextRound) / (15 * 60 * 1000)) * 100;

  const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);
  const currentLeader = entries[0]?.wallet || '---';

  if (loading && entries.length === 0) {
    return (
        <section id="leaderboard" className="py-24 bg-retro-black">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="pixel-box p-12 bg-retro-black">
              <div className="text-candle-green font-display text-2xl mb-4 animate-pulse">
                LOADING LEADERBOARD...
              </div>
              <p className="text-retro-white font-body">
                Connecting to backend API
              </p>
            </div>
          </div>
        </section>
    );
  }

  return (
      <section id="leaderboard" className="py-24 bg-retro-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title & Status */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase">
              LIVE LEADERBOARD
            </h2>
            <p className="text-xl text-retro-white font-body mb-4">
              Current round volume leaders • 15-minute intervals
            </p>

            {/* Round Info */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
              <span className="text-candle-green font-display text-sm">
                Round Started: {new Date(currentRoundStart).toLocaleTimeString()}
              </span>
              </div>
              <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
              <span className="text-candle-green font-display text-sm">
                Progress: {roundProgress.toFixed(0)}%
              </span>
              </div>
              <div className="pixel-box bg-retro-black px-4 py-2 inline-block">
              <span className={`font-display text-sm ${error ? 'text-red-500' : 'text-candle-green'}`}>
                {error ? '⚠️ Offline' : '🟢 Live'}
              </span>
              </div>
              <button
                  onClick={fetchLeaderboardData}
                  disabled={loading}
                  className="pixel-box bg-retro-black p-2 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                  title="Refresh leaderboard"
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
              Last updated: {lastUpdate.toLocaleTimeString()} • {totalTraders} total traders
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="pixel-box bg-retro-black mb-8">
            {/* Header */}
            <div className="border-b-3 border-candle-green px-6 py-4 bg-retro-gray-dark">
              <div className="grid grid-cols-12 gap-4 font-display text-xs text-candle-green uppercase">
                <div className="col-span-2">RANK</div>
                <div className="col-span-6">WALLET</div>
                <div className="col-span-2 text-right">VOLUME</div>
                <div className="col-span-2 text-right">TRADES</div>
              </div>
            </div>

            {/* Rows */}
            <div>
              {entries.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-retro-white font-body text-lg mb-2">
                      No trades yet this round
                    </div>
                    <div className="text-candle-green font-display text-sm">
                      Be the first to trade and claim the crown! 👑
                    </div>
                  </div>
              ) : (
                  entries.slice(0, 10).map((entry, index) => (
                      <motion.div
                          key={entry.wallet}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`px-6 py-4 border-b-2 border-retro-gray-dark ${
                              index === 0 ? 'bg-candle-green bg-opacity-10' : ''
                          }`}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Rank */}
                          <div className="col-span-2">
                            {index === 0 ? (
                                <div className="flex items-center space-x-2">
                                  <Trophy className="w-6 h-6 text-candle-green animate-pulse" />
                                  <span className="font-display text-candle-green text-lg">#{index + 1}</span>
                                </div>
                            ) : (
                                <span className="font-display text-retro-white text-lg">#{index + 1}</span>
                            )}
                          </div>

                          {/* Wallet */}
                          <div className="col-span-6">
                            <a
                                href={`https://solscan.io/account/${entry.wallet}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-body text-lg text-retro-white hover:text-candle-green transition-colors"
                            >
                              {formatWallet(entry.wallet)}
                            </a>
                            {index === 0 && (
                                <div className="text-xs font-display text-candle-green mt-1">
                                  👑 CURRENT KING
                                </div>
                            )}
                          </div>

                          {/* Volume */}
                          <div className="col-span-2 text-right">
                            <div className="font-display text-candle-green text-lg">
                              {formatNumber(entry.volume)}
                            </div>
                          </div>

                          {/* Trades */}
                          <div className="col-span-2 text-right">
                            <div className="pixel-box bg-retro-black px-3 py-1 inline-block">
                        <span className="font-display text-candle-green text-sm">
                          {entry.trades}
                        </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="pixel-box p-6 bg-retro-black">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp className="w-6 h-6 text-candle-green" />
                <span className="text-retro-white font-body text-sm">Total Volume</span>
              </div>
              <div className="text-3xl font-display text-candle-green text-shadow-retro">
                {formatNumber(totalVolume)}
              </div>
              <div className="text-xs text-retro-white opacity-60 mt-1">
                This round
              </div>
            </div>

            <div className="pixel-box p-6 bg-retro-black">
              <div className="flex items-center space-x-3 mb-2">
                <Trophy className="w-6 h-6 text-candle-green" />
                <span className="text-retro-white font-body text-sm">Current Leader</span>
              </div>
              <div className="text-2xl font-display text-candle-green text-shadow-retro">
                {formatWallet(currentLeader)}
              </div>
              <div className="text-xs text-retro-white opacity-60 mt-1">
                {entries[0] ? `${entries[0].trades} trades` : 'No trades yet'}
              </div>
            </div>

            <div className="pixel-box p-6 bg-retro-black">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="w-6 h-6 text-candle-green" />
                <span className="text-retro-white font-body text-sm">Active Traders</span>
              </div>
              <div className="text-3xl font-display text-candle-green text-shadow-retro">
                {totalTraders}
              </div>
              <div className="text-xs text-retro-white opacity-60 mt-1">
                Competing this round
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 pixel-box bg-retro-black p-4">
            <p className="text-candle-green font-display text-xs text-center">
              🔥 Volume tracked via Helius webhooks • Updates every 10 seconds • Top traders win rewards
            </p>
          </div>
        </div>
      </section>
  );
};

const Users: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);