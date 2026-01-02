import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// IMPORTANT: Middleware must come BEFORE routes
app.use(cors());
app.use(express.json());

// ============================================
// EXCLUDED ADDRESSES - Routers, Pools, Programs
// ============================================
const EXCLUDED_ADDRESSES = new Set([
  // Pump.fun Programs & Pools
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',   // Pump.fun Program
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1', // Pump.fun Fee Account
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump.fun Migration

  // Raydium
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium Authority
  'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',  // Raydium Route

  // Jupiter
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter V6
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',  // Jupiter V4
  'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph',  // Jupiter V3
  'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo',  // Jupiter V2

  // Orca
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',  // Orca Whirlpool
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca Swap V2
  'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // Orca Swap V1

  // Meteora
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',  // Meteora DLMM
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB', // Meteora Pools

  // Phoenix
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',  // Phoenix

  // OpenBook/Serum
  'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',  // OpenBook
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // Serum V3

  // Marinade
  'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',  // Marinade

  // Token Programs
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // Token Program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
  'Token2022DeHBSPiQ6wJu5soMTq3HKRCiGQZ1U2dZJxW9g', // Token-2022

  // System
  '11111111111111111111111111111111',              // System Program
  'So11111111111111111111111111111111111111112',   // Wrapped SOL

  // Common OTC/Router Addresses (add more as you discover them)
  'HeqKzQjVbkKPTmy2RdAKPJqMUifvGPZnKFBFV6n7wPtmy', // OTC Router you found
]);

// Addresses that START with these prefixes are likely programs/pools
const EXCLUDED_PREFIXES = [
  '11111111',  // System-like
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function isExcludedAddress(address) {
  if (!address) return true;

  // Check exact match
  if (EXCLUDED_ADDRESSES.has(address)) {
    return true;
  }

  // Check prefixes
  for (const prefix of EXCLUDED_PREFIXES) {
    if (address.startsWith(prefix)) {
      return true;
    }
  }

  // Heuristic: Very short addresses or addresses that look like programs
  // Most user wallets are base58 encoded and look "random"
  // Program addresses often have patterns

  return false;
}

function isLikelyUserWallet(address) {
  if (!address) return false;
  if (isExcludedAddress(address)) return false;

  // Valid Solana addresses are 32-44 characters
  if (address.length < 32 || address.length > 44) return false;

  return true;
}

// ============================================
// IN-MEMORY STORAGE
// ============================================

let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();
let excludedHits = new Map(); // Track excluded addresses for debugging

function getCurrentRoundStart() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundStart = Math.floor(minutes / 15) * 15;
  now.setMinutes(roundStart, 0, 0);
  return now.getTime();
}

// Reset volume data every 15 minutes
setInterval(() => {
  const newRoundStart = getCurrentRoundStart();
  if (newRoundStart !== currentRoundStart) {
    console.log('🔄 New round started, resetting volume data');
    console.log(`📊 Previous round had ${volumeData.size} traders`);

    // Log top excluded addresses for debugging
    if (excludedHits.size > 0) {
      const topExcluded = Array.from(excludedHits.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
      console.log('🚫 Top excluded addresses:', topExcluded);
    }

    volumeData.clear();
    excludedHits.clear();
    currentRoundStart = newRoundStart;
  }
}, 60000);

// ============================================
// API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roundStart: new Date(currentRoundStart).toISOString(),
    traders: volumeData.size,
    excludedAddresses: EXCLUDED_ADDRESSES.size
  });
});

