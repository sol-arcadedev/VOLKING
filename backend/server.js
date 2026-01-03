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

// Known program IDs (System Program owns normal wallets)
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// Cache for wallet checks (to avoid repeated RPC calls)
const walletCache = new Map(); // address -> { isUserWallet: boolean, checkedAt: timestamp }
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ============================================
// WALLET DETECTION FUNCTIONS
// ============================================

/**
 * Check if an address is a normal user wallet using on-chain data
 *
 * A normal user wallet:
 * - Is owned by the System Program (11111111...)
 * - Is NOT executable (not a program)
 * - Has 0 bytes of data (no account data)
 * - Is on the ed25519 curve (not a PDA)
 */
async function isUserWallet(address) {
  if (!address) return false;

  // Check cache first
  const cached = walletCache.get(address);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached.isUserWallet;
  }

  try {
    // Use Helius or standard RPC to get account info
    const response = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          address,
          { encoding: 'base64' }
        ]
      })
    });

    const data = await response.json();
    const accountInfo = data.result?.value;

    let isUser = false;

    if (accountInfo === null) {
      // Account doesn't exist on-chain yet - could be a new wallet
      // This is actually common for wallets that haven't received SOL yet
      // We'll treat these as potential user wallets but with lower confidence
      isUser = true;
      console.log(`⚪ ${address.substring(0, 8)}... - New/empty account (treating as user)`);
    } else {
      // Check the criteria for a user wallet
      const owner = accountInfo.owner;
      const executable = accountInfo.executable;
      const dataLength = accountInfo.data ? accountInfo.data[0]?.length || 0 : 0;

      // User wallet criteria:
      // 1. Owned by System Program (normal SOL wallet)
      // 2. NOT executable (not a program)
      // 3. Has no data or minimal data

      if (executable) {
        // It's a program - definitely not a user wallet
        isUser = false;
        console.log(`🔴 ${address.substring(0, 8)}... - Program (executable)`);
      } else if (owner === SYSTEM_PROGRAM) {
        // Owned by System Program = normal wallet
        isUser = true;
        console.log(`🟢 ${address.substring(0, 8)}... - User wallet (System Program owned)`);
      } else if (owner === TOKEN_PROGRAM || owner === TOKEN_2022_PROGRAM) {
        // It's a token account, not a wallet
        isUser = false;
        console.log(`🔴 ${address.substring(0, 8)}... - Token account`);
      } else {
        // Owned by some other program - likely a PDA or pool
        isUser = false;
        console.log(`🔴 ${address.substring(0, 8)}... - PDA/Pool (owned by ${owner.substring(0, 8)}...)`);
      }
    }

    // Cache the result
    walletCache.set(address, { isUserWallet: isUser, checkedAt: Date.now() });

    return isUser;

  } catch (error) {
    console.error(`Error checking wallet ${address}:`, error.message);
    // On error, be conservative and exclude
    return false;
  }
}

/**
 * Check if address is on the ed25519 curve (not a PDA)
 * PDAs are derived addresses that are NOT on the curve
 * This is a quick heuristic check
 */
function isOnCurve(address) {
  // This would require the actual ed25519 check
  // For now, we rely on the getAccountInfo method above
  // which is more reliable
  return true;
}

/**
 * Batch check multiple addresses for efficiency
 */
async function batchCheckWallets(addresses) {
  const uniqueAddresses = [...new Set(addresses)].filter(a => a);
  const results = new Map();

  // Check cache first
  const uncached = [];
  for (const addr of uniqueAddresses) {
    const cached = walletCache.get(addr);
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
      results.set(addr, cached.isUserWallet);
    } else {
      uncached.push(addr);
    }
  }

  // Batch RPC call for uncached addresses
  if (uncached.length > 0) {
    try {
      const response = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getMultipleAccounts',
          params: [
            uncached,
            { encoding: 'base64' }
          ]
        })
      });

      const data = await response.json();
      const accounts = data.result?.value || [];

      for (let i = 0; i < uncached.length; i++) {
        const address = uncached[i];
        const accountInfo = accounts[i];

        let isUser = false;

        if (accountInfo === null) {
          isUser = true; // New/empty account
        } else {
          const owner = accountInfo.owner;
          const executable = accountInfo.executable;

          if (executable) {
            isUser = false;
          } else if (owner === SYSTEM_PROGRAM) {
            isUser = true;
          } else {
            isUser = false;
          }
        }

        results.set(address, isUser);
        walletCache.set(address, { isUserWallet: isUser, checkedAt: Date.now() });
      }
    } catch (error) {
      console.error('Batch wallet check error:', error.message);
      // On error, mark all as unknown (exclude them)
      for (const addr of uncached) {
        results.set(addr, false);
      }
    }
  }

  return results;
}

