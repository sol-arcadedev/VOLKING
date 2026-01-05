import { PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from './solana.js';

export async function transferSOL(fromKeypair, toAddress, amountSOL) {
    if (!fromKeypair || !toAddress || amountSOL <= 0) {
        throw new Error('Invalid transfer parameters');
    }

    try {
        const toPubkey = new PublicKey(toAddress);
        const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

        console.log(`   💸 Initiating transfer: ${amountSOL.toFixed(4)} SOL to ${toAddress.substring(0, 8)}...`);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toPubkey,
                lamports: lamports,
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [fromKeypair],
            { commitment: 'confirmed' }
        );

        console.log(`   ✅ Transfer confirmed: ${amountSOL.toFixed(4)} SOL to ${toAddress.substring(0, 8)}...`);
        console.log(`   🔍 Signature: ${signature}`);

        return signature;
    } catch (error) {
        console.error(`   ❌ Transfer failed to ${toAddress.substring(0, 8)}...:`, error.message);
        throw error;
    }
}
