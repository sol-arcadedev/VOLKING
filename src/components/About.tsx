import React from 'react';
import { motion } from 'framer-motion';
import { Target, Coins } from 'lucide-react';

export const About: React.FC = () => {
  const features = [
    {
      icon: Target,
      title: 'Volume-Based',
      description: 'The more you trade, the higher your chances. Pure meritocracy—skill and activity win.',
    },
    {
      icon: Coins,
      title: 'Creator Fees',
      description: 'Top traders receive a portion of creator fees. Your trading earns you real rewards.',
    }
  ];

  const cycle = [
    { step: '1', text: 'Trade $VOLK on Pump.fun' },
    { step: '2', text: 'Volume tracked in real-time' },
    { step: '3', text: 'Timer hits zero every 15min' },
    { step: '4', text: 'Top trader wins rewards' },
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {features.map((feature, index) => (
                <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="pixel-box p-8"
                >
                  <feature.icon className="w-12 h-12 text-candle-green mb-4" strokeWidth={2} />
                  <h3 className="text-xl font-display text-candle-green mb-3 uppercase text-shadow-retro">
                    {feature.title}
                  </h3>
                  <p className="text-retro-white font-body text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
            ))}
          </div>

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
                  <div key={item.step} className="text-center">
                    <div className="pixel-box bg-retro-black p-6 mb-4">
                      <div className="text-5xl font-display text-candle-green text-shadow-retro mb-2">
                        {item.step}
                      </div>
                    </div>
                    <p className="text-retro-white font-body text-lg">{item.text}</p>
                  </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
  );
};