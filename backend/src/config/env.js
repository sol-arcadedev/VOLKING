export const ENV = {
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    ADMIN_KEY: process.env.ADMIN_KEY || '',

    // Solana
    HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',
    TOKEN_ADDRESS: process.env.TOKEN_ADDRESS || '',

    // Wallets
    CREATOR_FEE_WALLET: process.env.CREATOR_FEE_WALLET || '',
    CREATOR_FEE_WALLET_PRIVATE: process.env.CREATOR_FEE_WALLET_PRIVATE || '',
    TREASURY_WALLET: process.env.TREASURY_WALLET || '',
    REWARD_WALLET_PUBLIC: process.env.REWARD_WALLET_PUBLIC || '',
    REWARD_WALLET_PRIVATE: process.env.REWARD_WALLET_PRIVATE || '',
};

export function validateConfig() {
    const required = [
        'HELIUS_API_KEY',
        'TOKEN_ADDRESS',
        'CREATOR_FEE_WALLET',
        'TREASURY_WALLET',
        'REWARD_WALLET_PUBLIC',
    ];

    const missing = required.filter(key => !ENV[key]);

    if (missing.length > 0) {
        console.warn(`⚠️  Missing configuration: ${missing.join(', ')}`);
    }

    return missing.length === 0;
}
