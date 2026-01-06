// Application constants

export const TOKEN_CONFIG = {
  name: 'VOLKING',
  symbol: 'VOLK',
  description: 'The ultimate volume-based reward token on Pump.fun',
  roundDuration: 15, // minutes

  // Fee Distribution (per requirements)
  treasuryPercentage: 70,      // 70% to treasury wallet
  rewardWalletPercentage: 20,  // 20% to reward wallet
  buybackBurnPercentage: 10,   // 10% for buyback and burn

  // Reward Distribution from Reward Wallet
  winnerRewardPercentage: 15,  // 15% of reward wallet to winner
  startRewardPercentage: 5,    // 5% as start reward for next round

  // Initial Values
  initialStartReward: 0.05,     // 0.2 SOL start reward for first round
  minSolForFees: 0.02,         // Always leave 0.02 SOL for transaction fees
};

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/i/communities/2007378539306230204',
  github: 'https://github.com/sol-arcadedev/VOLKING',
  pumpfun: 'https://pump.fun/coin/2RKhBf8KBt7UmJjk5X38H6JMv8hQDLxsQEaRHur9pump',
};

export const NAVIGATION_LINKS = [
  { name: 'Leaderboard', href: '#leaderboard' },
  { name: 'Hall of Degens', href: '#hall-of-degens' },
];

export const VOLKING_CYCLE_STEPS = [
  {
    title: 'Round Starts',
    description:
        'A new round begins and the timer starts. All trader volume during this period is tracked separately.',
    color: 'text-candle-green',
    bgColor: 'bg-candle-green',
  },
  {
    title: 'Fees Accumulate',
    description:
        'On every trade, creator fees are collected. 20% of these fees are allocated to the VolKing reward pool.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400',
  },
  {
    title: 'Winner Paid Automatically',
    description:
        'When the timer ends, the trader with the highest volume receives 15% of the round’s fees plus the carried base reward. The reward is sent automatically and the signature is shared.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
  },
  {
    title: 'Next Round Seeded',
    description:
        'The remaining 5% of reward fees becomes the base reward for the next round, which starts immediately—new chance to win every cycle.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
  },
];

export const CYCLE = [
  {step: '1'},
  {step: '2'},
  {step: '3'},
  {step: '4'},
];
