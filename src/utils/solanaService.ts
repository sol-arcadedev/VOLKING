import { Connection, PublicKey } from '@solana/web3.js';

// Configuration with fallback defaults
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';
const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || '';
const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';

// Helius RPC endpoint
const HELIUS_RPC = HELIUS_API_KEY
    ? `https://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : `https://api.${NETWORK}.solana.com`;

// Create connection
export const connection = new Connection(HELIUS_RPC, 'confirmed');

export interface Transaction {
  signature: string;
  slot: number;
  timestamp: number;
  buyer?: string;
  seller?: string;
  amount: number;
  price: number;
}

export interface VolumeData {
  wallet: string;
  volume: number;
  trades: number;
  lastTrade: number;
}

/**
 * Get current round start time (last 15-minute mark)
 */
export function getCurrentRoundStart(): number {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundStart = Math.floor(minutes / 15) * 15;

  now.setMinutes(roundStart);
  now.setSeconds(0);
  now.setMilliseconds(0);

  return now.getTime();
}

/**
 * Get next round start time
 */
export function getNextRoundStart(): number {
  const currentRoundStart = getCurrentRoundStart();
  return currentRoundStart + (15 * 60 * 1000); // Add 15 minutes
}

/**
 * Get token transactions for a specific time period
 * Uses Helius API for better performance if available
 */
export async function getTokenTransactions(
    tokenMint: string,
    startTime: number,
    endTime: number = Date.now()
): Promise<Transaction[]> {
  try {
    const pubkey = new PublicKey(tokenMint);

    // Get signatures for the token account
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 1000,
    });

    const transactions: Transaction[] = [];

    // Filter by time and collect relevant transactions
    for (const sig of signatures) {
      if (!sig.blockTime) continue;

      const txTime = sig.blockTime * 1000;

      // Only process transactions within the time window
      if (txTime >= startTime && txTime <= endTime) {
        const parsed = await parseTransaction(sig.signature);
        if (parsed) {
          transactions.push(parsed);
        }
      }

      // Stop if we've gone past the start time
      if (txTime < startTime) break;
    }

    console.log(`Found ${transactions.length} transactions between ${new Date(startTime).toISOString()} and ${new Date(endTime).toISOString()}`);
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Parse transaction to get buyer, seller, and volume
 * Specifically looks for token swap/transfer instructions
 */
export async function parseTransaction(signature: string): Promise<Transaction | null> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || !tx.blockTime) return null;

    // Initialize transaction data
    let buyer = '';
    let seller = '';
    let amount = 0;

    // Parse instructions to find token transfers
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      // Look for SPL token transfers
      if ('parsed' in ix && ix.program === 'spl-token') {
        const parsed = ix.parsed;

        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          const info = parsed.info;

          // Get transfer amount
          if (info.amount) {
            amount = parseFloat(info.amount);
          } else if (info.tokenAmount) {
            amount = parseFloat(info.tokenAmount.amount);
          }

          // Get source (seller) and destination (buyer)
          if (info.source) seller = info.source;
          if (info.destination) buyer = info.destination;
        }
      }

      // Also check for SOL transfers (for swap detection)
      if ('parsed' in ix && ix.program === 'system' && ix.parsed.type === 'transfer') {
        const info = ix.parsed.info;
        // This could be part of a swap - track the accounts
        if (!seller && info.source) seller = info.source;
        if (!buyer && info.destination) buyer = info.destination;
      }
    }

    // Only return if we have meaningful data
    if (amount > 0 && (buyer || seller)) {
      return {
        signature,
        slot: tx.slot,
        timestamp: tx.blockTime * 1000,
        buyer,
        seller,
        amount,
        price: 0, // Price calculation would require additional logic
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return null;
  }
}

export async function calculateVolumeLeaderboard(
    startTime: number,
    endTime: number = Date.now()
): Promise<VolumeData[]> {
  const tokenMint = TOKEN_ADDRESS;
  if (!tokenMint) {
    throw new Error('TOKEN_ADDRESS not configured');
  }

  const pubkey = new PublicKey(tokenMint);
  const volumeMap = new Map<string, VolumeData>();

  let allSignatures: string[] = [];
  let lastSignature: string | undefined;

  // Fetch signatures in chunks until we exceed time window
  while (true) {
    const sigs = await connection.getSignaturesForAddress(pubkey, {
      limit: 100,
      before: lastSignature,
    });

    if (sigs.length === 0) break;

    // Filter by time
    const relevant = sigs.filter(sig => {
      if (!sig.blockTime) return false;
      const txTime = sig.blockTime * 1000;
      return txTime >= startTime && txTime <= endTime;
    });

    allSignatures.push(...relevant.map(s => s.signature));

    // Stop if we've gone past the start time
    const oldestTime = sigs[sigs.length - 1].blockTime;
    if (oldestTime && oldestTime * 1000 < startTime) break;

    lastSignature = sigs[sigs.length - 1].signature;

    // Avoid hitting rate limits
    await sleep(300);
  }

  console.log(`Found ${allSignatures.length} relevant signatures`);

  // Process in batches of 10
  for (let i = 0; i < allSignatures.length; i += 10) {
    const batch = allSignatures.slice(i, i + 10);
    const txs = await Promise.all(
        batch.map(sig => parseTransaction(sig))
    );

    // Update volume map
    for (const tx of txs) {
      if (!tx) continue;
      updateVolumeMap(volumeMap, tx);
    }

    await sleep(200); // Rate limit protection
  }

  return Array.from(volumeMap.values())
      .sort((a, b) => b.volume - a.volume);
}

/**
 * Update volume map with transaction data
 */
function updateVolumeMap(volumeMap: Map<string, VolumeData>, tx: Transaction): void {
  // Track buyer volume
  if (tx.buyer) {
    const existing = volumeMap.get(tx.buyer) || {
      wallet: tx.buyer,
      volume: 0,
      trades: 0,
      lastTrade: 0,
    };

    existing.volume += tx.amount;
    existing.trades += 1;
    existing.lastTrade = Math.max(existing.lastTrade, tx.timestamp);

    volumeMap.set(tx.buyer, existing);
  }

  // Track seller volume (avoid double counting if buyer === seller)
  if (tx.seller && tx.seller !== tx.buyer) {
    const existing = volumeMap.get(tx.seller) || {
      wallet: tx.seller,
      volume: 0,
      trades: 0,
      lastTrade: 0,
    };

    existing.volume += tx.amount;
    existing.trades += 1;
    existing.lastTrade = Math.max(existing.lastTrade, tx.timestamp);

    volumeMap.set(tx.seller, existing);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get volume leaderboard for current round (last 15 minutes)
 */
export async function getCurrentRoundLeaderboard(): Promise<VolumeData[]> {
  const startTime = getCurrentRoundStart();
  const endTime = Date.now();
  return calculateVolumeLeaderboard(startTime, endTime);
}
