import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Percent, Clock, CheckCircle, RefreshCw, Zap, ArrowRight } from 'lucide-react';

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
      color: 'text-candle-green',
      bgColor: 'bg-candle-green'
    },
    {
      icon: Clock,
      title: 'Instant Distribution',
      description: 'Rewards are distributed automatically within seconds of round completion.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400'
    },
    {
      icon: CheckCircle,
      title: 'Transparent & On-Chain',
      description: 'All transactions are verifiable on Solscan. No hidden fees, no tricks.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400'
    },
  ];

  const formatSOL = (amount: number): string => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  };

  return (
      <section id="rewards" className="py-32 bg-retro-black relative overflow-hidden">
        <div className="absolute inset-0 retro-grid opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
          >
            <div className="inline-block pixel-box-pepe px-6 py-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-display text-black uppercase">
                REWARD SYSTEM
              </h2>
            </div>
            <p className="text-lg text-retro-white font-body max-w-3xl mx-auto">
              15% of Creator fees go directly to <span className="text-candle-green">volume leaders</span>. Trade more, earn more.
            </p>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">

            {/* Reward Info */}
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="pixel-box p-10 bg-retro-gray-dark"
            >
              <div className="flex items-center space-x-4 mb-8">
                <div className="pixel-box bg-candle-green p-4">
                  <DollarSign className="w-10 h-10 text-black" strokeWidth={3} />
                </div>
                <h3 className="text-3xl font-display text-candle-green text-shadow-retro uppercase">
                  How Rewards Work
                </h3>
              </div>

              <div className="space-y-8">
                {rewardItems.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-5"
                    >
                      <div className={`pixel-box ${item.bgColor} p-4 flex-shrink-0`}>
                        <item.icon className="w-7 h-7 text-black" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className={`${item.color} font-display text-lg mb-2 uppercase`}>
                          {item.title}
                        </h4>
                        <p className="text-retro-white font-body text-base leading-relaxed opacity-90">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Fee Flow */}
            <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="pixel-box p-10 bg-retro-gray-dark"
            >
              <div className="flex items-center space-x-4 mb-8">
                <div className="pixel-box bg-blue-400 p-4">
                  <Zap className="w-10 h-10 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-display text-blue-400 text-shadow-retro uppercase">
                  Fee Flow Each Round
                </h3>
              </div>

              <div className="space-y-5">
                {[
                  { step: '1', text: 'CREATOR FEES COLLECTED', desc: 'All trading fees accumulate during the 15-minute round' },
                  { step: '2', text: 'FEES AUTO-CLAIMED', desc: 'When timer hits zero, fees are automatically claimed' },
                  { step: '3', text: 'DISTRIBUTION', desc: '70% Treasury • 20% Reward Pool • 10% Buyback & Burn' },
                  { step: '4', text: 'WINNER REWARDED', desc: '15% of reward wallet sent to volume king, 5% becomes next round start' },
                ].map((item, index) => (
                    <motion.div
                        key={item.step}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="pixel-box bg-retro-black p-6 relative group hover:bg-retro-gray transition-all"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="pixel-box bg-candle-green text-black px-4 py-2 font-display text-lg flex-shrink-0">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-candle-green font-display text-base uppercase">
                              {item.text}
                            </span>
                            <ArrowRight className="w-4 h-4 text-candle-green opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-retro-white font-body text-sm opacity-80 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Section Divider */}
          <div className="section-divider mb-20" />

          {/* Stats */}
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pixel-box p-10 bg-retro-gray-dark"
          >
            <div className="flex items-center justify-center mb-10">
              <h3 className="text-4xl font-display text-candle-green text-shadow-retro uppercase">
                PROTOCOL STATS
              </h3>
              <motion.button
                  onClick={fetchStats}
                  disabled={loading}
                  className="ml-6 pixel-box bg-retro-black px-4 py-3 text-candle-green hover:bg-retro-gray transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: stats.totalRounds.toLocaleString(), label: 'Total Rounds' },
                { value: formatSOL(stats.totalRewards), label: 'Total Rewards (SOL)' },
                { value: stats.uniqueWinners.toLocaleString(), label: 'Unique Winners' },
                { value: formatSOL(stats.avgReward), label: 'Avg. Reward (SOL)' },
              ].map((stat, index) => (
                  <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center pixel-box bg-retro-black p-8 card-hover"
                  >
                    <div className="text-5xl font-display text-candle-green text-shadow-retro mb-3 tabular-nums">
                      {stat.value}
                    </div>
                    <div className="text-retro-white font-body opacity-90">
                      {stat.label}
                    </div>
                  </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
  );
};