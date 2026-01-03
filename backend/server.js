import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// CORS CONFIGURATION - FIX FOR CLOUDFLARE PAGES
// ============================================
app.use(cors({
  origin: [
    'https://volking.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
    /\.pages\.dev$/  // Allow all Cloudflare Pages preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const CREATOR_FEE_WALLET = process.env.CREATOR_FEE_WALLET || '';
const TREASURY_WALLET = process.env.TREASURY_WALLET || '';
const REWARD_WALLET_PUBLIC = process.env.REWARD_WALLET_PUBLIC || '';

const HELIUS_RPC = HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';

// Token decimals
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '6');
const SOL_DECIMALS = 9;

// ============================================
// FEE DISTRIBUTION CONSTANTS
// ============================================
const TREASURY_PERCENTAGE = 0.70;
const REWARD_WALLET_PERCENTAGE = 0.20;
const BUYBACK_BURN_PERCENTAGE = 0.10;
const WINNER_REWARD_PERCENTAGE = 0.15;
const START_REWARD_PERCENTAGE = 0.05;
const MIN_SOL_FOR_FEES = 0.02;
const INITIAL_START_REWARD = 0.2;
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

// Cache for wallet checks
const walletCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

// ============================================
// STATE TRACKING
// ============================================
let volumeData = new Map();
let currentRoundStart = getCurrentRoundStart();
let roundNumber = 1;
let currentRoundCreatorFees = 0;
let rewardWalletBalance = 0;
let startReward = INITIAL_START_REWARD;
let totalRewardsPaid = 0;
let totalSupplyBurned = 0;
let totalRoundsCompleted = 0;

const winnerHistory = [];
const rewardTransfers = [];
const burnHistory = [];

let stats = {
  processed: 0,
  excluded: 0,
  totalSolVolume: 0,
  creatorFeesTracked: 0
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrentRoundStart() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundStart = Math.floor(minutes / 15) * 15;
  now.setMinutes(roundStart, 0, 0);
  return now.getTime();
}

function getNextRoundStart() {
  return getCurrentRoundStart() + (15 * 60 * 1000);
}

function getCurrentWinner() {
  if (volumeData.size === 0) return null;
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume);
  return leaderboard[0] || null;
}

function calculateCurrentReward() {
  const potentialRewardWalletAdd = currentRoundCreatorFees * REWARD_WALLET_PERCENTAGE;
  const potentialWinnerReward = (rewardWalletBalance + potentialRewardWalletAdd) * WINNER_REWARD_PERCENTAGE;
  return startReward + potentialWinnerReward;
}

// ============================================
// WINNER & REWARD TRACKING
// ============================================

function recordWinner(wallet, volume, reward, signature, roundStartTime) {
  const record = {
    wallet,
    volume,
    reward,
    signature,
    roundStart: roundStartTime,
    roundNumber: roundNumber,
    timestamp: Date.now(),
  };

  winnerHistory.push(record);
  totalRewardsPaid += reward;

  rewardTransfers.unshift({
    wallet,
    amount: reward,
    signature,
    timestamp: Date.now(),
    roundNumber: roundNumber,
    roundStart: roundStartTime,
  });

  if (rewardTransfers.length > 100) {
    rewardTransfers.pop();
  }

  console.log(`🏆 Winner recorded: ${wallet.substring(0, 8)}... with ${volume.toFixed(4)} SOL volume, reward: ${reward.toFixed(4)} SOL`);
  console.log(`💰 Total rewards paid all-time: ${totalRewardsPaid.toFixed(4)} SOL`);
}

function recordBurn(amountSOL, tokensBurned, signature) {
  const record = {
    amountSOL,
    tokensBurned,
    signature,
    roundNumber: roundNumber,
    timestamp: Date.now(),
  };

  burnHistory.push(record);
  totalSupplyBurned += tokensBurned;

  console.log(`🔥 Burn recorded: ${tokensBurned} tokens (${amountSOL.toFixed(4)} SOL worth)`);
}

function calculateHallOfDegens() {
  const degenMap = new Map();

  for (const record of winnerHistory) {
    const existing = degenMap.get(record.wallet);

    if (existing) {
      existing.totalWins += 1;
      existing.totalRewards += record.reward;
      existing.totalVolume += record.volume;
      existing.lastWin = Math.max(existing.lastWin, record.timestamp);
    } else {
      degenMap.set(record.wallet, {
        wallet: record.wallet,
        totalWins: 1,
        totalRewards: record.reward,
        totalVolume: record.volume,
        lastWin: record.timestamp,
        rank: 0,
      });
    }
  }

  const degens = Array.from(degenMap.values())
      .sort((a, b) => b.totalWins - a.totalWins);

  degens.forEach((degen, index) => {
    degen.rank = index + 1;
  });

  return degens;
}

// ============================================
// ROUND END LOGIC
// ============================================

async function handleRoundEnd() {
  console.log('\n🎊 ===== ROUND END =====\n');
  console.log(`Round ${roundNumber} ending...`);
  console.log(`Creator fees this round: ${currentRoundCreatorFees.toFixed(4)} SOL`);

  const winner = getCurrentWinner();

  if (!winner) {
    console.log('⚪ No trades this round, no winner');
    totalRoundsCompleted++;
    roundNumber++;
    resetForNewRound(false);
    return null;
  }

  const treasuryAmount = currentRoundCreatorFees * TREASURY_PERCENTAGE;
  const rewardWalletAdd = currentRoundCreatorFees * REWARD_WALLET_PERCENTAGE;
  const buybackAmount = Math.max(0, (currentRoundCreatorFees * BUYBACK_BURN_PERCENTAGE) - MIN_SOL_FOR_FEES);

  console.log(`\n📊 Fee Distribution:`);
  console.log(`   Treasury (70%): ${treasuryAmount.toFixed(4)} SOL`);
  console.log(`   Reward Wallet (20%): ${rewardWalletAdd.toFixed(4)} SOL`);
  console.log(`   Buyback & Burn (10% - fees): ${buybackAmount.toFixed(4)} SOL`);

  rewardWalletBalance += rewardWalletAdd;

  const winnerReward = rewardWalletBalance * WINNER_REWARD_PERCENTAGE;
  const nextStartReward = rewardWalletBalance * START_REWARD_PERCENTAGE;

  console.log(`\n🏆 Winner Distribution:`);
  console.log(`   Winner: ${winner.wallet.substring(0, 8)}...`);
  console.log(`   Volume: ${winner.volume.toFixed(4)} SOL`);
  console.log(`   Reward (15% of reward wallet): ${winnerReward.toFixed(4)} SOL`);
  console.log(`   Next Round Start Reward (5%): ${nextStartReward.toFixed(4)} SOL`);

  const placeholderSignature = `round-${roundNumber}-${winner.wallet.substring(0, 8)}-${Date.now()}`;

  recordWinner(
      winner.wallet,
      winner.volume,
      winnerReward,
      placeholderSignature,
      currentRoundStart
  );

  rewardWalletBalance -= winnerReward;
  rewardWalletBalance -= nextStartReward;
  startReward = nextStartReward;

  if (buybackAmount > 0) {
    recordBurn(buybackAmount, 0, 'pending-burn');
  }

  totalRoundsCompleted++;
  roundNumber++;

  console.log(`\n✅ Round ${roundNumber - 1} complete!`);
  console.log(`   Next round start reward: ${startReward.toFixed(4)} SOL`);
  console.log(`   Remaining reward wallet: ${rewardWalletBalance.toFixed(4)} SOL\n`);

  resetForNewRound(true);

  return {
    winner: winner.wallet,
    winnerVolume: winner.volume,
    winnerReward,
    treasuryAmount,
    buybackAmount,
    nextStartReward,
  };
}

function resetForNewRound(clearVolume = true) {
  if (clearVolume) {
    volumeData = new Map();
  }
  currentRoundCreatorFees = 0;
  currentRoundStart = getCurrentRoundStart();
  stats.totalSolVolume = 0;
}

function trackCreatorFee(amount) {
  currentRoundCreatorFees += amount;
  stats.creatorFeesTracked++;
  console.log(`💵 Creator fee tracked: ${amount.toFixed(4)} SOL (Total this round: ${currentRoundCreatorFees.toFixed(4)} SOL)`);
}

// ============================================
// WALLET DETECTION
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
      isUser = true;
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

    walletCache.set(address, { isUserWallet: isUser, checkedAt: Date.now() });
    return isUser;

  } catch (error) {
    console.error(`Error checking wallet ${address}:`, error.message);
    return false;
  }
}

