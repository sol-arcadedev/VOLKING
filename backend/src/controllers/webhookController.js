// ============================================
// FILE: src/controllers/webhookController.js - SIMPLE LOGGING VERSION
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

            // Log basic webhook info - ALWAYS shown
            const transactions = Array.isArray(req.body) ? req.body : [req.body];
            const txCount = transactions.length;
            const timestamp = new Date().toLocaleTimeString();

            // Get signature from first transaction
            const signature = transactions[0]?.signature || 'unknown';
            const shortSig = signature.length > 16 ? `${signature.substring(0, 8)}...${signature.substring(signature.length - 8)}` : signature;

            console.log(`📨 [${timestamp}] Webhook received: ${txCount} tx | System: ${systemActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
            console.log(`   🔗 Signature: ${shortSig}`);
            console.log(`   🔍 Solscan: https://solscan.io/tx/${signature}`);

            // Only process if system is active
            if (!systemActive) {
                console.log('   ⏸️  Transaction ignored - system inactive');
                return;
            }

            let totalProcessed = 0;
            let totalExcluded = 0;

            for (const tx of transactions) {
                const result = await processTransaction(tx, roundState);
                totalProcessed += result.processed;
                totalExcluded += result.excluded;
            }

            // Show result if any transactions were processed or excluded
            if (totalProcessed > 0 || totalExcluded > 0) {
                console.log(`   ✅ Processed: ${totalProcessed} | Excluded: ${totalExcluded} | Traders: ${roundState.volumeData.size} | Volume: ${roundState.stats.totalSolVolume.toFixed(4)} SOL`);
            } else {
                console.log('   ⏭️  No relevant transactions found');
            }

        } catch (error) {
            console.error('❌ Webhook error:', error.message);
            // Already sent 200 response, so don't send another
        }
    };
}