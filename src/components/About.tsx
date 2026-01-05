import React from 'react';
import { motion } from 'framer-motion';
import { Target, Coins, Flame, Wallet, TrendingUp, Award, Zap } from 'lucide-react';

export const About: React.FC = () => {
  const features = [
    {
      icon: Target,
      title: 'Volume-Based',
      description: 'The more you trade, the higher your chances. Pure meritocracy—skill and activity win.',
      color: 'text-candle-green',
      bgColor: 'bg-candle-green'
    },
    {
      icon: Coins,
      title: 'Winner Takes 15%',
      description: 'Top trader receives 15% of the reward wallet funds. Your trading earns you real SOL rewards.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400'
    },
    {
      icon: Wallet,
      title: '70% Treasury',
      description: 'Majority of fees go to treasury for protocol growth, development, and sustainability.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400'
    },
    {
      icon: Flame,
      title: '10% Buyback & Burn',
      description: 'Every round, 10% of fees are used to buy back and burn $VOLK tokens forever.',
      color: 'text-candle-red',
      bgColor: 'bg-candle-red'
    },
  ];

  const cycle = [
    { step: '1', text: 'Trade $VOLK on Pump.fun', icon: TrendingUp },
    { step: '2', text: 'Volume tracked in real-time', icon: Target },
    { step: '3', text: 'Timer hits zero every 15min', icon: Zap },
    { step: '4', text: 'Top trader wins 15% reward', icon: Award },
  ];

  const feeDistribution = [
    { label: 'Treasury', percentage: 70, color: 'bg-candle-green' },
    { label: 'Reward Pool', percentage: 20, color: 'bg-yellow-500' },
    { label: 'Buyback & Burn', percentage: 10, color: 'bg-candle-red' },
  ];

  return (
      <section id="about" className="py-32 bg-retro-black relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 retro-grid opacity-30" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section Title */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
          >
            <div className="inline-block pixel-box bg-pepe-green px-6 py-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-display text-black uppercase">
                HOW IT WORKS
              </h2>
            </div>
            <p className="text-lg text-retro-white font-body max-w-3xl mx-auto">
              Simple competitive mechanism. <span className="text-candle-green">Trade to win.</span> Win to earn.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {features.map((feature, index) => (
                <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="pixel-box p-6 bg-retro-gray-dark relative overflow-hidden group card-hover"
                >
                  {/* Hover effect background */}
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

                  {/* Corner decorations */}
                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-candle-green opacity-50" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-candle-green opacity-50" />
                </motion.div>
            ))}
          </div>

          {/* Section Divider */}
          <div className="section-divider mb-20" />

          {/* The Volking Cycle */}
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20"
          >
            <div className="text-center mb-12">
              <h3 className="text-4xl md:text-5xl font-display text-candle-green uppercase text-shadow-retro mb-4">
                THE VOLKING CYCLE
              </h3>
              <p className="text-xl text-retro-white font-body">
                Every 15 minutes, a new opportunity to become king
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {cycle.map((item, index) => (
                  <motion.div
                      key={item.step}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                  >
                    <div className="text-center">
                      <div className="pixel-box bg-candle-green p-8 mb-6 relative group hover:shadow-retro-lg transition-all">
                        <div className="text-6xl font-display text-black text-shadow-retro mb-4">
                          {item.step}
                        </div>
                        <item.icon className="w-12 h-12 text-black mx-auto" strokeWidth={2.5} />
                      </div>
                      <p className="text-retro-white font-body text-lg leading-relaxed px-2">
                        {item.text}
                      </p>
                    </div>

                    {/* Arrow connector (hidden on mobile and last item) */}
                    {index < cycle.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-candle-green text-4xl font-display">
                          ►
                        </div>
                    )}
                  </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Section Divider */}
          <div className="section-divider mb-20" />

          {/* Fee Distribution */}
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pixel-box p-10 bg-retro-gray-dark"
          >
            <h3 className="text-3xl md:text-4xl font-display text-candle-green text-center mb-8 uppercase text-shadow-retro">
              CREATOR FEE DISTRIBUTION
            </h3>

            {/* Visual Bar */}
            <div className="h-16 flex border-4 border-black mb-8 overflow-hidden">
              {feeDistribution.map((item) => (
                  <motion.div
                      key={item.label}
                      className={`${item.color} flex items-center justify-center relative group cursor-pointer`}
                      style={{ width: `${item.percentage}%` }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2 }}
                      whileHover={{ scale: 1.05, zIndex: 10 }}
                  >
                    <span className="font-display text-black text-lg font-bold">
                      {item.percentage}%
                    </span>
                  </motion.div>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="pixel-box bg-retro-black p-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-6 h-6 bg-candle-green border-2 border-black" />
                  <span className="text-candle-green font-display text-base">TREASURY (70%)</span>
                </div>
                <p className="text-retro-white font-body text-sm leading-relaxed">
                  Project growth, development, maintenance, marketing and for additional community rewards
                </p>
              </div>

              <div className="pixel-box bg-retro-black p-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-6 h-6 bg-yellow-500 border-2 border-black" />
                  <span className="text-yellow-500 font-display text-base">REWARD POOL (20%)</span>
                </div>
                <p className="text-retro-white font-body text-sm leading-relaxed">
                  15% to winner + 5% as base reward for the next round
                </p>
              </div>

              <div className="pixel-box bg-retro-black p-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-6 h-6 bg-candle-red border-2 border-black" />
                  <span className="text-candle-red font-display text-base">BUYBACK & BURN (10%)</span>
                </div>
                <p className="text-retro-white font-body text-sm leading-relaxed">
                  Deflationary mechanism - tokens burned forever
                </p>
              </div>
            </div>

            {/* Reward Wallet Breakdown */}
            <div className="mt-10 pixel-box bg-candle-green bg-opacity-15 p-6 border-candle-green">
              <h4 className="text-2xl font-display text-candle-green text-center mb-6 uppercase">
                🎯 REWARD WALLET BREAKDOWN (20% of fees)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="pixel-box bg-retro-black p-6">
                  <div className="text-4xl font-display text-candle-green mb-3 text-center">15%</div>
                  <p className="text-retro-white font-body text-base text-center">
                    Sent to the Volume King (winner)
                  </p>
                </div>
                <div className="pixel-box bg-retro-black p-6">
                  <div className="text-4xl font-display text-candle-green mb-3 text-center">5%</div>
                  <p className="text-retro-white font-body text-base text-center">
                    Used as start reward for next round
                  </p>
                </div>
              </div>
              <p className="text-center text-retro-white font-body text-sm mt-6 opacity-80">
                💡 First round starts with 0.2 SOL as incentive
              </p>
            </div>
          </motion.div>
        </div>
      </section>
  );
};