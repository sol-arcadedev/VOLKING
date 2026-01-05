import { PublicKey, Transaction, VersionedTransaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createBurnInstruction, getAccount } from '@solana/spl-token';
import { connection } from './solana.js';
import { getKeypairFromPrivateKey } from './walletService.js';
import { ENV } from '../config/env.js';
import { FEATURES } from '../config/features.js';
import { API_ENDPOINTS, BLOCKCHAIN } from '../config/constants.js';

export async function executeBuybackAndBurn(amountSOL) {
    if (!FEATURES.BUYBACK_BURN) {
        console.log('⚠️ Buyback & Burn disabled');
        return { success: false, tokensBurned: 0 };
    }

    if (amountSOL < 0.01) {
        console.log('⚠️ Amount too small for buyback');
        return { success: false, tokensBurned: 0 };
    }

    console.log(`\n🔥 Executing Buyback & Burn with ${amountSOL.toFixed(4)} SOL...`);

    const creatorFeeKeypair = getKeypairFromPrivateKey(ENV.CREATOR_FEE_WALLET_PRIVATE);

    if (!creatorFeeKeypair) {
        console.log('❌ Creator fee wallet keypair not configured - CANNOT execute buyback');
        return { success: false, tokensBurned: 0, error: 'Creator fee wallet keypair not configured' };
    }

    if (!ENV.TOKEN_ADDRESS) {
        console.log('❌ TOKEN_ADDRESS not configured');
        return { success: false, tokensBurned: 0, error: 'TOKEN_ADDRESS not configured' };
    }

    let swapSignature = null;
    let burnSignature = null;
    let tokensBurned = 0;

    try {
        console.log('   📊 Getting Jupiter quote...');
        const quoteUrl = `${API_ENDPOINTS.JUPITER}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${ENV.TOKEN_ADDRESS}&amount=${Math.floor(amountSOL * LAMPORTS_PER_SOL)}&slippageBps=100`;

        const quoteResponse = await fetch(quoteUrl);
        const quote = await quoteResponse.json();

        if (!quote || quote.error) {
            throw new Error(`Jupiter quote error: ${quote?.error || 'Unknown error'}`);
        }

        const expectedTokens = parseInt(quote.outAmount);
        const expectedTokensDisplay = expectedTokens / Math.pow(10, BLOCKCHAIN.TOKEN_DECIMALS);
        console.log(`   Expected tokens: ${expectedTokensDisplay.toLocaleString()}`);

        console.log('   🔄 Building swap transaction...');
        const swapResponse = await fetch(`${API_ENDPOINTS.JUPITER}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: creatorFeeKeypair.publicKey.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto',
            }),
        });

        const swapData = await swapResponse.json();

        if (!swapData.swapTransaction) {
            throw new Error(`Failed to get swap transaction: ${JSON.stringify(swapData)}`);
        }

        console.log('   ⚡ Executing swap...');
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
        const swapTx = VersionedTransaction.deserialize(swapTransactionBuf);
        swapTx.sign([creatorFeeKeypair]);

        swapSignature = await connection.sendTransaction(swapTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
        });

        const swapConfirmation = await connection.confirmTransaction(swapSignature, 'confirmed');

        if (swapConfirmation.value.err) {
            throw new Error(`Swap transaction failed: ${JSON.stringify(swapConfirmation.value.err)}`);
        }

        console.log(`   ✅ Swap complete: ${swapSignature}`);
        console.log(`   🔍 Swap signature: ${swapSignature}`);

        console.log('   💰 Checking token balance...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const tokenMint = new PublicKey(ENV.TOKEN_ADDRESS);
        const tokenAccountAddress = await getAssociatedTokenAddress(
            tokenMint,
            creatorFeeKeypair.publicKey
        );

        let tokenBalance = 0;
        try {
            const tokenAccount = await getAccount(connection, tokenAccountAddress);
            tokenBalance = Number(tokenAccount.amount);
            console.log(`   Token balance: ${(tokenBalance / Math.pow(10, BLOCKCHAIN.TOKEN_DECIMALS)).toLocaleString()} tokens`);
        } catch (error) {
            console.log(`   ⚠️ Could not fetch token account: ${error.message}`);
            tokenBalance = expectedTokens;
        }

        if (tokenBalance <= 0) {
            console.log('   ⚠️ No tokens to burn after swap');
            return {
                success: true,
                tokensBurned: 0,
                swapSignature,
                note: 'Swap succeeded but no tokens available to burn'
            };
        }

        console.log(`   🔥 Burning ${(tokenBalance / Math.pow(10, BLOCKCHAIN.TOKEN_DECIMALS)).toLocaleString()} tokens...`);

        const burnInstruction = createBurnInstruction(
            tokenAccountAddress,
            tokenMint,
            creatorFeeKeypair.publicKey,
            tokenBalance,
            [],
            TOKEN_PROGRAM_ID
        );

        const burnTransaction = new Transaction().add(burnInstruction);
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        burnTransaction.recentBlockhash = blockhash;
        burnTransaction.lastValidBlockHeight = lastValidBlockHeight;
        burnTransaction.feePayer = creatorFeeKeypair.publicKey;

        burnSignature = await sendAndConfirmTransaction(
            connection,
            burnTransaction,
            [creatorFeeKeypair],
            { commitment: 'confirmed' }
        );

        tokensBurned = tokenBalance / Math.pow(10, BLOCKCHAIN.TOKEN_DECIMALS);

        console.log(`   ✅ Burn complete: ${burnSignature}`);
        console.log(`   🔍 Burn signature: ${burnSignature}`);
        console.log(`   🔥 Burned ${tokensBurned.toLocaleString()} tokens`);

        return {
            success: true,
            tokensBurned,
            swapSignature,
            burnSignature,
            amountSOL,
        };

    } catch (error) {
        console.error('❌ Buyback & Burn error:', error);

        if (swapSignature && !burnSignature) {
            console.log('   ⚠️ Swap succeeded but burn failed - tokens may need manual burning');
            console.log(`   🔍 Swap signature: ${swapSignature}`);
            return {
                success: false,
                tokensBurned: 0,
                swapSignature,
                error: error.message,
                note: 'Swap succeeded, burn failed - manual intervention may be needed'
            };
        }

        return { success: false, tokensBurned: 0, error: error.message };
    }
}