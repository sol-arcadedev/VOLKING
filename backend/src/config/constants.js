export const FEE_DISTRIBUTION = {
    TREASURY: 0.70,
    WINNER_REWARD: 0.15,
    NEXT_ROUND_BASE: 0.05,
    BUYBACK_BURN: 0.10,
};

export const TIMING = {
    ROUND_DURATION: 5 * 60 * 1000,
    FEE_CLAIM_INTERVAL: 60 * 1000,
    CACHE_TTL: 15 * 60 * 1000,
    CACHE_CLEANUP_INTERVAL: 5 * 60 * 1000,
    ROUND_TIMER_INTERVAL: 60 * 1000,
};

export const BLOCKCHAIN = {
    TOKEN_DECIMALS: parseInt(process.env.TOKEN_DECIMALS || '6'),
    SOL_DECIMALS: 9,
    MIN_SOL_FOR_FEES: 0.02,
    INITIAL_BASE_REWARD: 0.2,
    SYSTEM_PROGRAM: '11111111111111111111111111111111',
};

export const API_ENDPOINTS = {
    JUPITER: 'https://quote-api.jup.ag/v6',
    PUMP_PORTAL: 'https://pumpportal.fun/api/trade-local',
};