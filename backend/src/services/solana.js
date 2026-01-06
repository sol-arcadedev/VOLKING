import { Connection } from '@solana/web3.js';
import { ENV } from '../config/env.js';

const HELIUS_RPC = ENV.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${ENV.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';

export const connection = new Connection(HELIUS_RPC, 'confirmed');