// Webhook endpoint - Receives data from Helius
app.post('/api/webhook/transactions', (req, res) => {
  try {
    console.log('📨 Webhook received!');

    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`Processing ${transactions.length} transactions`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      const result = processTransaction(tx);
      if (result.processed) {
        processedCount++;
      }
      skippedCount += result.skipped;
    }

    console.log(`✅ Processed: ${processedCount}, Skipped (routers/pools): ${skippedCount}`);

    res.status(200).json({
      success: true,
      processed: processedCount,
      skipped: skippedCount,
      traders: volumeData.size
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

function processTransaction(tx) {
  const tokenMint = process.env.TOKEN_ADDRESS;
  let processed = false;
  let skipped = 0;

  // Helius enhanced webhooks provide tokenTransfers array
  const tokenTransfers = tx.tokenTransfers || [];

  const relevantTransfers = tokenTransfers.filter(
      transfer => transfer.mint === tokenMint
  );

  for (const transfer of relevantTransfers) {
    const amount = parseFloat(transfer.tokenAmount || 0);
    if (amount === 0) continue;

    const buyer = transfer.toUserAccount;
    const seller = transfer.fromUserAccount;
    const timestamp = tx.timestamp * 1000;

    // Check and update buyer (if it's a real user wallet)
    if (buyer && isLikelyUserWallet(buyer)) {
      updateVolume(buyer, amount, timestamp);
      processed = true;
    } else if (buyer) {
      // Track excluded for debugging
      excludedHits.set(buyer, (excludedHits.get(buyer) || 0) + 1);
      skipped++;
      console.log(`🚫 Excluded buyer: ${buyer.substring(0, 8)}...`);
    }

    // Check and update seller (if it's a real user wallet)
    if (seller && seller !== buyer && isLikelyUserWallet(seller)) {
      updateVolume(seller, amount, timestamp);
      processed = true;
    } else if (seller && seller !== buyer) {
      excludedHits.set(seller, (excludedHits.get(seller) || 0) + 1);
      skipped++;
      console.log(`🚫 Excluded seller: ${seller.substring(0, 8)}...`);
    }
  }

  return { processed, skipped };
}

function updateVolume(wallet, amount, timestamp) {
  const existing = volumeData.get(wallet) || {
    wallet,
    volume: 0,
    trades: 0,
    lastTrade: 0,
  };

  existing.volume += amount;
  existing.trades += 1;
  existing.lastTrade = Math.max(existing.lastTrade, timestamp);

  volumeData.set(wallet, existing);

  console.log(`✅ Updated ${wallet.substring(0, 8)}...: ${formatNumber(existing.volume)} volume, ${existing.trades} trades`);
}

function formatNumber(num) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

// Get leaderboard endpoint
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

  res.json({
    roundStart: currentRoundStart,
    leaderboard,
    totalTraders: volumeData.size,
  });
});

// Debug endpoint - see excluded addresses
app.get('/api/debug/excluded', (req, res) => {
  const excluded = Array.from(excludedHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([address, count]) => ({ address, count }));

  res.json({
    totalExcluded: excludedHits.size,
    topExcluded: excluded,
    configuredExclusions: EXCLUDED_ADDRESSES.size
  });
});

// Add address to exclusion list (for runtime additions)
app.post('/api/admin/exclude', (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  EXCLUDED_ADDRESSES.add(address);

  // Remove from current volume data if exists
  if (volumeData.has(address)) {
    volumeData.delete(address);
    console.log(`🚫 Removed ${address} from leaderboard and added to exclusions`);
  }

  res.json({
    success: true,
    message: `Address ${address} added to exclusions`,
    totalExclusions: EXCLUDED_ADDRESSES.size
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API - With Router/Pool Filtering',
    endpoints: {
      health: '/api/health',
      leaderboard: '/api/leaderboard',
      webhook: '/api/webhook/transactions (POST)',
      debugExcluded: '/api/debug/excluded',
      addExclusion: '/api/admin/exclude (POST)'
    },
    excludedAddresses: EXCLUDED_ADDRESSES.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Current round: ${new Date(currentRoundStart).toISOString()}`);
  console.log(`🚫 Excluding ${EXCLUDED_ADDRESSES.size} known routers/pools/programs`);
  console.log(`🌐 Public URL: https://volking-production.up.railway.app`);
});