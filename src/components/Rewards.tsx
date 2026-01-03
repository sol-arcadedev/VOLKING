import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, Clock, CheckCircle, RefreshCw } from 'lucide-react';

interface RewardStats {
  totalRounds: number;
  totalRewards: number;
  uniqueWinners: number;
  avgReward: number;
}

export const Rewards: React.FC = () => {
  const [stats, setStats] = useState<RewardStats>({
    totalRounds: 0,
    totalRewards: 0,
    uniqueWinners: 0,
    avgReward: 0,
  });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/global-stats`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalRounds: data.totalRoundsCompleted || 0,
          totalRewards: data.totalRewardsPaid || 0,
          uniqueWinners: data.totalUniqueWinners || 0,
          avgReward: data.totalRoundsCompleted > 0
              ? (data.totalRewardsPaid / data.totalRoundsCompleted)
              : 0,
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const rewardItems = [
    {
      icon: Percent,
      title: 'Winner Reward (15%)',
      description: 'The volume leader receives 15% of the reward wallet balance when the round ends.',
    },
    {
      icon: Clock,
      title: 'Instant Distribution',
      description: 'Rewards are distributed automatically within seconds of round completion.',
    },
    {
      icon: CheckCircle,
      title: 'Transparent & On-Chain',
      description: 'All transactions are verifiable on Solscan. No hidden fees, no tricks.',
    },
  ];

  const formatSOL = (amount: number): string => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(4);
  };

  return (
      <section id="rewards" className="py-24 bg-retro-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase">
              REWARD SYSTEM
            </h2>
            <p className="text-xl text-retro-white font-body max-w-3xl mx-auto">
              Creator fees go directly to volume leaders. Trade more, earn more.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">

            {/* Reward Info */}
            <div className="pixel-box p-8 bg-retro-black">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-8 h-8 text-candle-green" />
                <h3 className="text-2xl font-display text-candle-green text-shadow-retro uppercase">
                  How Rewards Work
                </h3>
              </div>

              <div className="space-y-6">
                {rewardItems.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="pixel-box bg-retro-black p-3 flex-shrink-0">
                        <item.icon className="w-6 h-6 text-candle-green" />
                      </div>
                      <div>
                        <h4 className="text-retro-white font-display text-sm mb-1 uppercase">
                          {item.title}
                        </h4>
                        <p className="text-retro-white font-body text-base opacity-80">
                          {item.description}
                        </p>
                      </div>
                    </div>
                ))}
              </div>
            </div>

            {/* Fee Flow */}
            <div className="pixel-box p-8 bg-retro-black">
              <h3 className="text-2xl font-display text-candle-green text-shadow-retro uppercase mb-6">
                Fee Flow Each Round
              </h3>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="pixel-box bg-retro-gray-dark p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="pixel-box bg-candle-green text-black px-3 py-1 font-display text-sm">1</span>
                    <span className="text-candle-green font-display text-sm">CREATOR FEES COLLECTED</span>
                  </div>
                  <p className="text-retro-white font-body text-sm opacity-80">
                    All trading fees accumulate during the 15-minute round
                  </p>
                </div>

                {/* Step 2 */}
                <div className="pixel-box bg-retro-gray-dark p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="pixel-box bg-candle-green text-black px-3 py-1 font-display text-sm">2</span>
                    <span className="text-candle-green font-display text-sm">FEES AUTO-CLAIMED</span>
                  </div>
                  <p className="text-retro-white font-body text-sm opacity-80">
                    When timer hits zero, fees are automatically claimed
                  </p>
                </div>

                {/* Step 3 */}
                <div className="pixel-box bg-retro-gray-dark p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="pixel-box bg-candle-green text-black px-3 py-1 font-display text-sm">3</span>
                    <span className="text-candle-green font-display text-sm">DISTRIBUTION</span>
                  </div>
                  <div className="text-retro-white font-body text-sm opacity-80 space-y-1">
                    <p>• 70% → Treasury Wallet</p>
                    <p>• 20% → Reward Wallet</p>
                    <p>• 10% → Buyback & Burn</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="pixel-box bg-retro-gray-dark p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="pixel-box bg-candle-green text-black px-3 py-1 font-display text-sm">4</span>
                    <span className="text-candle-green font-display text-sm">WINNER REWARDED</span>
                  </div>
                  <p className="text-retro-white font-body text-sm opacity-80">
                    15% of reward wallet sent to volume king, 5% becomes next round's start reward
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="pixel-box p-8 bg-retro-black">
            <div className="flex items-center justify-center mb-6">
              <h3 className="text-2xl font-display text-candle-green text-shadow-retro uppercase">
                PROTOCOL STATS
              </h3>
              <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="ml-4 pixel-box bg-retro-black p-2 text-candle-green hover:bg-retro-gray-dark transition-colors disabled:opacity-50"
                  title="Refresh stats"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-display text-candle-green text-shadow-retro mb-2">
                  {stats.totalRounds.toLocaleString()}
                </div>
                <div className="text-retro-white font-body text-sm opacity-80">
                  Total Rounds
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-display text-candle-green text-shadow-retro mb-2">
                  {formatSOL(stats.totalRewards)}
                </div>
                <div className="text-retro-white font-body text-sm opacity-80">
                  Total Rewards (SOL)
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-display text-candle-green text-shadow-retro mb-2">
                  {stats.uniqueWinners.toLocaleString()}
                </div>
                <div className="text-retro-white font-body text-sm opacity-80">
                  Unique Winners
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-display text-candle-green text-shadow-retro mb-2">
                  {formatSOL(stats.avgReward)}
                </div>
                <div className="text-retro-white font-body text-sm opacity-80">
                  Avg. Reward (SOL)
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-8 pixel-box bg-retro-black p-4">
            <p className="text-candle-green font-display text-xs text-center">
              💡 Always 0.02 SOL reserved for transaction fees • All rewards verifiable on-chain
            </p>
          </div>
        </div>
      </section>
  );
};