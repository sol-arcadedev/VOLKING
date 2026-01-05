import { VersionedTransaction } from '@solana/web3.js';
import { connection } from './solana.js';
import { getKeypairFromPrivateKey, getWalletBalance } from './walletService.js';
import { ENV } from '../config/env.js';
import { FEATURES } from '../config/features.js';
import { API_ENDPOINTS } from '../config/constants.js';

export async function claimCreatorFeesViaPumpPortal() {
    if (!FEATURES.FEE_COLLECTION || !FEATURES.AUTO_CLAIM) {
        console.log('⚠️ Fee collection or auto-claim disabled');
        return { success: false, amount: 0 };
    }

    if (!ENV.CREATOR_FEE_WALLET || !ENV.CREATOR_FEE_WALLET_PRIVATE) {
        console.log('⚠️ Creator fee wallet not configured');
        return { success: false, amount: 0 };
    }

    try {
        console.log('\n💰 Claiming creator fees via PumpPortal...');

        const balanceBefore = await getWalletBalance(ENV.CREATOR_FEE_WALLET);

        const response = await fetch(API_ENDPOINTS.PUMP_PORTAL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicKey: ENV.CREATOR_FEE_WALLET,
                action: 'collectCreatorFee',
                priorityFee: 0.000001,
            })
        });

        if (response.status !== 200) {
            const errorText = await response.text();
            console.log(`   ⚠️ PumpPortal API error: ${response.status} - ${errorText}`);
            return { success: false, amount: 0, error: errorText };
        }

        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));

        const signerKeyPair = getKeypairFromPrivateKey(ENV.CREATOR_FEE_WALLET_PRIVATE);
        if (!signerKeyPair) {
            throw new Error('Failed to create keypair from private key');
        }

        tx.sign([signerKeyPair]);

        const signature = await connection.sendTransaction(tx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
        });

        await connection.confirmTransaction(signature, 'confirmed');

        console.log(`   ✅ Fee claim transaction: https://solscan.io/tx/${signature}`);
        console.log(`   🔍 Signature: ${signature}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const balanceAfter = await getWalletBalance(ENV.CREATOR_FEE_WALLET);
        const claimedAmount = Math.max(0, balanceAfter - balanceBefore);

        console.log(`   💵 Balance before: ${balanceBefore.toFixed(4)} SOL`);
        console.log(`   💵 Balance after: ${balanceAfter.toFixed(4)} SOL`);
        console.log(`   💵 Claimed: ${claimedAmount.toFixed(4)} SOL`);

        return { success: true, amount: claimedAmount, signature };
    } catch (error) {
        console.error('❌ Error claiming fees:', error);
        return { success: false, amount: 0, error: error.message };
    }
}
