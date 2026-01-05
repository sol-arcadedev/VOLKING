import { isUserWallet } from './walletService.js';
import { ENV } from '../config/env.js';
import { BLOCKCHAIN } from '../config/constants.js';

export async function processTransaction(tx, roundState) {
    let processed = 0;
    let excluded = 0;

    const nativeTransfers = tx.nativeTransfers || [];
    const tokenTransfers = tx.tokenTransfers || [];
    const feePayer = tx.feePayer;
    const timestamp = (tx.timestamp || Math.floor(Date.now() / 1000)) * 1000;

    const hasOurToken = tokenTransfers.some(t => t.mint === ENV.TOKEN_ADDRESS);

    if (!hasOurToken) {
        return { processed: 0, excluded: 0 };
    }

    let solValue = 0;
    let traderWallet = feePayer;

    for (const transfer of nativeTransfers) {
        const amount = transfer.amount / Math.pow(10, BLOCKCHAIN.SOL_DECIMALS);
        const from = transfer.fromUserAccount;
        const to = transfer.toUserAccount;

        if (amount >= 0.001) {
            const isFromUser = from === feePayer;
            const isToUser = to === feePayer;

            if (isFromUser || isToUser) {
                if (amount > solValue) {
                    solValue = amount;
                    traderWallet = feePayer;
                }
            }
        }
    }

    if (tx.events?.swap) {
        const swap = tx.events.swap;

        if (swap.nativeInput?.amount) {
            const swapAmount = swap.nativeInput.amount / Math.pow(10, BLOCKCHAIN.SOL_DECIMALS);
            if (swapAmount > solValue) {
                solValue = swapAmount;
                traderWallet = swap.nativeInput.account || feePayer;
            }
        }

        if (swap.nativeOutput?.amount) {
            const swapAmount = swap.nativeOutput.amount / Math.pow(10, BLOCKCHAIN.SOL_DECIMALS);
            if (swapAmount > solValue) {
                solValue = swapAmount;
                traderWallet = swap.nativeOutput.account || feePayer;
            }
        }
    }

    if (solValue > 0 && traderWallet) {
        const isUser = await isUserWallet(traderWallet);

        if (isUser) {
            roundState.updateVolume(traderWallet, solValue, timestamp);
            processed = 1;
            roundState.stats.processed++;
            roundState.stats.totalSolVolume += solValue;
        } else {
            excluded = 1;
            roundState.stats.excluded++;
        }
    }

    return { processed, excluded };
}