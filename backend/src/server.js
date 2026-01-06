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
let roundTimerInterval = null;
let cacheCleanupInterval = null;

let systemActive = false; // System starts INACTIVE by default

// ============================================
// SYSTEM CONTROL FUNCTIONS
// ============================================

function startSystem() {
  if (systemActive) {
    console.log('⚠️  System is already active');
    return { success: false, message: 'System is already running' };
  }

  console.log('🟢 STARTING SYSTEM - All automated logic will now run');
  systemActive = true;

  // Initialize round start time
  roundState.currentRoundStart = getCurrentRoundStart();

  // Start all intervals
  startFeeClaimingInterval();
  startRoundTimer();
  startCacheCleanup();

  console.log('✅ System started successfully');
  console.log(`📊 Current round: ${roundState.roundNumber}`);
  console.log(`💰 Base reward: ${roundState.baseReward.toFixed(4)} SOL`);

  return {
    success: true,
    message: 'System started successfully',
    roundNumber: roundState.roundNumber,
    baseReward: roundState.baseReward
  };
}

function stopSystem() {
  if (!systemActive) {
    console.log('⚠️  System is already inactive');
    return { success: false, message: 'System is already stopped' };
  }

  console.log('🔴 STOPPING SYSTEM - All automated logic will halt');
  systemActive = false;

  // Stop all intervals
  stopFeeClaimingInterval();
  stopRoundTimer();
  stopCacheCleanup();

  console.log('✅ System stopped successfully - No wallet operations will execute');

  return {
    success: true,
    message: 'System stopped successfully - Emergency mode activated'
  };
}

function getSystemStatus() {
  return {
    active: systemActive,
    feeClaimingActive: feeClaimInterval !== null,
    roundTimerActive: roundTimerInterval !== null,
    cacheCleanupActive: cacheCleanupInterval !== null,
    currentRound: roundState.roundNumber,
    baseReward: roundState.baseReward,
    roundInProgress: roundState.roundInProgress
  };
}

// ============================================
// FEE CLAIMING INTERVAL
// ============================================

function startFeeClaimingInterval() {
  if (feeClaimInterval) {
    clearInterval(feeClaimInterval);
  }

  console.log('🔄 Starting fee claiming interval (every 1 minute)');

  feeClaimInterval = setInterval(async () => {
    // Check if system is active before executing
    if (!systemActive) {
      console.log('⏸️  System inactive - skipping fee claim');
      return;
    }

    if (!roundState.roundInProgress) {
      console.log('⚠️  Round not in progress, skipping fee claim');
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
    console.log('⏸️  Stopped fee claiming interval');
  }
}

// ============================================
// ROUND TIMER
// ============================================

function startRoundTimer() {
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
  }

  console.log('⏰ Starting round timer');

  roundTimerInterval = setInterval(async () => {
    // Check if system is active before executing
    if (!systemActive) {
      return; // Silent skip when inactive
    }

    const newRoundStart = getCurrentRoundStart();
    if (newRoundStart !== roundState.currentRoundStart) {
      console.log('\n⏰ Round timer triggered!');
      await handleRoundEnd(roundState, startFeeClaimingInterval, stopFeeClaimingInterval);
    }
  }, TIMING.ROUND_TIMER_INTERVAL);
}

function stopRoundTimer() {
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
    roundTimerInterval = null;
    console.log('⏸️  Stopped round timer');
  }
}

// ============================================
// CACHE CLEANUP
// ============================================

function startCacheCleanup() {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
  }

  console.log('🧹 Starting cache cleanup interval');

  cacheCleanupInterval = setInterval(() => {
    clearOldCacheEntries();
  }, TIMING.CACHE_CLEANUP_INTERVAL);
}

function stopCacheCleanup() {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
    console.log('⏸️  Stopped cache cleanup');
  }
}

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VOLKING API v6 - Automated Volume-Based Rewards with Admin Control',
    systemStatus: systemActive ? 'ACTIVE' : 'INACTIVE',
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
      systemActive: systemActive,
      feeClaiming: FEATURES.AUTO_CLAIM ? 'ENABLED (every 1 minute)' : 'DISABLED',
      feeDistribution: FEATURES.FEE_COLLECTION ? 'ENABLED' : 'DISABLED',
      rewardDistribution: FEATURES.REWARD_DISTRIBUTION ? 'ENABLED' : 'DISABLED',
      buybackBurn: FEATURES.BUYBACK_BURN ? 'ENABLED' : 'DISABLED',
    },
    features: [
      'Admin control to start/stop system',
      'Automatic fee claiming every 1 minute via PumpPortal (when active)',
      'Real-time reward pool updates',
      'Automatic fee distribution (70/15/5/10)',
      'Automatic reward to winner',
      'Automatic buyback & burn via Jupiter',
      'Real-time volume tracking via Helius webhooks',
      'Automatic 15-minute round rotation',
      'Emergency stop functionality',
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
      startSystem: 'POST /api/admin/start-system',
      stopSystem: 'POST /api/admin/stop-system',
      systemStatus: 'GET /api/admin/system-status',
      endRound: 'POST /api/admin/end-round',
      claimFees: 'POST /api/admin/claim-fees',
      updateSignature: 'POST /api/admin/update-signature',
      updateBurn: 'POST /api/admin/update-burn',
      setBaseReward: 'POST /api/admin/set-base-reward',
    }
  });
});

// Mount API routes - pass systemActive state
app.use('/api', createApiRoutes(roundState, () => systemActive));
app.use('/api/admin', createAdminRoutes(
    roundState,
    startFeeClaimingInterval,
    stopFeeClaimingInterval,
    { startSystem, stopSystem, getSystemStatus }
));
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

    console.log('✅ Server initialization complete');
    console.log('');
    console.log('🔴 SYSTEM IS INACTIVE - Waiting for admin to start');
    console.log('📝 Use POST /api/admin/start-system to begin operations');
    console.log('⚠️  No automated logic will run until system is started');
    console.log('');

    // DO NOT start any intervals here - wait for admin command

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
    console.log(`🔴 System Status: INACTIVE`);
    console.log(`📊 Current round: ${roundState.roundNumber}`);
    console.log(`💰 Base reward: ${roundState.baseReward.toFixed(4)} SOL`);
    console.log(`📈 Total rounds completed: ${roundState.totalRoundsCompleted}`);
    console.log(`💎 Total rewards paid: ${roundState.totalRewardsPaid.toFixed(4)} SOL`);
    console.log(`🔥 Total supply burned: ${roundState.totalSupplyBurned.toLocaleString()}`);
    console.log('');
    console.log('⚠️  IMPORTANT: System will NOT start automatically');
    console.log('👉 Use POST /api/admin/start-system to begin operations');
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
  stopRoundTimer();
  stopCacheCleanup();
  await db.closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  stopFeeClaimingInterval();
  stopRoundTimer();
  stopCacheCleanup();
  await db.closeDatabase();
  process.exit(0);
});