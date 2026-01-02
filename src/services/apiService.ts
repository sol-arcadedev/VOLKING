/**
 * API Service - Connects frontend to Railway backend
 * The backend receives real-time webhook data from Helius
 */

// Backend API URL - your Railway deployment
const API_URL = import.meta.env.VITE_API_URL || 'https://volking-production.up.railway.app';

export interface VolumeData {
    wallet: string;
    volume: number;
    trades: number;
    lastTrade: number;
}

export interface LeaderboardResponse {
    roundStart: number;
    leaderboard: VolumeData[];
    totalTraders: number;
}

export interface HealthResponse {
    status: string;
    roundStart: string;
    traders: number;
}

/**
 * Fetch current leaderboard from backend
 * Backend aggregates volume data from Helius webhooks
 */
export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
    try {
        const response = await fetch(`${API_URL}/api/leaderboard`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data: LeaderboardResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        // Return empty leaderboard on error
        return {
            roundStart: getCurrentRoundStart(),
            leaderboard: [],
            totalTraders: 0,
        };
    }
}

/**
 * Check backend health status
 */
export async function checkHealth(): Promise<HealthResponse | null> {
    try {
        const response = await fetch(`${API_URL}/api/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Health check error:', error);
        return null;
    }
}

/**
 * Get current round start time (last 15-minute mark)
 */
export function getCurrentRoundStart(): number {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundStart = Math.floor(minutes / 15) * 15;
    now.setMinutes(roundStart, 0, 0);
    return now.getTime();
}

/**
 * Get next round start time
 */
export function getNextRoundStart(): number {
    return getCurrentRoundStart() + 15 * 60 * 1000;
}