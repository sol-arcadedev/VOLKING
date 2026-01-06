// Application constants

import {Award, CheckCircle, Clock, Target, TrendingUp, Trophy, Zap} from "lucide-react";

export const TOKEN_CONFIG = {
  name: 'VOLKING',
  symbol: 'VOLK',
  description: 'The ultimate volume-based reward token on Pump.fun',
  roundDuration: 5, // minutes

  // Fee Distribution (per requirements)
  treasuryPercentage: 70,      // 70% to treasury wallet
  rewardWalletPercentage: 20,  // 20% to reward wallet
  buybackBurnPercentage: 10,   // 10% for buyback and burn

  // Reward Distribution from Reward Wallet
  winnerRewardPercentage: 15,  // 15% of reward wallet to winner
  startRewardPercentage: 5,    // 5% as start reward for next round

  // Initial Values
  initialStartReward: 0.2,     // 0.2 SOL start reward for first round
  minSolForFees: 0.02,         // Always leave 0.02 SOL for transaction fees
};

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/i/communities/2007378539306230204',
  github: 'https://github.com/sol-arcadedev/VOLKING',
  pumpfun: 'https://pump.fun/coin/ToBeAdded',
};

export const NAVIGATION_LINKS = [
  { name: 'About', href: '#about' },
  { name: 'Leaderboard', href: '#leaderboard' },
  { name: 'Hall of Degens', href: '#hall-of-degens' },
  { name: 'Rewards', href: '#rewards' },
];

export const REWARD_FEATURES = [
  {
    icon: Trophy,
    title: 'Winner Takes All',
    description: 'The volume leader receives 15% of the reward wallet balance when the round ends.',
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

export const FEATURES = [
  {
    title: '15-Min Rounds',
    description: 'New winner every quarter hour',
  },
  {
    title: 'Volume Rewards',
    description: 'Top trader wins 15% of reward pool',
  },
  {
    title: 'Real-Time Tracking',
    description: 'Live leaderboard updates',
  },
]

export const CYCLE = [
  {step: '1', text: 'Trade $VOLK', icon: TrendingUp},
  {step: '2', text: 'Volume tracked live', icon: Target}, // Shortened text for compact layout
  {step: '3', text: 'Timer hits zero', icon: Zap},
  {step: '4', text: 'Top trader wins 15%', icon: Award}, // Shortened text
];
