import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { connection } from './solana.js';
import { BLOCKCHAIN, TIMING } from '../config/constants.js';
import { ENV } from '../config/env.js';

const walletCache = new Map();

export async function isUserWallet(address) {
    if (!address) return false;

    const cached = walletCache.get(address);
    if (cached && Date.now() - cached.checkedAt < TIMING.CACHE_TTL) {
        return cached.isUserWallet;
    }

    try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${ENV.HELIUS_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAccountInfo',
                params: [address, { encoding: 'base64' }]
            })
        });

        const data = await response.json();
        const accountInfo = data.result?.value;

        let isUser;
        if (accountInfo === null) {
            isUser = true;
        } else {
            const owner = accountInfo.owner;
            const executable = accountInfo.executable;
            isUser = !executable && owner === BLOCKCHAIN.SYSTEM_PROGRAM;
        }

        walletCache.set(address, { isUserWallet: isUser, checkedAt: Date.now() });
        return isUser;
    } catch (error) {
        console.error(`Error checking wallet ${address}:`, error.message);
        return false;
    }
}

export function getWalletCache() {
    return walletCache;
}

export function clearOldCacheEntries() {
    const now = Date.now();
    let cleared = 0;
    for (const [address, data] of walletCache.entries()) {
        if (now - data.checkedAt > TIMING.CACHE_TTL * 2) {
            walletCache.delete(address);
            cleared++;
        }
    }
    if (cleared > 0) console.log(`🧹 Cleared ${cleared} cache entries`);
}

export function getKeypairFromPrivateKey(privateKeyBase58) {
    try {
        const privateKeyBytes = bs58.decode(privateKeyBase58);
        return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
        console.error('Error creating keypair:', error);
        return null;
    }
}

export async function getWalletBalance(walletAddress) {
    try {
        const pubkey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(pubkey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error(`Error getting balance for ${walletAddress}:`, error);
        return 0;
    }
}