// ============================================
// IN-MEMORY STORAGE
// ============================================

let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();
let stats = { processed: 0, excluded: 0, programs: 0, pdas: 0, tokenAccounts: 0 };

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
    console.log(`📊 Previous round: ${volumeData.size} traders, ${stats.processed} processed, ${stats.excluded} excluded`);

    volumeData.clear();
    stats = { processed: 0, excluded: 0, programs: 0, pdas: 0, tokenAccounts: 0 };
    currentRoundStart = newRoundStart;
  }
}, 60000);

// Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  for (const [address, data] of walletCache.entries()) {
    if (now - data.checkedAt > CACHE_TTL * 2) {
      walletCache.delete(address);
      cleared++;
    }
  }
  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} old cache entries`);
  }
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
    stats
  });
});

// Webhook endpoint
app.post('/api/webhook/transactions', async (req, res) => {
  try {
    console.log('📨 Webhook received!');

    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`Processing ${transactions.length} transactions`);

    let totalProcessed = 0;
    let totalExcluded = 0;

    for (const tx of transactions) {
      const result = await processTransaction(tx);
      totalProcessed += result.processed;
      totalExcluded += result.excluded;
    }

    console.log(`✅ Round totals: ${volumeData.size} traders, ${stats.processed} transfers processed`);

    res.status(200).json({
      success: true,
      processed: totalProcessed,
      excluded: totalExcluded,
      traders: volumeData.size
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

async function processTransaction(tx) {
  const tokenMint = TOKEN_ADDRESS;
  let processed = 0;
  let excluded = 0;

  const tokenTransfers = tx.tokenTransfers || [];
  const relevantTransfers = tokenTransfers.filter(
      transfer => transfer.mint === tokenMint
  );

  if (relevantTransfers.length === 0) {
    return { processed, excluded };
  }

  // Collect all addresses to check
  const addressesToCheck = [];
  for (const transfer of relevantTransfers) {
    if (transfer.toUserAccount) addressesToCheck.push(transfer.toUserAccount);
    if (transfer.fromUserAccount) addressesToCheck.push(transfer.fromUserAccount);
  }

  // Batch check all addresses
  const walletResults = await batchCheckWallets(addressesToCheck);

  // Process transfers
  for (const transfer of relevantTransfers) {
    const amount = parseFloat(transfer.tokenAmount || 0);
    if (amount === 0) continue;

    const buyer = transfer.toUserAccount;
    const seller = transfer.fromUserAccount;
    const timestamp = tx.timestamp * 1000;

    // Update buyer if it's a user wallet
    if (buyer && walletResults.get(buyer)) {
      updateVolume(buyer, amount, timestamp);
      processed++;
      stats.processed++;
    } else if (buyer) {
      excluded++;
      stats.excluded++;
    }

    // Update seller if it's a user wallet (and different from buyer)
    if (seller && seller !== buyer && walletResults.get(seller)) {
      updateVolume(seller, amount, timestamp);
      processed++;
      stats.processed++;
    } else if (seller && seller !== buyer) {
      excluded++;
      stats.excluded++;
    }
  }

  return { processed, excluded };
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
}

// Get leaderboard
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

// Debug endpoint - check if an address is a user wallet
app.get('/api/debug/check/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const isUser = await isUserWallet(address);
    const cached = walletCache.get(address);

    res.json({
      address,
      isUserWallet: isUser,
      cached: !!cached,
      checkedAt: cached?.checkedAt ? new Date(cached.checkedAt).toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - view cache stats
app.get('/api/debug/cache', (req, res) => {
  const userWallets = Array.from(walletCache.entries())
      .filter(([_, data]) => data.isUserWallet)
      .length;

  const nonUserWallets = walletCache.size - userWallets;

  res.json({
    cacheSize: walletCache.size,
    userWallets,
    nonUserWallets,
    stats
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API - Smart Wallet Detection',
    version: '2.0',
    endpoints: {
      health: '/api/health',
      leaderboard: '/api/leaderboard',
      webhook: '/api/webhook/transactions (POST)',
      checkAddress: '/api/debug/check/:address',
      cacheStats: '/api/debug/cache'
    },
    detection: 'On-chain account info (owner, executable, data)'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Current round: ${new Date(currentRoundStart).toISOString()}`);
  console.log(`🔍 Using on-chain detection for wallet filtering`);
  console.log(`🌐 RPC: ${HELIUS_RPC.substring(0, 40)}...`);
});