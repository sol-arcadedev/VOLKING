// backend/services/database.js
// PostgreSQL persistence for VOLKING

import pkg from 'pg';
const { Pool } = pkg;

// ============================================
// DATABASE CONNECTION
// ============================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ Database connected');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
});

// ============================================
// INITIALIZE DATABASE SCHEMA
// ============================================

export async function initializeDatabase() {
    const client = await pool.connect();

    try {
        console.log('🔧 Initializing database schema...');

        await client.query('BEGIN');

        // Table 1: Round winners (every round win recorded)
        await client.query(`
      CREATE TABLE IF NOT EXISTS round_winners (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(44) NOT NULL,
        volume DECIMAL(20, 9) NOT NULL,
        reward DECIMAL(20, 9) NOT NULL,
        signature VARCHAR(128),
        round_number INTEGER NOT NULL,
        round_start BIGINT NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_winners_wallet 
      ON round_winners(wallet);
    `);

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_winners_round 
      ON round_winners(round_number);
    `);

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_winners_timestamp 
      ON round_winners(timestamp DESC);
    `);

        // Table 2: Global stats (single row with totals)
        await client.query(`
      CREATE TABLE IF NOT EXISTS global_stats (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_rounds_completed INTEGER DEFAULT 0,
        total_rewards_paid DECIMAL(20, 9) DEFAULT 0,
        total_supply_burned DECIMAL(20, 9) DEFAULT 0,
        current_round_number INTEGER DEFAULT 1,
        reward_wallet_balance DECIMAL(20, 9) DEFAULT 0,
        start_reward DECIMAL(20, 9) DEFAULT 0.2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (id = 1)
      );
    `);

        await client.query(`
      INSERT INTO global_stats (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `);

        // Table 3: Burn history
        await client.query(`
      CREATE TABLE IF NOT EXISTS burn_history (
        id SERIAL PRIMARY KEY,
        amount_sol DECIMAL(20, 9) NOT NULL,
        tokens_burned BIGINT DEFAULT 0,
        signature VARCHAR(128),
        round_number INTEGER NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Table 4: Reward transfers (for display)
        await client.query(`
      CREATE TABLE IF NOT EXISTS reward_transfers (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(44) NOT NULL,
        amount DECIMAL(20, 9) NOT NULL,
        signature VARCHAR(128),
        round_number INTEGER NOT NULL,
        round_start BIGINT NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_timestamp 
      ON reward_transfers(timestamp DESC);
    `);

        await client.query('COMMIT');

        console.log('✅ Database schema initialized successfully');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// ============================================
// WINNER OPERATIONS
// ============================================

export async function saveWinner(winnerData) {
    const { wallet, volume, reward, signature, roundNumber, roundStart, timestamp } = winnerData;

    try {
        const result = await pool.query(
            `INSERT INTO round_winners 
       (wallet, volume, reward, signature, round_number, round_start, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
            [wallet, volume, reward, signature, roundNumber, roundStart, timestamp]
        );

        console.log(`💾 Winner saved: ${wallet.substring(0, 8)}... (DB ID: ${result.rows[0].id})`);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error saving winner:', error);
        throw error;
    }
}

export async function getAllWinners() {
    try {
        const result = await pool.query(
            'SELECT * FROM round_winners ORDER BY timestamp DESC LIMIT 100'
        );
        return result.rows;
    } catch (error) {
        console.error('❌ Error fetching winners:', error);
        return [];
    }
}

export async function getWinnerHistory(limit = 50) {
    const result = await pool.query(
        'SELECT * FROM round_winners ORDER BY timestamp DESC LIMIT $1',
        [limit]
    );
    return result.rows;
}

// ============================================
// HALL OF DEGENS (Aggregated Stats)
// ============================================

export async function getHallOfDegens() {
    try {
        const result = await pool.query(`
      SELECT 
        wallet,
        COUNT(*) as total_wins,
        SUM(reward) as total_rewards,
        SUM(volume) as total_volume,
        MAX(timestamp) as last_win
      FROM round_winners
      GROUP BY wallet
      ORDER BY total_wins DESC, total_rewards DESC
      LIMIT 1000
    `);

        return result.rows.map((row, index) => ({
            wallet: row.wallet,
            totalWins: parseInt(row.total_wins),
            totalRewards: parseFloat(row.total_rewards),
            totalVolume: parseFloat(row.total_volume),
            lastWin: parseInt(row.last_win),
            rank: index + 1,
        }));
    } catch (error) {
        console.error('❌ Error fetching Hall of Degens:', error);
        return [];
    }
}

// ============================================
// GLOBAL STATS OPERATIONS
// ============================================

export async function getGlobalStats() {
    try {
        const result = await pool.query('SELECT * FROM global_stats WHERE id = 1');
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error fetching global stats:', error);
        return null;
    }
}

export async function updateGlobalStats(stats) {
    try {
        const {
            totalRoundsCompleted,
            totalRewardsPaid,
            totalSupplyBurned,
            currentRoundNumber,
            rewardWalletBalance,
            startReward,
        } = stats;

        await pool.query(
            `UPDATE global_stats 
       SET total_rounds_completed = $1,
           total_rewards_paid = $2,
           total_supply_burned = $3,
           current_round_number = $4,
           reward_wallet_balance = $5,
           start_reward = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
            [
                totalRoundsCompleted,
                totalRewardsPaid,
                totalSupplyBurned,
                currentRoundNumber,
                rewardWalletBalance,
                startReward,
            ]
        );

        console.log('💾 Global stats updated');
    } catch (error) {
        console.error('❌ Error updating global stats:', error);
        throw error;
    }
}

// ============================================
// BURN HISTORY OPERATIONS
// ============================================

export async function saveBurn(burnData) {
    const { amountSOL, tokensBurned, signature, roundNumber, timestamp } = burnData;

    try {
        await pool.query(
            `INSERT INTO burn_history 
       (amount_sol, tokens_burned, signature, round_number, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
            [amountSOL, tokensBurned, signature, roundNumber, timestamp]
        );

        if (tokensBurned > 0) {
            await pool.query(
                `UPDATE global_stats 
         SET total_supply_burned = total_supply_burned + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
                [tokensBurned]
            );
        }

        console.log(`💾 Burn saved: ${tokensBurned} tokens`);
    } catch (error) {
        console.error('❌ Error saving burn:', error);
        throw error;
    }
}

export async function getBurnHistory(limit = 50) {
    try {
        const result = await pool.query(
            'SELECT * FROM burn_history ORDER BY timestamp DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('❌ Error fetching burn history:', error);
        return [];
    }
}

// ============================================
// REWARD TRANSFERS OPERATIONS
// ============================================

export async function saveRewardTransfer(transferData) {
    const { wallet, amount, signature, roundNumber, roundStart, timestamp } = transferData;

    try {
        await pool.query(
            `INSERT INTO reward_transfers 
       (wallet, amount, signature, round_number, round_start, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [wallet, amount, signature, roundNumber, roundStart, timestamp]
        );

        // Keep only last 100 transfers
        await pool.query(`
      DELETE FROM reward_transfers
      WHERE id NOT IN (
        SELECT id FROM reward_transfers
        ORDER BY timestamp DESC
        LIMIT 100
      )
    `);

        console.log(`💾 Reward transfer saved: ${wallet.substring(0, 8)}...`);
    } catch (error) {
        console.error('❌ Error saving reward transfer:', error);
        throw error;
    }
}

export async function getRewardTransfers(limit = 50) {
    try {
        const result = await pool.query(
            'SELECT * FROM reward_transfers ORDER BY timestamp DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('❌ Error fetching reward transfers:', error);
        return [];
    }
}

// ============================================
// ADMIN UTILITY OPERATIONS
// ============================================

export async function updateWinnerSignature(wallet, roundStart, signature) {
    try {
        await pool.query(
            `UPDATE round_winners 
       SET signature = $1 
       WHERE wallet = $2 AND round_start = $3`,
            [signature, wallet, roundStart]
        );

        await pool.query(
            `UPDATE reward_transfers 
       SET signature = $1 
       WHERE wallet = $2 AND round_start = $3`,
            [signature, wallet, roundStart]
        );

        console.log(`💾 Signature updated for ${wallet.substring(0, 8)}...`);
    } catch (error) {
        console.error('❌ Error updating signature:', error);
        throw error;
    }
}

export async function updateBurnSignature(roundNumber, tokensBurned, signature) {
    try {
        await pool.query(
            `UPDATE burn_history 
       SET tokens_burned = $1, signature = $2 
       WHERE round_number = $3`,
            [tokensBurned, signature, roundNumber]
        );

        // Recalculate total burned
        const result = await pool.query(
            'SELECT SUM(tokens_burned) as total FROM burn_history'
        );

        const totalBurned = parseFloat(result.rows[0].total || 0);

        await pool.query(
            'UPDATE global_stats SET total_supply_burned = $1 WHERE id = 1',
            [totalBurned]
        );

        console.log(`💾 Burn updated for round ${roundNumber}`);
    } catch (error) {
        console.error('❌ Error updating burn:', error);
        throw error;
    }
}

// ============================================
// DATABASE HEALTH CHECK
// ============================================

export async function checkDatabaseHealth() {
    try {
        const result = await pool.query('SELECT NOW() as timestamp, version() as version');
        return {
            healthy: true,
            timestamp: result.rows[0].timestamp,
            version: result.rows[0].version
        };
    } catch (error) {
        console.error('❌ Database health check failed:', error);
        return { healthy: false, error: error.message };
    }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

export async function closeDatabase() {
    try {
        await pool.end();
        console.log('👋 Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database:', error);
    }
}

// Handle process termination
process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);