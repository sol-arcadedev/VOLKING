import React from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { TrendingUp, Award, Zap, Github } from 'lucide-react';
import { FEATURES, SOCIAL_LINKS } from '../constants';

export const Hero: React.FC = () => {
  const featureIcons = [TrendingUp, Award, Zap];

  return (
      <section className="relative min-h-screen flex items-center justify-center pt-20 bg-retro-black">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">

            {/* GitHub Transparency Link */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <a
                  href="https://github.com/sol-arcadedev/VOLKING"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-retro-white hover:text-candle-green transition-colors"
              >
                <Github className="w-6 h-6" />
              </a>
              <p className="text-sm font-body text-retro-white">
                Full transparency if you would like to see the code behind the implementation.
              </p>
            </div>

            {/* Contract Address */}
            <p className="text-lg font-body text-candle-green mb-8">
              CA: To be added
            </p>

            {/* Logo */}
            <motion.div
                className="mb-6"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                  src="/volking-logo.png"
                  alt="VOLKING"
                  className="w-32 h-32 mx-auto mb-4"
                  style={{ imageRendering: 'pixelated' }}
              />
            </motion.div>

            {/* Title */}
            <h2 className="text-4xl sm:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase leading-tight">
              RULE THE
              <br />
              VOLUME
            </h2>

            <p className="text-xl font-body text-retro-white mb-3">
              TRADE. COMPETE. WIN.
            </p>

            <p className="text-lg font-body text-candle-green-dark mb-6">
              &gt; EVERY 15 MINUTES = NEW KING
            </p>

            {/* What is VOLKING Explanation */}
            <div className="pixel-box p-6 mb-8 max-w-3xl mx-auto">
              <h3 className="text-xl font-display text-candle-green mb-4 uppercase">
                What is VOLKING?
              </h3>
              <p className="text-retro-white font-body text-base leading-relaxed mb-4">
                VOLKING is the ultimate volume-based reward token! Every 15 minutes, the trader who generates the <span className="text-candle-green font-bold">highest volume</span> becomes the VOLKING and claims the prize pool. It's simple: trade smart, and claim your throne. No luck, no random draws — just pure trading skill and volume dominance!
              </p>
            </div>

            {/* Community & Version Notice */}
            <div className="pixel-box p-5 mb-12 max-w-3xl mx-auto border-candle-green-dark">
              <p className="text-retro-white font-body text-sm leading-relaxed mb-3">
                <span className="text-candle-green font-bold">🚀 VERSION 1.0 — LAUNCH EDITION</span>
              </p>
              <p className="text-retro-white font-body text-sm leading-relaxed mb-3">
                This is the first version of VOLKING! We're starting with <span className="text-candle-green">1 winner every 15 minutes</span>.
              </p>
              <p className="text-retro-white font-body text-sm leading-relaxed">
                We'd love to hear from you! Got ideas for new volume-based competitions? Want 24-hour rounds with multiple winners? Different prize structures? <span className="text-candle-green">The community decides the future of VOLKING.</span> Drop your suggestions and let's build this together! 💬
              </p>
            </div>

            {/* Mini Candlestick Chart */}
            <div className="flex justify-center items-end space-x-2 mb-12 h-24">
              {[40, 60, 35, 70, 45, 55, 65, 50].map((height, i) => (
                  <div key={i} className="flex flex-col items-center justify-end">
                    <div className="candle-wick bg-white w-1 h-4 mb-1" />
                    <motion.div
                        className={`candle w-6 ${i % 2 === 0 ? 'candle-green' : 'candle-red'}`}
                        style={{ height: `${height}px` }}
                        animate={{ height: [`${height}px`, `${height + 5}px`, `${height}px`] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  </div>
              ))}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {FEATURES.map((feature, index) => {
                const Icon = featureIcons[index];
                return (
                    <div
                        key={feature.title}
                        className="pixel-box p-6"
                    >
                      <Icon className="w-10 h-10 text-candle-green mx-auto mb-4" strokeWidth={2} />
                      <h3 className="text-sm font-display text-candle-green mb-2 uppercase">
                        {feature.title}
                      </h3>
                      <p className="text-retro-white font-body text-base">
                        {feature.description}
                      </p>
                    </div>
                );
              })}
            </div>

            <Timer />

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <a
                  href={SOCIAL_LINKS.pumpfun}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-retro-green text-sm"
              >
                START TRADING
              </a>
              <a
                  href="#leaderboard"
                  className="btn-retro-red text-sm"
              >
                LEADERBOARD
              </a>
            </div>
          </div>
        </div>

        {/* Scroll Arrow */}
        <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="text-3xl text-candle-green">▼</div>
        </motion.div>
      </section>
  );
};