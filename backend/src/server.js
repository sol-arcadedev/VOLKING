// ============================================
// FILE: src/server.js - MAIN ENTRY POINT
// ============================================

import express from 'express';
import cors from 'cors';

// Config imports
import { ENV, validateConfig } from './config/env.js';
import { FEATURES, logFeatures } from './config/features.js';
import { corsOptions } from './config/cors.js';
import { TIMING } from './config/constants.js';

// Service imports
import * as db from './services/database.js';
import { getCurrentRoundStart } from './services/solana.js';
import { claimCreatorFeesViaPumpPortal } from './services/feeService.js';
import { handleRoundEnd } from './services/roundService.js';
import { clearOldCacheEntries, getWalletCache } from './services/walletService.js';
import { calculateCurrentReward } from './services/rewardService.js';

// Model imports
import { RoundState } from './models/RoundState.js';

// Route imports
import { createApiRoutes } from './routes/api.js';
import { createAdminRoutes } from './routes/admin.js';
import { createDebugRoutes } from './routes/debug.js';

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
const PORT = ENV.PORT;

// Middleware
app.use(cors(corsOptions));
app.options('*', cors());
app.use(express.json());

// ============================================
// GLOBAL STATE
// ============================================

const roundState = new RoundState();
let feeClaimInterval = null;

// ============================================
// FEE CLAIMING INTERVAL
// ============================================

function startFeeClaimingInterval() {
  if (feeClaimInterval) {
    clearInterval(feeClaimInterval);
  }

  console.log('🔄 Starting fee claiming interval (every 1 minute)');

  feeClaimInterval = setInterval(async () => {
    if (!roundState.roundInProgress) {
      console.log('⚠️ Round not in progress, skipping fee claim');
      return;
    }

    const result = await claimCreatorFeesViaPumpPortal();

    if (result.success && result.amount > 0) {
      roundState.claimedCreatorFees += result.amount;
      roundState.stats.feesClaimedCount++;

      console.log(`📊 Total claimed fees this round: ${roundState.claimedCreatorFees.toFixed(4)} SOL`);
      console.log(`💰 Current reward pool: ${calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees).toFixed(4)} SOL`);
    }
  }, TIMING.FEE_CLAIM_INTERVAL);
}

function stopFeeClaimingInterval() {
  if (feeClaimInterval) {
    clearInterval(feeClaimInterval);
    feeClaimInterval = null;
    console.log('⸮️  Stopped fee claiming interval');
  }
}

// ============================================
// ROUND TIMER
// ============================================

function startRoundTimer() {
  setInterval(async () => {
    const newRoundStart = getCurrentRoundStart();
    if (newRoundStart !== roundState.currentRoundStart) {
      console.log('\n⏰ Round timer triggered!');
      await handleRoundEnd(roundState, startFeeClaimingInterval, stopFeeClaimingInterval);
    }
  }, TIMING.ROUND_TIMER_INTERVAL);
}

// ============================================
// CACHE CLEANUP
// ============================================

function startCacheCleanup() {
  setInterval(() => {
    clearOldCacheEntries();
  }, TIMING.CACHE_CLEANUP_INTERVAL);
}

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API v6 - Automated Volume-Based Rewards with Minute-by-Minute Fee Claiming',
    volumeUnit: 'SOL',
    feeDistribution: {
      treasury: '70%',
      winnerReward: '15% of claimed fees',
      nextRoundBase: '5% of claimed fees',
      buybackBurn: '10% (minus 0.02 SOL for tx fees)',
    },
    rewardCalculation: {
      formula: 'Base Reward + (15% of Claimed Fees)',
      baseReward: 'Reward wallet balance at round start (5% from previous round)',
      claimedFees: 'Accumulated every 1 minute during round',
    },
    automation: {
      feeClaiming: FEATURES.AUTO_CLAIM ? 'ENABLED (every 1 minute)' : 'DISABLED',
      feeDistribution: FEATURES.FEE_COLLECTION ? 'ENABLED' : 'DISABLED',
      rewardDistribution: FEATURES.REWARD_DISTRIBUTION ? 'ENABLED' : 'DISABLED',
      buybackBurn: FEATURES.BUYBACK_BURN ? 'ENABLED' : 'DISABLED',
    },
    features: [
      'Automatic fee claiming every 1 minute via PumpPortal',
      'Real-time reward pool updates',
      'Automatic fee distribution (70/15/5/10)',
      'Automatic reward to winner',
      'Automatic buyback & burn via Jupiter',
      'Real-time volume tracking via Helius webhooks',
      'Automatic 15-minute round rotation',
      'Next round starts after all rewards distributed',
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
      claimFees: 'POST /api/admin/claim-fees',
      updateSignature: 'POST /api/admin/update-signature',
      updateBurn: 'POST /api/admin/update-burn',
      setBaseReward: 'POST /api/admin/set-base-reward',
    }
  });
});

// Mount API routes
app.use('/api', createApiRoutes(roundState));
app.use('/api/admin', createAdminRoutes(roundState, startFeeClaimingInterval, stopFeeClaimingInterval));
app.use('/api/debug', createDebugRoutes(roundState));

// ============================================
// SERVER INITIALIZATION
// ============================================

async function initializeServer() {
  try {
    console.log('🚀 Initializing VOLKING server...');

    logFeatures();
    validateConfig();

    await db.initializeDatabase();

    const globalStats = await db.getGlobalStats();
    roundState.loadFromDatabase(globalStats);

    if (globalStats) {
      console.log('✅ State loaded from database:');
      console.log(`   Rounds completed: ${roundState.totalRoundsCompleted}`);
      console.log(`   Total rewards paid: ${roundState.totalRewardsPaid.toFixed(4)} SOL`);
      console.log(`   Total supply burned: ${roundState.totalSupplyBurned.toLocaleString()}`);
      console.log(`   Current round: ${roundState.roundNumber}`);
      console.log(`   Base reward: ${roundState.baseReward.toFixed(4)} SOL`);
    }

    roundState.currentRoundStart = getCurrentRoundStart();

    console.log('✅ Server initialization complete');

    startFeeClaimingInterval();
    startRoundTimer();
    startCacheCleanup();

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// ============================================
// START SERVER
// ============================================

initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 VOLKING API running on port ${PORT}`);
    console.log(`📊 Current round: ${roundState.roundNumber}`);
    console.log(`💰 Base reward: ${roundState.baseReward.toFixed(4)} SOL`);
    console.log(`📈 Total rounds completed: ${roundState.totalRoundsCompleted}`);
    console.log(`💎 Total rewards paid: ${roundState.totalRewardsPaid.toFixed(4)} SOL`);
    console.log(`🔥 Total supply burned: ${roundState.totalSupplyBurned.toLocaleString()}`);
    console.log(`🔄 Fee claiming: Every 1 minute`);
    console.log('');
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  stopFeeClaimingInterval();
  await db.closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  stopFeeClaimingInterval();
  await db.closeDatabase();
  process.exit(0);
});