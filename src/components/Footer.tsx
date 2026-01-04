import React from 'react';
import { motion } from 'framer-motion';
import { Twitter, Github, ExternalLink } from 'lucide-react';
import { TOKEN_CONFIG, NAVIGATION_LINKS, SOCIAL_LINKS } from '../constants';

export const Footer: React.FC = () => {
  return (
      <footer className="bg-retro-black border-t-4 border-candle-green py-16 relative overflow-hidden">
        <div className="absolute inset-0 retro-grid opacity-10" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center space-x-4 mb-6"
              >
                <div className="pixel-box-pepe p-3">
                  <img
                      src="/volking-logo.png"
                      alt="VOLKING"
                      className="w-16 h-16"
                      style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="text-3xl font-display text-candle-green text-shadow-retro">
                  {TOKEN_CONFIG.name}
                </span>
              </motion.div>
              <p className="text-retro-white font-body text-lg mb-6 max-w-md leading-relaxed">
                {TOKEN_CONFIG.description}
              </p>
              <div className="flex space-x-4">
                <SocialLink href={SOCIAL_LINKS.twitter} icon={Twitter} label="Twitter" />
                <SocialLink href={SOCIAL_LINKS.github} icon={Github} label="GitHub" />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-candle-green font-display text-lg mb-6 uppercase text-shadow-retro">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {NAVIGATION_LINKS.map((link) => (
                    <FooterLink key={link.name} href={link.href}>
                      {link.name}
                    </FooterLink>
                ))}
                <FooterLink href={SOCIAL_LINKS.pumpfun} external>
                  Trade on Pump.fun
                </FooterLink>
              </ul>
            </div>
          </div>
        </div>
      </footer>
  );
};

interface SocialLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ href, icon: Icon, label }) => {
  return (
      <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="pixel-box bg-retro-gray-dark p-4 text-candle-green hover:bg-pepe-green hover:text-black transition-all inline-block group"
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.95 }}
      >
        <Icon className="w-6 h-6" />
      </motion.a>
  );
};

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children, external }) => {
  return (
      <li>
        <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-retro-white hover:text-candle-green font-body text-base transition-colors flex items-center space-x-2 group"
        >
          <span className="group-hover:translate-x-1 transition-transform">►</span>
          <span>{children}</span>
          {external && <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </a>
      </li>
  );
};