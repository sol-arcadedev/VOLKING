import type { LeaderboardEntry } from '../types';

/**
 * Format wallet address to shortened version
 */
export const formatWallet = (wallet: string): string => {
  if (wallet.length <= 8) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

/**
 * Format number with K/M suffix
 */
export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

/**
 * Format amount as currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Calculate time until next 15-minute round
 */
export const getTimeUntilNextRound = (): {
  minutes: number;
  seconds: number;
  progress: number;
} => {
  const now = new Date();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();

  const nextMark = Math.ceil((currentMinutes + 1) / 15) * 15;
  const minutesUntilNext = (nextMark - currentMinutes - 1 + 60) % 60;
  const secondsUntilNext = 60 - currentSeconds;

  const totalSecondsRemaining = minutesUntilNext * 60 + secondsUntilNext;
  const totalSecondsInRound = 15 * 60;
  const progress = ((totalSecondsInRound - totalSecondsRemaining) / totalSecondsInRound) * 100;

  return {
    minutes: minutesUntilNext,
    seconds: secondsUntilNext,
    progress,
  };
};

/**
 * Generate mock leaderboard data
 */
export const generateMockLeaderboard = (count: number = 10): LeaderboardEntry[] => {
  const wallets = Array.from({ length: count }, () => {
    const randomString = Math.random().toString(36).substring(2, 15) +
                        Math.random().toString(36).substring(2, 15);
    return randomString.substring(0, 44);
  });

  const volumes = Array.from({ length: count }, () =>
    Math.random() * 100000 + 1000
  ).sort((a, b) => b - a);

  const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);

  return wallets.map((wallet, index) => ({
    wallet,
    volume: volumes[index],
    percentage: (volumes[index] / totalVolume) * 100,
    rank: index + 1,
    isWinner: index === 0,
  }));
};

/**
 * Generate random stats for demonstration
 */
export const generateMockStats = () => {
  return {
    totalRounds: Math.floor(Math.random() * 1000) + 2000,
    totalRewards: Math.floor(Math.random() * 50000) + 100000,
    uniqueWinners: Math.floor(Math.random() * 500) + 1000,
    avgReward: (Math.random() * 30 + 30).toFixed(2),
  };
};
