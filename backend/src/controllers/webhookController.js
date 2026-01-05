// ============================================
// FILE: src/controllers/webhookController.js - UPDATED WITH SYSTEM CHECK
// ============================================

import { processTransaction } from '../services/webhookProcessor.js';
import { calculateCurrentReward } from '../services/rewardService.js';

export function handleWebhook(roundState, getSystemActiveStatus) {
    return async (req, res) => {
        try {
            // Check if system is active
            const systemActive = getSystemActiveStatus();

            // Always respond with 200 to Helius to acknowledge receipt
            res.status(200).json({
                success: true,
                systemActive,
                message: systemActive ? 'Transaction processed' : 'System inactive - transaction ignored'
            });

            // Only process if system is active
            if (!systemActive) {
                console.log('⏸️  Webhook received but system is INACTIVE - transaction ignored');
                return;
            }

            const shouldLog = Math.random() < 0.01;

            if (shouldLog) {
                console.log('📨 Webhook received! (sampled log)');
            }

            const transactions = Array.isArray(req.body) ? req.body : [req.body];

            let totalProcessed = 0;
            let totalExcluded = 0;

            for (const tx of transactions) {
                const result = await processTransaction(tx, roundState);
                totalProcessed += result.processed;
                totalExcluded += result.excluded;
            }

            if (shouldLog) {
                console.log(`✅ Traders: ${roundState.volumeData.size}, SOL volume: ${roundState.stats.totalSolVolume.toFixed(4)}, Reward pool: ${calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees).toFixed(4)}`);
            }

        } catch (error) {
            console.error('❌ Error:', error);
            // Already sent 200 response, so don't send another
        }
    };
}