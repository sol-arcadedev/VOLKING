import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Clock, CheckCircle, RefreshCw } from 'lucide-react';

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

  const rewardFeatures = [
    {
      icon: Trophy,
      title: 'Winner Takes All',
      description: 'The volume leader receives 15% of the reward wallet balance when the round ends. Pure skill-based rewards.',
      color: 'text-candle-green',
      bgColor: 'bg-candle-green'
    },
    {
      icon: Clock,
      title: 'Instant Distribution',
      description: 'Rewards are distributed automatically within seconds of round completion. No waiting, no manual claims.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400'
    },
    {
      icon: CheckCircle,
      title: 'Transparent & On-Chain',
      description: 'All transactions are verifiable on Solscan. Everything is on-chain.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400'
    },
    {
      icon: Zap,
      title: 'Continuous Rounds',
      description: 'New round starts after the last one ends. Always an opportunity to win and earn rewards.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500'
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
                REWARDS
              </h2>
            </div>
            <p className="text-lg text-retro-white font-body max-w-3xl mx-auto">
              Compete for <span className="text-candle-green">SOL rewards</span> every 15 minutes. Trade your way up and become the VOLKING.
            </p>
          </motion.div>

          {/* Reward Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {rewardFeatures.map((feature, index) => (
                <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="pixel-box p-6 bg-retro-gray-dark relative overflow-hidden group card-hover"
                >
                  <div className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  <div className="relative">
                    <div className={`pixel-box ${feature.bgColor} p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center`}>
                      <feature.icon className="w-10 h-10 text-black" strokeWidth={2.5} />
                    </div>
                    <h3 className={`text-xl font-display ${feature.color} mb-4 uppercase text-shadow-retro text-center`}>
                      {feature.title}
                    </h3>
                    <p className="text-retro-white font-body text-base leading-relaxed text-center">
                      {feature.description}
                    </p>
                  </div>

                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-candle-green opacity-50" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-candle-green opacity-50" />
                </motion.div>
            ))}
          </div>

          {/* Section Divider */}
          <div className="section-divider mb-20" />

          {/* Protocol Stats */}
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
                { value: stats.totalRounds.toLocaleString(), label: 'Total Rounds', color: 'text-candle-green' },
                { value: formatSOL(stats.totalRewards), label: 'Total Rewards (SOL)', color: 'text-yellow-400' },
                { value: stats.uniqueWinners.toLocaleString(), label: 'Unique Winners', color: 'text-blue-400' },
                { value: formatSOL(stats.avgReward), label: 'Avg. Reward (SOL)', color: 'text-orange-500' },
              ].map((stat, index) => (
                  <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center pixel-box bg-retro-black p-8 card-hover"
                  >
                    <div className={`text-5xl font-display ${stat.color} text-shadow-retro mb-3 tabular-nums`}>
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