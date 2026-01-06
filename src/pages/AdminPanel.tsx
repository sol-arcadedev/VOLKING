import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Power,
    PowerOff,
    Activity,
    DollarSign,
    RefreshCw,
    Clock,
    AlertCircle,
    CheckCircle,
    Settings
} from 'lucide-react';

const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

interface SystemStatus {
    active: boolean;
    feeClaimingActive: boolean;
    roundTimerActive: boolean;
    cacheCleanupActive: boolean;
    currentRound: number;
    baseReward: number;
    roundInProgress: boolean;
}

interface HealthData {
    status: string;
    systemActive: boolean;
    database: string;
    roundNumber: number;
    traders: number;
    roundInProgress: boolean;
    stats: any;
}

export default function AdminControlPanel() {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [adminPassword, setAdminPassword] = useState(''); // Store the validated password
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [baseRewardInput, setBaseRewardInput] = useState('');

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/system-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            const data = await response.json();
            setSystemStatus(data.status);
        } catch (error) {
            console.error('Error fetching system status:', error);
        }
    };

    const fetchHealth = async () => {
        try {
            const response = await fetch(`${API_URL}/api/health`);
            const data = await response.json();
            setHealthData(data);
        } catch (error) {
            console.error('Error fetching health:', error);
        }
    };

    useEffect(() => {
        if (authenticated) {
            fetchSystemStatus();
            fetchHealth();
            const interval = setInterval(() => {
                fetchSystemStatus();
                fetchHealth();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [authenticated]);

    const handleLogin = async () => {
        if (!password) {
            showMessage('error', 'Please enter a password');
            return;
        }

        setLoading(true);
        try {
            // Verify password by attempting to fetch system status with it
            const response = await fetch(`${API_URL}/api/admin/system-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                setAdminPassword(password);
                setAuthenticated(true);
                showMessage('success', 'Authentication successful');
                setPassword(''); // Clear the input password for security
            } else {
                showMessage('error', 'Invalid password');
            }
        } catch (error) {
            showMessage('error', 'Authentication error');
        }
        setLoading(false);
    };

    const startSystem = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/start-system`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            const data = await response.json();
            if (data.success) {
                showMessage('success', 'System started successfully');
                fetchSystemStatus();
            } else {
                showMessage('error', data.message || 'Failed to start system');
            }
        } catch (error) {
            showMessage('error', 'Error starting system');
        }
        setLoading(false);
    };

    const stopSystem = async () => {
        if (!confirm('Are you sure you want to STOP the system? This will halt all automated operations.')) {
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/stop-system`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            const data = await response.json();
            if (data.success) {
                showMessage('success', 'System stopped successfully');
                fetchSystemStatus();
            } else {
                showMessage('error', data.message || 'Failed to stop system');
            }
        } catch (error) {
            showMessage('error', 'Error stopping system');
        }
        setLoading(false);
    };

    const endRound = async () => {
        if (!confirm('Are you sure you want to END the current round manually?')) {
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/end-round`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            const data = await response.json();
            if (data.success) {
                showMessage('success', 'Round ended successfully');
                fetchSystemStatus();
                fetchHealth();
            } else {
                showMessage('error', 'Failed to end round');
            }
        } catch (error) {
            showMessage('error', 'Error ending round');
        }
        setLoading(false);
    };

    const claimFees = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/claim-fees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            const data = await response.json();
            if (data.success) {
                showMessage('success', `Claimed ${data.amount.toFixed(4)} SOL`);
                fetchHealth();
            } else {
                showMessage('error', data.error || 'Failed to claim fees');
            }
        } catch (error) {
            showMessage('error', 'Error claiming fees');
        }
        setLoading(false);
    };

    const setBaseReward = async () => {
        const amount = parseFloat(baseRewardInput);
        if (isNaN(amount) || amount < 0) {
            showMessage('error', 'Invalid amount');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/set-base-reward`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, reward: amount })
            });
            const data = await response.json();
            if (data.success) {
                showMessage('success', `Base reward set to ${data.baseReward.toFixed(4)} SOL`);
                fetchSystemStatus();
                setBaseRewardInput('');
            } else {
                showMessage('error', 'Failed to set base reward');
            }
        } catch (error) {
            showMessage('error', 'Error setting base reward');
        }
        setLoading(false);
    };

    const handleLogout = () => {
        setAuthenticated(false);
        setAdminPassword('');
        setPassword('');
        setSystemStatus(null);
        setHealthData(null);
        showMessage('success', 'Logged out successfully');
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-retro-black flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pixel-box p-8 bg-retro-gray-dark max-w-md w-full"
                >
                    <div className="flex items-center justify-center mb-6">
                        <Settings className="w-12 h-12 text-candle-green" />
                    </div>
                    <h1 className="text-3xl font-display text-candle-green text-center mb-6 uppercase text-shadow-retro">
                        Admin Login
                    </h1>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !loading && handleLogin()}
                            placeholder="Enter admin password"
                            disabled={loading}
                            className="w-full pixel-box bg-retro-black text-candle-green p-4 mb-4 font-display focus:outline-none focus:border-candle-green disabled:opacity-50"
                        />
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full btn-retro-green text-sm disabled:opacity-50"
                        >
                            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                        </button>
                    </div>
                    {message && (
                        <div className={`mt-4 pixel-box p-3 ${message.type === 'error' ? 'border-candle-red' : 'border-candle-green'}`}>
                            <p className={`text-sm font-body ${message.type === 'error' ? 'text-candle-red' : 'text-candle-green'}`}>
                                {message.text}
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-retro-black p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <h1 className="text-4xl md:text-5xl font-display text-candle-green uppercase text-shadow-retro">
                            Admin Control Panel
                        </h1>
                        <button
                            onClick={handleLogout}
                            className="pixel-box px-4 py-2 bg-candle-red text-black font-display text-xs uppercase hover:bg-red-600 transition-colors"
                        >
                            LOGOUT
                        </button>
                    </div>
                    <p className="text-retro-white font-body">System Management & Monitoring</p>
                </motion.div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`pixel-box p-4 mb-6 ${message.type === 'error' ? 'border-candle-red' : 'border-candle-green'}`}
                    >
                        <div className="flex items-center space-x-3">
                            {message.type === 'error' ? (
                                <AlertCircle className="w-5 h-5 text-candle-red" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-candle-green" />
                            )}
                            <p className={`font-body ${message.type === 'error' ? 'text-candle-red' : 'text-candle-green'}`}>
                                {message.text}
                            </p>
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="pixel-box p-6 bg-retro-gray-dark"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-display text-candle-green uppercase">System Status</h2>
                            <RefreshCw
                                className={`w-5 h-5 text-candle-green cursor-pointer ${loading ? 'animate-spin' : ''}`}
                                onClick={() => { fetchSystemStatus(); fetchHealth(); }}
                            />
                        </div>

                        {systemStatus && (
                            <div className="space-y-3">
                                <StatusRow
                                    label="System"
                                    active={systemStatus.active}
                                    icon={systemStatus.active ? Power : PowerOff}
                                />
                                <StatusRow
                                    label="Fee Claiming"
                                    active={systemStatus.feeClaimingActive}
                                    icon={DollarSign}
                                />
                                <StatusRow
                                    label="Round Timer"
                                    active={systemStatus.roundTimerActive}
                                    icon={Clock}
                                />
                                <StatusRow
                                    label="Cache Cleanup"
                                    active={systemStatus.cacheCleanupActive}
                                    icon={Activity}
                                />
                                <div className="border-t-2 border-retro-gray pt-3 mt-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-retro-white font-body">Current Round:</span>
                                        <span className="text-candle-green font-display">#{systemStatus.currentRound}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-retro-white font-body">Base Reward:</span>
                                        <span className="text-candle-green font-display">{systemStatus.baseReward.toFixed(4)} SOL</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="pixel-box p-6 bg-retro-gray-dark"
                    >
                        <h2 className="text-2xl font-display text-candle-green uppercase mb-4">Health Check</h2>

                        {healthData && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-retro-white font-body">API Status:</span>
                                    <span className="text-candle-green font-display uppercase">{healthData.status}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-retro-white font-body">Database:</span>
                                    <span className={`font-display uppercase ${healthData.database === 'connected' ? 'text-candle-green' : 'text-candle-red'}`}>
                    {healthData.database}
                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-retro-white font-body">Active Traders:</span>
                                    <span className="text-candle-green font-display">{healthData.traders}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-retro-white font-body">Round In Progress:</span>
                                    <span className={`font-display uppercase ${healthData.roundInProgress ? 'text-candle-green' : 'text-yellow-400'}`}>
                    {healthData.roundInProgress ? 'YES' : 'NO'}
                  </span>
                                </div>
                                {healthData.stats && (
                                    <div className="border-t-2 border-retro-gray pt-3 mt-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-retro-white font-body">Fees Claimed:</span>
                                            <span className="text-candle-green font-display">{healthData.stats.feesClaimedCount || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-2">
                                            <span className="text-retro-white font-body">Total SOL Volume:</span>
                                            <span className="text-candle-green font-display">{(healthData.stats.totalSolVolume || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <ActionButton
                        icon={Power}
                        label="Start System"
                        onClick={startSystem}
                        disabled={loading || (systemStatus?.active || false)}
                        variant="green"
                    />
                    <ActionButton
                        icon={PowerOff}
                        label="Stop System"
                        onClick={stopSystem}
                        disabled={loading || !(systemStatus?.active || false)}
                        variant="red"
                    />
                    <ActionButton
                        icon={Clock}
                        label="End Round"
                        onClick={endRound}
                        disabled={loading}
                        variant="yellow"
                    />
                    <ActionButton
                        icon={DollarSign}
                        label="Claim Fees"
                        onClick={claimFees}
                        disabled={loading}
                        variant="blue"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pixel-box p-6 bg-retro-gray-dark"
                >
                    <h2 className="text-2xl font-display text-candle-green uppercase mb-4">Set Base Reward</h2>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            step="0.0001"
                            value={baseRewardInput}
                            onChange={(e) => setBaseRewardInput(e.target.value)}
                            placeholder="Enter amount in SOL"
                            className="flex-1 pixel-box bg-retro-black text-candle-green p-3 font-display focus:outline-none focus:border-candle-green"
                        />
                        <button
                            onClick={setBaseReward}
                            disabled={loading || !baseRewardInput}
                            className="btn-retro-green text-sm disabled:opacity-50"
                        >
                            SET REWARD
                        </button>
                    </div>
                    <p className="text-xs text-retro-white opacity-60 mt-2 font-body">
                        This will set the base reward for the next round start
                    </p>
                </motion.div>

                <div className="text-center mt-8">
                    <a href="/" className="text-candle-green font-display text-sm hover:text-candle-green-dark transition-colors">
                        ← Back to Main Site
                    </a>
                </div>
            </div>
        </div>
    );
}

function StatusRow({ label, active, icon: Icon }: { label: string; active: boolean; icon: React.ComponentType<{ className?: string }> }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${active ? 'text-candle-green' : 'text-red-500'}`} />
                <span className="text-retro-white font-body text-sm">{label}</span>
            </div>
            <span className={`font-display text-xs uppercase ${active ? 'text-candle-green' : 'text-red-500'}`}>
        {active ? 'ACTIVE' : 'INACTIVE'}
      </span>
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, disabled, variant }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    disabled: boolean;
    variant: 'green' | 'red' | 'yellow' | 'blue';
}) {
    const colorClasses = {
        green: 'bg-candle-green hover:bg-green-600',
        red: 'bg-candle-red hover:bg-red-600',
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        blue: 'bg-blue-500 hover:bg-blue-600'
    };

    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            onClick={onClick}
            disabled={disabled}
            className={`pixel-box p-4 ${colorClasses[variant]} text-black font-display text-sm uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </motion.button>
    );
}