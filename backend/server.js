import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const HELIUS_RPC = HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';

// Token decimals - most Pump.fun tokens have 6 decimals
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '6');

// SOL decimals (always 9)
const SOL_DECIMALS = 9;

// Known program IDs
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

// Cache for wallet checks
const walletCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

// ============================================
// WALLET DETECTION (On-chain check)
// ============================================

async function isUserWallet(address) {
  if (!address) return false;

  const cached = walletCache.get(address);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached.isUserWallet;
  }

  try {
    const response = await fetch(HELIUS_RPC, {
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

    let isUser = false;

    if (accountInfo === null) {
      // New/empty account - treat as potential user
      isUser = true;
    } else {
      const owner = accountInfo.owner;
      const executable = accountInfo.executable;

      // User wallet = owned by System Program + not executable
      if (executable) {
        isUser = false;
        console.log(`🔴 ${address.substring(0, 8)}... is a program`);
      } else if (owner === SYSTEM_PROGRAM) {
        isUser = true;
        console.log(`🟢 ${address.substring(0, 8)}... is a user wallet`);
      } else {
        isUser = false;
        console.log(`🔴 ${address.substring(0, 8)}... is a PDA/pool (owner: ${owner.substring(0, 8)}...)`);
      }
    }

    walletCache.set(address, { isUserWallet: isUser, checkedAt: Date.now() });
    return isUser;

  } catch (error) {
    console.error(`Error checking wallet ${address}:`, error.message);
    return false;
  }
}

// ============================================
// IN-MEMORY STORAGE
// ============================================

let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();
let stats = { processed: 0, excluded: 0, totalSolVolume: 0 };

function getCurrentRoundStart() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundStart = Math.floor(minutes / 15) * 15;
  now.setMinutes(roundStart, 0, 0);
  return now.getTime();
}

// Reset every 15 minutes
setInterval(() => {
  const newRoundStart = getCurrentRoundStart();
  if (newRoundStart !== currentRoundStart) {
    console.log('🔄 New round started');
    console.log(`📊 Previous round: ${volumeData.size} traders, ${stats.totalSolVolume.toFixed(4)} SOL volume`);

    volumeData.clear();
    stats = { processed: 0, excluded: 0, totalSolVolume: 0 };
    currentRoundStart = newRoundStart;
  }
}, 60000);

// Clear old cache
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  for (const [address, data] of walletCache.entries()) {
    if (now - data.checkedAt > CACHE_TTL * 2) {
      walletCache.delete(address);
      cleared++;
    }
  }
  if (cleared > 0) console.log(`🧹 Cleared ${cleared} cache entries`);
}, 5 * 60 * 1000);

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roundStart: new Date(currentRoundStart).toISOString(),
    traders: volumeData.size,
    cacheSize: walletCache.size,
    stats,
    config: {
      tokenDecimals: TOKEN_DECIMALS,
      tokenAddress: TOKEN_ADDRESS ? `${TOKEN_ADDRESS.substring(0, 8)}...` : 'not set'
    }
  });
});

