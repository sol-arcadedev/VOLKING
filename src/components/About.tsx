import React from 'react';
import { motion } from 'framer-motion';
import { Target, Coins, Flame, Wallet } from 'lucide-react';

export const About: React.FC = () => {
  const features = [
    {
      icon: Target,
      title: 'Volume-Based',
      description: 'The more you trade, the higher your chances. Pure meritocracy—skill and activity win.',
    },
    {
      icon: Coins,
      title: 'Winner Takes 15%',
      description: 'Top trader receives 15% of the reward wallet funds. Your trading earns you real SOL rewards.',
    },
    {
      icon: Wallet,
      title: '70% Treasury',
      description: 'Majority of fees go to treasury for protocol growth, development, and sustainability.',
    },
    {
      icon: Flame,
      title: '10% Buyback & Burn',
      description: 'Every round, 10% of fees are used to buy back and burn $VOLK tokens forever.',
    },
  ];

  const cycle = [
    { step: '1', text: 'Trade $VOLK on Pump.fun' },
    { step: '2', text: 'Volume tracked in real-time' },
    { step: '3', text: 'Timer hits zero every 15min' },
    { step: '4', text: 'Top trader wins 15% reward' },
  ];

  const feeDistribution = [
    { label: 'Treasury', percentage: 70, color: 'bg-candle-green' },
    { label: 'Reward Pool', percentage: 20, color: 'bg-yellow-500' },
    { label: 'Buyback & Burn', percentage: 10, color: 'bg-candle-red' },
  ];

  return (
      <section id="about" className="py-24 bg-retro-black relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase">
              HOW IT WORKS
            </h2>
            <p className="text-xl text-retro-white font-body max-w-3xl mx-auto">
              Simple competitive mechanism. Trade to win. Win to earn.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
                <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="pixel-box p-6"
                >
                  <feature.icon className="w-10 h-10 text-candle-green mb-4" strokeWidth={2} />
                  <h3 className="text-lg font-display text-candle-green mb-3 uppercase text-shadow-retro">
                    {feature.title}
                  </h3>
                  <p className="text-retro-white font-body text-base leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
            ))}
          </div>

          {/* Fee Distribution */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pixel-box p-8 bg-retro-black mb-16"
          >
            <h3 className="text-2xl font-display text-candle-green text-center mb-6 uppercase text-shadow-retro">
              CREATOR FEE DISTRIBUTION
            </h3>

            {/* Visual Bar */}
            <div className="h-12 flex rounded overflow-hidden border-4 border-candle-green mb-6">
              {feeDistribution.map((item) => (
                  <div
                      key={item.label}
                      className={`${item.color} flex items-center justify-center`}
                      style={{ width: `${item.percentage}%` }}
                  >
                                <span className="font-display text-black text-sm">
                                    {item.percentage}%
                                </span>
                  </div>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="pixel-box bg-retro-gray-dark p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-candle-green" />
                  <span className="text-candle-green font-display text-sm">TREASURY (70%)</span>
                </div>
                <p className="text-retro-white font-body text-sm">
                  Protocol growth & development
                </p>
              </div>

              <div className="pixel-box bg-retro-gray-dark p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-yellow-500" />
                  <span className="text-yellow-500 font-display text-sm">REWARD POOL (20%)</span>
                </div>
                <p className="text-retro-white font-body text-sm">
                  15% to winner + 5% next round start
                </p>
              </div>

              <div className="pixel-box bg-retro-gray-dark p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-candle-red" />
                  <span className="text-candle-red font-display text-sm">BUYBACK & BURN (10%)</span>
                </div>
                <p className="text-retro-white font-body text-sm">
                  Deflationary mechanism
                </p>
              </div>
            </div>
          </motion.div>

          {/* The Volking Cycle */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pixel-box p-12 bg-retro-black"
          >
            <h3 className="text-3xl font-display text-candle-green text-center mb-8 uppercase text-shadow-retro">
              THE VOLKING CYCLE
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {cycle.map((item) => (
                  <div key={item.step} className="text-center relative">
                    <div className="pixel-box bg-retro-black p-6 mb-4">
                      <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                        {item.step}
                      </div>
                    </div>
                    <p className="text-retro-white font-body text-lg">{item.text}</p>
                  </div>
              ))}
            </div>

            {/* Reward Wallet Breakdown */}
            <div className="mt-12 pixel-box bg-candle-green bg-opacity-10 p-6">
              <h4 className="text-xl font-display text-candle-green text-center mb-4 uppercase">
                REWARD WALLET BREAKDOWN (20% of fees)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="pixel-box bg-retro-black p-4">
                  <div className="text-2xl font-display text-candle-green mb-2">15%</div>
                  <p className="text-retro-white font-body text-sm">
                    Sent to the Volume King (winner)
                  </p>
                </div>
                <div className="pixel-box bg-retro-black p-4">
                  <div className="text-2xl font-display text-candle-green mb-2">5%</div>
                  <p className="text-retro-white font-body text-sm">
                    Used as start reward for next round
                  </p>
                </div>
              </div>
              <p className="text-center text-retro-white font-body text-sm mt-4 opacity-80">
                First round starts with 0.2 SOL as incentive
              </p>
            </div>
          </motion.div>
        </div>
      </section>
  );
};