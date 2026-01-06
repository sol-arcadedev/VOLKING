import { ENV } from '../config/env.js';

export function requireAdmin(req, res, next) {
    // Accept both 'password' (from frontend) and 'adminKey' for backwards compatibility
    const { password, adminKey } = req.body;
    const providedKey = password || adminKey;

    if (providedKey !== ENV.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}