// Webhook endpoint - receives Helius enhanced transactions
app.post('/api/webhook/transactions', async (req, res) => {
  try {
    console.log('📨 Webhook received!');

    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`Processing ${transactions.length} transactions`);

    // Debug first transaction structure
    if (transactions.length > 0 && transactions[0]) {
      const tx = transactions[0];
      console.log('📋 TX Keys:', Object.keys(tx));
      console.log('📋 nativeTransfers:', tx.nativeTransfers?.length || 0);
      console.log('📋 tokenTransfers:', tx.tokenTransfers?.length || 0);
      console.log('📋 events:', Object.keys(tx.events || {}));
      console.log('📋 feePayer:', tx.feePayer);
    }

    let totalProcessed = 0;
    let totalExcluded = 0;

    for (const tx of transactions) {
      const result = await processTransaction(tx);
      totalProcessed += result.processed;
      totalExcluded += result.excluded;
    }

    console.log(`✅ Traders: ${volumeData.size}, SOL volume: ${stats.totalSolVolume.toFixed(4)}`);

    res.status(200).json({
      success: true,
      processed: totalProcessed,
      excluded: totalExcluded,
      traders: volumeData.size
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function processTransaction(tx) {
  let processed = 0;
  let excluded = 0;

  const nativeTransfers = tx.nativeTransfers || [];
  const tokenTransfers = tx.tokenTransfers || [];
  const feePayer = tx.feePayer;
  const timestamp = (tx.timestamp || Math.floor(Date.now() / 1000)) * 1000;

  // Check if this transaction involves our token
  const hasOurToken = tokenTransfers.some(t => t.mint === TOKEN_ADDRESS);
  if (!hasOurToken) {
    return { processed: 0, excluded: 0 };
  }

  console.log(`\n🔍 Processing TX with ${nativeTransfers.length} native transfers, ${tokenTransfers.length} token transfers`);

  // ============================================
  // FIND SOL VALUE - Look at native (SOL) transfers
  // The largest SOL transfer to/from feePayer is likely the trade value
  // ============================================

  let solValue = 0;
  let traderWallet = feePayer;

  // Find the largest SOL transfer involving the fee payer
  for (const transfer of nativeTransfers) {
    const amount = transfer.amount / Math.pow(10, SOL_DECIMALS);

    // Skip tiny amounts (< 0.001 SOL = fees, rent, etc)
    if (amount < 0.001) continue;

    const from = transfer.fromUserAccount;
    const to = transfer.toUserAccount;

    console.log(`  SOL transfer: ${amount.toFixed(4)} SOL from ${from?.substring(0, 8)}... to ${to?.substring(0, 8)}...`);

    // Track the largest transfer involving fee payer
    if ((from === feePayer || to === feePayer) && amount > solValue) {
      solValue = amount;
      traderWallet = feePayer;
    }
  }

  // ============================================
  // FALLBACK: If no SOL transfers, check swap events
  // ============================================

  const events = tx.events || {};
  if (events.swap && solValue === 0) {
    const swap = events.swap;
    console.log('  Swap event found:', JSON.stringify(swap).substring(0, 200));

    if (swap.nativeInput?.amount) {
      solValue = swap.nativeInput.amount / Math.pow(10, SOL_DECIMALS);
      traderWallet = swap.nativeInput.account || feePayer;
    } else if (swap.nativeOutput?.amount) {
      solValue = swap.nativeOutput.amount / Math.pow(10, SOL_DECIMALS);
      traderWallet = swap.nativeOutput.account || feePayer;
    }
  }

  // ============================================
  // UPDATE VOLUME
  // ============================================

  if (solValue > 0 && traderWallet) {
    const isUser = await isUserWallet(traderWallet);

    if (isUser) {
      updateVolume(traderWallet, solValue, timestamp);
      processed = 1;
      stats.processed++;
      stats.totalSolVolume += solValue;
      console.log(`  ✅ ${traderWallet.substring(0, 8)}... traded ${solValue.toFixed(4)} SOL`);
    } else {
      excluded = 1;
      stats.excluded++;
      console.log(`  ❌ Excluded: ${traderWallet.substring(0, 8)}... (not a user wallet)`);
    }
  } else {
    console.log('  ⚪ No SOL value found in transaction');
  }

  return { processed, excluded };
}

function updateVolume(wallet, solAmount, timestamp) {
  const existing = volumeData.get(wallet) || {
    wallet,
    volume: 0,
    trades: 0,
    lastTrade: 0,
  };

  existing.volume += solAmount;
  existing.trades += 1;
  existing.lastTrade = Math.max(existing.lastTrade, timestamp);

  volumeData.set(wallet, existing);
}

// Get leaderboard - returns SOL volume
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

  res.json({
    roundStart: currentRoundStart,
    leaderboard,
    totalTraders: volumeData.size,
    volumeUnit: 'SOL'
  });
});

// Debug: check if an address is a user wallet
app.get('/api/debug/check/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const isUser = await isUserWallet(address);
    const cached = walletCache.get(address);

    res.json({
      address,
      isUserWallet: isUser,
      cached: cached ? {
        isUserWallet: cached.isUserWallet,
        checkedAt: new Date(cached.checkedAt).toISOString()
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: cache stats
app.get('/api/debug/cache', (req, res) => {
  const userWallets = Array.from(walletCache.entries())
      .filter(([_, data]) => data.isUserWallet).length;

  res.json({
    cacheSize: walletCache.size,
    userWallets,
    nonUserWallets: walletCache.size - userWallets,
    stats
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API v3 - SOL Volume Tracking',
    volumeUnit: 'SOL',
    features: [
      'On-chain wallet detection (no hardcoded lists)',
      'SOL value tracking (not raw token amounts)',
      'Filters out programs, PDAs, and pools'
    ],
    endpoints: {
      health: 'GET /api/health',
      leaderboard: 'GET /api/leaderboard',
      webhook: 'POST /api/webhook/transactions',
      checkWallet: 'GET /api/debug/check/:address',
      cacheStats: 'GET /api/debug/cache'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 VOLKING API v3 running on port ${PORT}`);
  console.log(`📊 Current round: ${new Date(currentRoundStart).toISOString()}`);
  console.log(`💰 Tracking SOL volume (not raw token amounts)`);
  console.log(`🔍 Using on-chain detection for wallet filtering`);
});