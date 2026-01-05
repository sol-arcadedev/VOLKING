import { transferSOL } from './transactionService.js';
import { getKeypairFromPrivateKey } from './walletService.js';
import { ENV } from '../config/env.js';
import { FEE_DISTRIBUTION, BLOCKCHAIN } from '../config/constants.js';

export async function distributeFees(totalFees) {
    if (totalFees <= 0) {
        console.log('⚠️ No fees to distribute');
        return null;
    }

    console.log(`\n📊 Distributing ${totalFees.toFixed(4)} SOL in fees...`);

    const distribution = {
        treasury: totalFees * FEE_DISTRIBUTION.TREASURY,
        nextRoundBase: totalFees * FEE_DISTRIBUTION.NEXT_ROUND_BASE,
        buybackBurn: Math.max(0, (totalFees * FEE_DISTRIBUTION.BUYBACK_BURN) - BLOCKCHAIN.MIN_SOL_FOR_FEES),
        winnerAmount: totalFees * FEE_DISTRIBUTION.WINNER_REWARD,
        signatures: {},
        success: false,
    };

    console.log(`   Treasury (70%): ${distribution.treasury.toFixed(4)} SOL`);
    console.log(`   Next Round Base (5%): ${distribution.nextRoundBase.toFixed(4)} SOL`);
    console.log(`   Winner Amount (15%): ${distribution.winnerAmount.toFixed(4)} SOL`);
    console.log(`   Buyback & Burn (10% - fees): ${distribution.buybackBurn.toFixed(4)} SOL`);

    const creatorKeypair = getKeypairFromPrivateKey(ENV.CREATOR_FEE_WALLET_PRIVATE);

    if (!creatorKeypair) {
        console.log('❌ Creator fee wallet keypair not configured - CANNOT distribute fees');
        distribution.error = 'Creator fee wallet keypair not configured';
        return distribution;
    }

    if (!ENV.TREASURY_WALLET) {
        console.log('❌ Treasury wallet not configured - CANNOT distribute fees');
        distribution.error = 'Treasury wallet not configured';
        return distribution;
    }

    if (!ENV.REWARD_WALLET_PUBLIC) {
        console.log('❌ Reward wallet not configured - CANNOT distribute fees');
        distribution.error = 'Reward wallet not configured';
        return distribution;
    }

    try {
        if (distribution.treasury > 0.001) {
            console.log(`\n   Transferring ${distribution.treasury.toFixed(4)} SOL to Treasury...`);
            distribution.signatures.treasury = await transferSOL(
                creatorKeypair,
                ENV.TREASURY_WALLET,
                distribution.treasury
            );

            if (!distribution.signatures.treasury) {
                throw new Error('Treasury transfer failed - no signature returned');
            }
        } else {
            console.log('⚠️ Treasury amount too small to transfer');
        }

        if (distribution.nextRoundBase > 0.001) {
            console.log(`\n   Transferring ${distribution.nextRoundBase.toFixed(4)} SOL to Reward Wallet (next round base)...`);
            distribution.signatures.rewardWallet = await transferSOL(
                creatorKeypair,
                ENV.REWARD_WALLET_PUBLIC,
                distribution.nextRoundBase
            );

            if (!distribution.signatures.rewardWallet) {
                throw new Error('Reward wallet transfer failed - no signature returned');
            }
        } else {
            console.log('⚠️ Reward wallet amount too small to transfer');
        }

        if (distribution.buybackBurn > 0.001) {
            console.log(`\n   💰 ${distribution.buybackBurn.toFixed(4)} SOL reserved for Buyback & Burn (stays in creator fee wallet)`);
        }

        distribution.success = true;
        console.log('\n✅ Fee distribution complete!');
        console.log(`   🔍 Treasury signature: ${distribution.signatures.treasury}`);
        console.log(`   🔍 Reward wallet signature: ${distribution.signatures.rewardWallet}`);

        return distribution;
    } catch (error) {
        console.error('❌ Error during fee distribution:', error.message);
        distribution.error = error.message;
        distribution.success = false;
        return distribution;
    }
}