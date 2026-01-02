import React from 'react';
import { DollarSign, Percent, Clock, CheckCircle } from 'lucide-react';
import { generateMockStats } from '../utils/helpers';

export const Rewards: React.FC = () => {
  const stats = generateMockStats();

  const rewardItems = [
    {
      icon: Percent,
      title: 'Creator Fee Share',
      description: 'A percentage of creator fees accumulated during each 15-minute round',
    },
    {
      icon: Clock,
      title: 'Instant Distribution',
      description: 'Rewards are distributed automatically when the round ends',
    },
    {
      icon: CheckCircle,
      title: 'Transparent Tracking',
      description: 'All transactions are on-chain and verifiable in real-time',
    },
  ];

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

            {/* Reward Pool */}
            <div className="pixel-box p-8 bg-retro-black">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-8 h-8 text-candle-green" />
                <h3 className="text-2xl font-display text-candle-green text-shadow-retro uppercase">
                  Reward Pool
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

          </div>

          {/* Stats */}
          <div className="pixel-box p-8 bg-retro-black">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Total Rounds', value: stats.totalRounds.toLocaleString() },
                { label: 'Total Rewards Paid', value: `$${(stats.totalRewards / 1000).toFixed(1)}K` },
                { label: 'Unique Winners', value: stats.uniqueWinners.toLocaleString() },
                { label: 'Avg. Reward', value: `$${stats.avgReward}` },
              ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-4xl font-display text-candle-green text-shadow-retro mb-2">
                      {stat.value}
                    </div>
                    <div className="text-retro-white font-body text-sm opacity-80">
                      {stat.label}
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
};