
import { processTransaction } from '../services/webhookProcessor.js';
import { calculateCurrentReward } from '../services/rewardService.js';

export function handleWebhook(roundState) {
    return async (req, res) => {
        try {
            const shouldLog = Math.random() < 0.01;

            if (shouldLog) {
                console.log('🔨 Webhook received! (sampled log)');
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

            res.status(200).json({
                success: true,
                processed: totalProcessed,
                excluded: totalExcluded,
                traders: roundState.volumeData.size,
                currentRewardPool: calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees),
            });
        } catch (error) {
            console.error('❌ Error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}