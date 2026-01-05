import { isUserWallet, getWalletCache } from '../services/walletService.js';
import { calculateCurrentReward } from '../services/rewardService.js';

export async function checkAddress(req, res) {
    const { address } = req.params;

    try {
        const isUser = await isUserWallet(address);
        const cached = getWalletCache().get(address);

        res.json({
            address,
            isUserWallet: isUser,
            cached: cached ? {
                isUserWallet: cached.isUserWallet,
                checkedAt: new Date(cached.checkedAt).toISOString()
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export function getCacheStats(roundState) {
    return (req, res) => {
        const cache = getWalletCache();
        const userWallets = Array.from(cache.entries())
            .filter(([_, data]) => data.isUserWallet).length;

        res.json({
            cacheSize: cache.size,
            userWallets,
            nonUserWallets: cache.size - userWallets,
            stats: roundState.stats,
            reward: {
                claimedCreatorFees: roundState.claimedCreatorFees,
                baseReward: roundState.baseReward,
                currentRewardPool: calculateCurrentReward(roundState.baseReward, roundState.claimedCreatorFees),
                totalRewardsPaid: roundState.totalRewardsPaid,
                totalSupplyBurned: roundState.totalSupplyBurned,
            }
        });
    };
}