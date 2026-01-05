import express from 'express';
import * as debugController from '../controllers/debugController.js';

export function createDebugRoutes(roundState) {
    const router = express.Router();

    router.get('/check/:address', debugController.checkAddress);
    router.get('/cache', debugController.getCacheStats(roundState));

    return router;
}