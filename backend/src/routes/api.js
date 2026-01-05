import express from 'express';
import * as apiController from '../controllers/apiController.js';
import { handleWebhook } from '../controllers/webhookController.js';

export function createApiRoutes(roundState, getSystemActiveStatus) {
    const router = express.Router();
    router.get('/health', apiController.getHealth(roundState, getSystemActiveStatus));
    router.get('/leaderboard', apiController.getLeaderboard(roundState));
    router.get('/reward-pool', apiController.getRewardPool(roundState));
    router.get('/global-stats', apiController.getGlobalStats(roundState));
    router.get('/hall-of-degens', apiController.getHallOfDegens);
    router.get('/winners', apiController.getWinners);
    router.get('/burns', apiController.getBurns);
    router.post('/webhook/transactions', handleWebhook(roundState, getSystemActiveStatus));

    return router;
}
