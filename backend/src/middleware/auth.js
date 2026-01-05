
import { ENV } from '../config/env.js';

export function requireAdmin(req, res, next) {
    const { adminKey } = req.body;

    if (adminKey !== ENV.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}