// ============================================
// ROUND TIMER
// ============================================

setInterval(async () => {
  const newRoundStart = getCurrentRoundStart();
  if (newRoundStart !== currentRoundStart) {
    console.log('\n⏰ Round timer triggered!');
    await handleRoundEnd();
    currentRoundStart = newRoundStart;
  }
}, 60000);

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
    roundNumber,
    traders: volumeData.size,
    cacheSize: walletCache.size,
    stats,
    config: {
      tokenDecimals: TOKEN_DECIMALS,
      tokenAddress: TOKEN_ADDRESS ? `${TOKEN_ADDRESS.substring(0, 8)}...` : 'not set',
      creatorFeeWallet: CREATOR_FEE_WALLET ? `${CREATOR_FEE_WALLET.substring(0, 8)}...` : 'not set',
      treasuryWallet: TREASURY_WALLET ? `${TREASURY_WALLET.substring(0, 8)}...` : 'not set',
      rewardWallet: REWARD_WALLET_PUBLIC ? `${REWARD_WALLET_PUBLIC.substring(0, 8)}...` : 'not set',
    },
    feeDistribution: {
      treasury: `${TREASURY_PERCENTAGE * 100}%`,
      rewardWallet: `${REWARD_WALLET_PERCENTAGE * 100}%`,
      buybackBurn: `${BUYBACK_BURN_PERCENTAGE * 100}%`,
    },
    rewardDistribution: {
      winnerReward: `${WINNER_REWARD_PERCENTAGE * 100}% of reward wallet`,
      startReward: `${START_REWARD_PERCENTAGE * 100}% of reward wallet`,
    },
  });
});

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(volumeData.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

  res.json({
    roundStart: currentRoundStart,
    nextRoundStart: getNextRoundStart(),
    roundNumber,
    leaderboard,
    totalTraders: volumeData.size,
    volumeUnit: 'SOL',
  });
});

