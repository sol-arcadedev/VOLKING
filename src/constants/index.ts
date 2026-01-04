// Application constants

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
  twitter: 'https://twitter.com/volking_token',
  telegram: 'https://t.me/volking',
  github: 'https://github.com/volking-token',
  pumpfun: 'https://pump.fun',
};

export const NAVIGATION_LINKS = [
  { name: 'About', href: '#about' },
  { name: 'Stats', href: '#global-stats' },
  { name: 'Leaderboard', href: '#leaderboard' },
  { name: 'Hall of Degens', href: '#hall-of-degens' },
  { name: 'Rewards', href: '#rewards' },
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
];

export const FEE_BREAKDOWN = [
  {
    label: 'Treasury',
    percentage: 70,
    description: 'Protocol treasury for development and growth',
  },
  {
    label: 'Reward Wallet',
    percentage: 20,
    description: '15% to winner + 5% as next round start reward',
  },
  {
    label: 'Buyback & Burn',
    percentage: 10,
    description: 'Buy back VOLK tokens and burn forever',
  },
];