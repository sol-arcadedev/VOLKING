// Type definitions for VOLKING project

export interface LeaderboardEntry {
  wallet: string;
  volume: number;
  percentage: number;
  rank: number;
  isWinner: boolean;
}

export interface RewardRound {
  roundNumber: number;
  winner: string;
  volume: number;
  reward: number;
  timestamp: number;
}

export interface TokenStats {
  totalVolume: number;
  totalTrades: number;
  holders: number;
  marketCap: number;
  price: number;
}

export interface CountdownTimer {
  minutes: number;
  seconds: number;
  progress: number;
}
