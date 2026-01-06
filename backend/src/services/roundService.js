import * as db from './database.js';
import { claimCreatorFeesViaPumpPortal } from './feeService.js';
import { distributeFees } from './distributionService.js';
import { calculateCurrentReward, sendRewardToWinner } from './rewardService.js';
import { executeBuybackAndBurn } from './buybackService.js';
import { FEATURES } from '../config/features.js';
import { FEE_DISTRIBUTION } from '../config/constants.js';

export async function handleRoundEnd(roundState, startFeeClaimingInterval, stopFeeClaimingInterval) {
    console.log('\n🎊 ===== ROUND END =====\n');
    console.log(`Round ${roundState.roundNumber} ending...`);

    roundState.roundInProgress = false;
    stopFeeClaimingInterval();

    console.log('⏳ Waiting for final trades to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n💰 Final fee claim...');
    const finalClaimResult = await claimCreatorFeesViaPumpPortal();
    if (finalClaimResult.success && finalClaimResult.amount > 0) {
        roundState.claimedCreatorFees += finalClaimResult.amount;
        roundState.stats.feesClaimedCount++;
    }

    console.log(`\n📊 Round Summary:`);
    console.log(`   Total fees claimed: ${roundState.claimedCreatorFees.toFixed(4)} SOL`);
    console.log(`   Base reward: ${roundState.baseReward.toFixed(4)} SOL`);
    console.log(`   Total reward pool: ${calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees).toFixed(4)} SOL`);

    const winner = roundState.getCurrentWinner();
    const roundStartTime = roundState.currentRoundStart;

    const fifteenPercentOfFees = roundState.claimedCreatorFees * FEE_DISTRIBUTION.WINNER_REWARD;
    const fivePercentOfFees = roundState.claimedCreatorFees * FEE_DISTRIBUTION.NEXT_ROUND_BASE;
    const winnerReward = roundState.baseReward + fifteenPercentOfFees;

    console.log(`\n💰 Reward Breakdown:`);
    console.log(`   Base Reward: ${roundState.baseReward.toFixed(4)} SOL`);
    console.log(`   15% of Fees: ${fifteenPercentOfFees.toFixed(4)} SOL`);
    console.log(`   TOTAL Winner Reward: ${winnerReward.toFixed(4)} SOL`);
    console.log(`   Next Round Base (5% of fees): ${fivePercentOfFees.toFixed(4)} SOL`);

    if (!winner) {
        console.log('⚪ No trades this round, no winner');

        if (FEATURES.FEE_COLLECTION && roundState.claimedCreatorFees > 0) {
            console.log('\n📤 Distributing fees...');
            const distribution = await distributeFees(roundState.claimedCreatorFees);

            if (!distribution || !distribution.success) {
                console.log('❌ Fee distribution failed - round cannot complete');
                console.log('   Reason:', distribution?.error || 'Unknown error');
                console.log('⚠️  ROUND PAUSED - Admin must verify transactions and manually start next round');
                return {
                    error: 'Fee distribution failed',
                    distribution,
                    nextBaseReward: fivePercentOfFees,
                };
            }

            console.log('⏳ Waiting for distribution transactions to confirm...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            console.log('✅ Fee distribution confirmed on-chain');
        }

        roundState.baseReward = fivePercentOfFees;
        roundState.totalRoundsCompleted++;
        roundState.roundNumber++;

        await db.updateGlobalStats({
            totalRoundsCompleted: roundState.totalRoundsCompleted,
            totalRewardsPaid: roundState.totalRewardsPaid,
            totalSupplyBurned: roundState.totalSupplyBurned,
            currentRoundNumber: roundState.roundNumber,
            rewardWalletBalance: roundState.baseReward,
            startReward: roundState.baseReward,
        });

        roundState.resetForNewRound(false);

        console.log('\n✅ Round complete - Ready to start next round');
        console.log('⚠️  Next round will NOT start automatically');
        console.log('📌 Admin must manually start next round after verifying all transactions');

        return {
            success: true,
            noWinner: true,
            nextBaseReward: roundState.baseReward,
            readyForNextRound: true,
        };
    }

    console.log(`\n🏆 Winner: ${winner.wallet.substring(0, 8)}...`);
    console.log(`   Volume: ${winner.volume.toFixed(4)} SOL`);
    console.log(`   Reward: ${winnerReward.toFixed(4)} SOL`);

    let distribution = null;
    if (FEATURES.FEE_COLLECTION && roundState.claimedCreatorFees > 0) {
        console.log('\n📤 Distributing fees...');
        distribution = await distributeFees(roundState.claimedCreatorFees);

        if (!distribution || !distribution.success) {
            console.log('❌ Fee distribution failed - round cannot complete properly');
            console.log('   Reason:', distribution?.error || 'Unknown error');
            console.log('⚠️  ROUND PAUSED - Admin must verify transactions and manually start next round');
            return {
                error: 'Fee distribution failed',
                winner: winner.wallet,
                winnerVolume: winner.volume,
                winnerReward,
                distribution,
                nextBaseReward: fivePercentOfFees,
            };
        }

        console.log('⏳ Waiting for distribution transactions to confirm...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('✅ Fee distribution confirmed on-chain');
    }

    let rewardSignature = null;
    if (FEATURES.REWARD_DISTRIBUTION && winnerReward >= 0.001) {
        console.log('\n💸 Sending reward to winner...');
        const rewardResult = await sendRewardToWinner(winner.wallet, winnerReward);

        if (rewardResult.success && rewardResult.signature) {
            rewardSignature = rewardResult.signature;
            console.log(`   ✅ Reward sent on-chain!`);
            console.log(`   🔗 Transaction: ${rewardSignature}`);
        } else {
            console.log(`   ❌ Reward NOT sent on-chain!`);
            console.log(`   Reason: ${rewardResult.error || 'Unknown error'}`);
        }
    }

    if (!rewardSignature) {
        console.log('\n❌ Cannot record winner without valid reward signature');
        console.log('   Please manually send reward and update database');
        console.log('⚠️  ROUND PAUSED - Admin must verify transactions and manually start next round');

        roundState.baseReward = fivePercentOfFees;
        roundState.totalRoundsCompleted++;
        roundState.roundNumber++;

        await db.updateGlobalStats({
            totalRoundsCompleted: roundState.totalRoundsCompleted,
            totalRewardsPaid: roundState.totalRewardsPaid,
            totalSupplyBurned: roundState.totalSupplyBurned,
            currentRoundNumber: roundState.roundNumber,
            rewardWalletBalance: roundState.baseReward,
            startReward: roundState.baseReward,
        });

        roundState.resetForNewRound(true);

        return {
            error: 'Reward not sent',
            winner: winner.wallet,
            winnerVolume: winner.volume,
            winnerReward,
            distribution,
            nextBaseReward: roundState.baseReward,
        };
    }

    console.log('\n⏳ Waiting for reward transaction to confirm...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    let burnResult = { success: false, tokensBurned: 0 };
    if (FEATURES.BUYBACK_BURN && distribution && distribution.success && distribution.buybackBurn > 0) {
        console.log('\n🔥 Executing buyback & burn...');
        burnResult = await executeBuybackAndBurn(distribution.buybackBurn);

        if (burnResult.success && burnResult.tokensBurned > 0) {
            await db.saveBurn({
                amountSOL: distribution.buybackBurn,
                tokensBurned: burnResult.tokensBurned,
                signature: burnResult.burnSignature || burnResult.swapSignature,
                roundNumber: roundState.roundNumber,
                timestamp: Date.now(),
            });

            roundState.totalSupplyBurned += burnResult.tokensBurned;

            console.log(`   ✅ Buyback & burn complete!`);
            console.log(`   🔗 Swap signature: ${burnResult.swapSignature}`);
            if (burnResult.burnSignature) {
                console.log(`   🔗 Burn signature: ${burnResult.burnSignature}`);
            }
        } else {
            console.log(`   ❌ Buyback & burn failed: ${burnResult.error || 'Unknown error'}`);
        }
    }

    await db.saveWinner({
        wallet: winner.wallet,
        volume: winner.volume,
        reward: winnerReward,
        signature: rewardSignature,
        roundNumber: roundState.roundNumber,
        roundStart: roundStartTime,
        timestamp: Date.now(),
    });

    await db.saveRewardTransfer({
        wallet: winner.wallet,
        amount: winnerReward,
        signature: rewardSignature,
        roundNumber: roundState.roundNumber,
        roundStart: roundStartTime,
        timestamp: Date.now(),
    });

    roundState.totalRewardsPaid += winnerReward;

    console.log(`🏆 Winner recorded: ${winner.wallet.substring(0, 8)}... with ${winner.volume.toFixed(4)} SOL volume, reward: ${winnerReward.toFixed(4)} SOL`);
    console.log(`💰 Total rewards paid all-time: ${roundState.totalRewardsPaid.toFixed(4)} SOL`);

    roundState.baseReward = fivePercentOfFees;
    roundState.totalRoundsCompleted++;

    await db.updateGlobalStats({
        totalRoundsCompleted: roundState.totalRoundsCompleted,
        totalRewardsPaid: roundState.totalRewardsPaid,
        totalSupplyBurned: roundState.totalSupplyBurned,
        currentRoundNumber: roundState.roundNumber + 1,
        rewardWalletBalance: roundState.baseReward,
        startReward: roundState.baseReward,
    });

    roundState.roundNumber++;

    console.log(`\n✅ Round ${roundState.roundNumber - 1} complete!`);
    console.log(`   Winner reward sent: ${winnerReward.toFixed(4)} SOL`);
    console.log(`   🔗 Reward signature: ${rewardSignature}`);
    console.log(`   Next round base reward: ${roundState.baseReward.toFixed(4)} SOL`);
    if (burnResult.success) {
        console.log(`   Tokens burned: ${burnResult.tokensBurned.toLocaleString()}`);
    }

    roundState.resetForNewRound(true);

    console.log('\n⚠️  Next round will NOT start automatically');
    console.log('📌 Admin must manually start next round after verifying all transactions');

    return {
        success: true,
        winner: winner.wallet,
        winnerVolume: winner.volume,
        winnerReward,
        rewardSignature,
        distribution,
        burnResult,
        nextBaseReward: roundState.baseReward,
        readyForNextRound: true,
    };
}