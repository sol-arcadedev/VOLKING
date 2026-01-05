import { Connection } from '@solana/web3.js';
import { ENV } from '../config/env.js';

const HELIUS_RPC = ENV.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${ENV.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';

export const connection = new Connection(HELIUS_RPC, 'confirmed');

export function getCurrentRoundStart() {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundStart = Math.floor(minutes / 15) * 15;
    now.setMinutes(roundStart, 0, 0);
    return now.getTime();
}

export function getNextRoundStart() {
    return getCurrentRoundStart() + (15 * 60 * 1000);
}