app.get('/api/reward-pool', (req, res) => {
  const currentPotentialReward = calculateCurrentReward();

  res.json({
    currentRoundCreatorFees,
    currentRewardPool: currentPotentialReward,
    startReward,
    rewardWalletBalance,
    totalRewardsPaid,
    roundStart: currentRoundStart,
    nextRoundStart: getNextRoundStart(),
    roundNumber,
    treasuryPercentage: TREASURY_PERCENTAGE,
    rewardWalletPercentage: REWARD_WALLET_PERCENTAGE,
    buybackPercentage: BUYBACK_BURN_PERCENTAGE,
    winnerRewardPercentage: WINNER_REWARD_PERCENTAGE,
  });
});

app.get('/api/global-stats', (req, res) => {
  res.json({
    totalRewardsPaid,
    totalSupplyBurned,
    totalRoundsCompleted,
    totalUniqueWinners: calculateHallOfDegens().length,
    currentRoundNumber: roundNumber,
    lastUpdated: Date.now(),
  });
});

app.get('/api/hall-of-degens', (req, res) => {
  try {
    const degens = calculateHallOfDegens();

    res.json({
      degens,
      recentTransfers: rewardTransfers.slice(0, 50),
      totalWinners: degens.length,
      totalRewardsPaid,
      currentRewardPool: calculateCurrentReward(),
      lastUpdated: Date.now(),
    });
  } catch (error) {
    console.error('Error calculating Hall of Degens:', error);
    res.status(500).json({
      error: 'Failed to calculate Hall of Degens',
      degens: [],
      recentTransfers: [],
      totalWinners: 0,
      totalRewardsPaid: 0,
      currentRewardPool: 0,
      lastUpdated: Date.now(),
    });
  }
});

app.get('/api/winners', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const winners = winnerHistory.slice(-limit).reverse();

  res.json({
    winners,
    total: winnerHistory.length,
    totalRewardsPaid,
  });
});

