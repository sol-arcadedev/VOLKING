/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_HELIUS_API_KEY: string;
    readonly VITE_TOKEN_ADDRESS: string;
    readonly VITE_REWARD_WALLET_ADDRESS: string;
    readonly VITE_CREATOR_FEE_WALLET: string;
    readonly VITE_SOLANA_NETWORK: string;
    readonly VITE_API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}