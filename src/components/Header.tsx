import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { TOKEN_CONFIG, NAVIGATION_LINKS, SOCIAL_LINKS } from '../constants';

export const Header: React.FC = () => {
  return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-retro-black border-b-4 border-candle-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <motion.div
                  className="w-16 h-16"
                  animate={{ rotate: [0, -1, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <img
                    src="/volking-logo.png"
                    alt="VOLKING"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                />
              </motion.div>

              <div>
                <h1 className="text-2xl font-display text-candle-green text-shadow-retro">
                  {TOKEN_CONFIG.name}
                </h1>
                <p className="text-xs text-candle-green-dark font-display">
                  ${TOKEN_CONFIG.symbol}
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              {NAVIGATION_LINKS.map((link) => (
                  <a
                      key={link.name}
                      href={link.href}
                      className="text-candle-green hover:text-candle-green-dark font-display text-xs uppercase"
                  >
                    {link.name}
                  </a>
              ))}
              <a
                  href={SOCIAL_LINKS.pumpfun}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-retro-green text-xs flex items-center space-x-2"
              >
                <span>TRADE</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </nav>

            <a
                href={SOCIAL_LINKS.pumpfun}
                target="_blank"
                rel="noopener noreferrer"
                className="md:hidden btn-retro-green text-xs"
            >
              TRADE
            </a>
          </div>
        </div>
      </header>
  );
};