app.get('/api/burns', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const burns = burnHistory.slice(-limit).reverse();

  res.json({
    burns,
    total: burnHistory.length,
    totalSupplyBurned,
  });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

app.post('/api/admin/end-round', async (req, res) => {
  const { adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await handleRoundEnd();

  res.json({
    success: true,
    message: 'Round ended manually',
    result,
    totalRewardsPaid,
    totalRoundsCompleted,
  });
});

app.post('/api/admin/track-fee', (req, res) => {
  const { adminKey, amount } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  trackCreatorFee(parseFloat(amount));

  res.json({
    success: true,
    currentRoundCreatorFees,
    currentRewardPool: calculateCurrentReward(),
    startReward,
  });
});

app.post('/api/admin/update-signature', (req, res) => {
  const { adminKey, wallet, roundStart, signature } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const record = winnerHistory.find(
      r => r.wallet === wallet && r.roundStart === roundStart
  );

  if (record) {
    record.signature = signature;
  }

  const transfer = rewardTransfers.find(
      t => t.wallet === wallet && t.roundStart === roundStart
  );

  if (transfer) {
    transfer.signature = signature;
  }

  res.json({
    success: true,
    message: 'Signature updated',
    wallet,
    signature,
  });
});

app.post('/api/admin/update-burn', (req, res) => {
  const { adminKey, roundNumber: rn, tokensBurned, signature } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const record = burnHistory.find(b => b.roundNumber === rn);

  if (record) {
    record.tokensBurned = tokensBurned;
    record.signature = signature;
    totalSupplyBurned = burnHistory.reduce((sum, b) => sum + (b.tokensBurned || 0), 0);
  }

  res.json({
    success: true,
    message: 'Burn record updated',
    totalSupplyBurned,
  });
});

app.post('/api/admin/set-reward-balance', (req, res) => {
  const { adminKey, balance } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  rewardWalletBalance = parseFloat(balance);

  res.json({
    success: true,
    rewardWalletBalance,
    currentRewardPool: calculateCurrentReward(),
  });
});

// ============================================
// WEBHOOK ENDPOINT - WITH DETAILED LOGGING
// ============================================

app.post('/api/webhook/transactions', async (req, res) => {
  try {
    console.log('📨 Webhook received!');
    console.log('Raw webhook payload:', JSON.stringify(req.body, null, 2));

    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`Processing ${transactions.length} transactions`);

    let totalProcessed = 0;
    let totalExcluded = 0;

    for (const tx of transactions) {
      const result = await processTransaction(tx);
      totalProcessed += result.processed;
      totalExcluded += result.excluded;
    }

    console.log(`✅ Traders: ${volumeData.size}, SOL volume: ${stats.totalSolVolume.toFixed(4)}, Reward pool: ${calculateCurrentReward().toFixed(4)}`);

    res.status(200).json({
      success: true,
      processed: totalProcessed,
      excluded: totalExcluded,
      traders: volumeData.size,
      currentRewardPool: calculateCurrentReward(),
    });
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SINGLE processTransaction FUNCTION
// ============================================

async function processTransaction(tx) {
  let processed = 0;
  let excluded = 0;

  console.log('\n🔍 Transaction structure:', {
    hasNativeTransfers: !!tx.nativeTransfers,
    nativeTransfersCount: tx.nativeTransfers?.length || 0,
    hasTokenTransfers: !!tx.tokenTransfers,
    tokenTransfersCount: tx.tokenTransfers?.length || 0,
    hasEvents: !!tx.events,
    feePayer: tx.feePayer,
    timestamp: tx.timestamp,
    type: tx.type,
    signature: tx.signature
  });

  const nativeTransfers = tx.nativeTransfers || [];
  const tokenTransfers = tx.tokenTransfers || [];
  const feePayer = tx.feePayer;
  const timestamp = (tx.timestamp || Math.floor(Date.now() / 1000)) * 1000;

  console.log('Token transfers:', tokenTransfers.map(t => ({
    mint: t.mint,
    fromUserAccount: t.fromUserAccount,
    toUserAccount: t.toUserAccount,
    tokenAmount: t.tokenAmount
  })));

  const hasOurToken = tokenTransfers.some(t => t.mint === TOKEN_ADDRESS);

  if (!hasOurToken) {
    console.log(`⚠️ Transaction does not involve our token. Expected: ${TOKEN_ADDRESS}`);
    console.log(`Found mints:`, tokenTransfers.map(t => t.mint));
    return { processed: 0, excluded: 0 };
  }

  console.log(`✓ Transaction involves our token`);

  let solValue = 0;
  let traderWallet = feePayer;

  for (const transfer of nativeTransfers) {
    const amount = transfer.amount / Math.pow(10, SOL_DECIMALS);
    const from = transfer.fromUserAccount;
    const to = transfer.toUserAccount;

    console.log(`  SOL transfer: ${amount.toFixed(4)} SOL from ${from?.substring(0, 8)}... to ${to?.substring(0, 8)}...`);

    if (CREATOR_FEE_WALLET && to === CREATOR_FEE_WALLET) {
      trackCreatorFee(amount);
      console.log(`  💵 Creator fee detected: ${amount.toFixed(4)} SOL`);
    }

    if (amount >= 0.001) {
      const isFromUser = from === feePayer;
      const isToUser = to === feePayer;

      if (isFromUser || isToUser) {
        if (amount > solValue) {
          solValue = amount;
          traderWallet = feePayer;
        }
      }
    }
  }

  if (tx.events?.swap) {
    console.log('  📊 Swap event found:', JSON.stringify(tx.events.swap, null, 2));

    const swap = tx.events.swap;

    if (swap.nativeInput?.amount) {
      const swapAmount = swap.nativeInput.amount / Math.pow(10, SOL_DECIMALS);
      console.log(`  Swap native input: ${swapAmount.toFixed(4)} SOL`);
      if (swapAmount > solValue) {
        solValue = swapAmount;
        traderWallet = swap.nativeInput.account || feePayer;
      }
    }

    if (swap.nativeOutput?.amount) {
      const swapAmount = swap.nativeOutput.amount / Math.pow(10, SOL_DECIMALS);
      console.log(`  Swap native output: ${swapAmount.toFixed(4)} SOL`);
      if (swapAmount > solValue) {
        solValue = swapAmount;
        traderWallet = swap.nativeOutput.account || feePayer;
      }
    }
  }

  console.log(`  Final SOL value: ${solValue.toFixed(4)} SOL`);
  console.log(`  Trader wallet: ${traderWallet?.substring(0, 8)}...`);

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
    console.log(`  ⚠️ No valid SOL value found in transaction`);
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

// ============================================
// DEBUG ENDPOINTS
// ============================================

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

app.get('/api/debug/cache', (req, res) => {
  const userWallets = Array.from(walletCache.entries())
      .filter(([_, data]) => data.isUserWallet).length;

  res.json({
    cacheSize: walletCache.size,
    userWallets,
    nonUserWallets: walletCache.size - userWallets,
    stats,
    reward: {
      currentRoundCreatorFees,
      rewardWalletBalance,
      startReward,
      currentRewardPool: calculateCurrentReward(),
      totalRewardsPaid,
      totalSupplyBurned,
    }
  });
});

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API v4 - Volume-Based Rewards',
    volumeUnit: 'SOL',
    feeDistribution: {
      treasury: '70%',
      rewardWallet: '20%',
      buybackBurn: '10% (minus 0.02 SOL for tx fees)',
    },
    rewardDistribution: {
      winner: '15% of reward wallet balance',
      nextRoundStartReward: '5% of reward wallet balance',
      initialStartReward: `${INITIAL_START_REWARD} SOL`,
    },
    features: [
      'Real-time volume tracking via Helius webhooks',
      'Automatic 15-minute round rotation',
      'Hall of Degens leaderboard',
      'Last 50 reward transactions with Solscan links',
      'Total rewards paid counter',
      'Supply burned counter',
      'On-chain wallet detection',
    ],
    endpoints: {
      health: 'GET /api/health',
      leaderboard: 'GET /api/leaderboard',
      rewardPool: 'GET /api/reward-pool',
      globalStats: 'GET /api/global-stats',
      hallOfDegens: 'GET /api/hall-of-degens',
      winners: 'GET /api/winners',
      burns: 'GET /api/burns',
      webhook: 'POST /api/webhook/transactions',
    },
    adminEndpoints: {
      endRound: 'POST /api/admin/end-round',
      trackFee: 'POST /api/admin/track-fee',
      updateSignature: 'POST /api/admin/update-signature',
      updateBurn: 'POST /api/admin/update-burn',
      setRewardBalance: 'POST /api/admin/set-reward-balance',
    }
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 VOLKING API v4 running on port ${PORT}`);
  console.log(`📊 Current round: ${roundNumber}`);
  console.log(`⏰ Round started: ${new Date(currentRoundStart).toISOString()}`);
  console.log(`💰 Start reward: ${startReward.toFixed(4)} SOL`);
  console.log(`\n📈 Fee Distribution:`);
  console.log(`   Treasury: ${TREASURY_PERCENTAGE * 100}%`);
  console.log(`   Reward Wallet: ${REWARD_WALLET_PERCENTAGE * 100}%`);
  console.log(`   Buyback & Burn: ${BUYBACK_BURN_PERCENTAGE * 100}%`);
  console.log(`\n🏆 Reward Distribution:`);
  console.log(`   Winner: ${WINNER_REWARD_PERCENTAGE * 100}% of reward wallet`);
  console.log(`   Next Start Reward: ${START_REWARD_PERCENTAGE * 100}% of reward wallet`);
  console.log(`\n✅ Configuration:`);
  console.log(`   Token: ${TOKEN_ADDRESS ? TOKEN_ADDRESS.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   Creator Fee Wallet: ${CREATOR_FEE_WALLET ? CREATOR_FEE_WALLET.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   Treasury: ${TREASURY_WALLET ? TREASURY_WALLET.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   Reward Wallet: ${REWARD_WALLET_PUBLIC ? REWARD_WALLET_PUBLIC.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log('');
});