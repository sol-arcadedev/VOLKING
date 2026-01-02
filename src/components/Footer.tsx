import React from 'react';
import { Twitter, Send, Github } from 'lucide-react';
import { TOKEN_CONFIG, NAVIGATION_LINKS, SOCIAL_LINKS } from '../constants';

export const Footer: React.FC = () => {
  return (
      <footer className="bg-retro-black border-t-4 border-candle-green py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img
                    src="/volking-logo.png"
                    alt="VOLKING"
                    className="w-12 h-12"
                    style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-2xl font-display text-candle-green text-shadow-retro">
                {TOKEN_CONFIG.name}
              </span>
              </div>
              <p className="text-retro-white font-body text-lg mb-4 max-w-md">
                {TOKEN_CONFIG.description}
              </p>
              <div className="flex space-x-4">
                <SocialLink href={SOCIAL_LINKS.twitter} icon={Twitter} label="Twitter" />
                <SocialLink href={SOCIAL_LINKS.telegram} icon={Send} label="Telegram" />
                <SocialLink href={SOCIAL_LINKS.github} icon={Github} label="GitHub" />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-candle-green font-display text-sm mb-4 uppercase text-shadow-retro">
                Quick Links
              </h4>
              <ul className="space-y-2">
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

            {/* Resources */}
            <div>
              <h4 className="text-candle-green font-display text-sm mb-4 uppercase text-shadow-retro">
                Resources
              </h4>
              <ul className="space-y-2">
                <FooterLink href="#">Whitepaper</FooterLink>
                <FooterLink href="#">Documentation</FooterLink>
                <FooterLink href="#">Contract</FooterLink>
                <FooterLink href="#">Audit</FooterLink>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t-2 border-retro-gray-dark pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-retro-white font-body text-sm">
                © {new Date().getFullYear()} {TOKEN_CONFIG.name}. All rights reserved.
              </p>
              <div className="flex space-x-6 text-sm">
                <a href="#" className="text-retro-white hover:text-candle-green font-body">
                  Terms of Service
                </a>
                <a href="#" className="text-retro-white hover:text-candle-green font-body">
                  Privacy Policy
                </a>
              </div>
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
      <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="pixel-box bg-retro-black p-3 text-candle-green hover:bg-retro-gray-dark transition-colors inline-block"
      >
        <Icon className="w-5 h-5" />
      </a>
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
            className="text-retro-white hover:text-candle-green font-body text-sm"
        >
          {children}
        </a>
      </li>
  );
};