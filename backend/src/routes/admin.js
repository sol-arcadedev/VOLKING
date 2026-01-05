import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

export function createAdminRoutes(
    roundState,
    startFeeClaimingInterval,
    stopFeeClaimingInterval,
    systemControl
) {
    const router = express.Router();
    router.get('/system-status', adminController.getSystemStatus(systemControl));
    router.post('/start-system', requireAdmin, adminController.startSystem(systemControl));
    router.post('/stop-system', requireAdmin, adminController.stopSystem(systemControl));
    router.post('/end-round', requireAdmin, adminController.endRound(roundState, startFeeClaimingInterval, stopFeeClaimingInterval));
    router.post('/claim-fees', requireAdmin, adminController.claimFees(roundState));
    router.post('/update-signature', requireAdmin, adminController.updateSignature);
    router.post('/update-burn', requireAdmin, adminController.updateBurn(roundState));
    router.post('/set-base-reward', requireAdmin, adminController.setBaseReward(roundState));

    return router;
}