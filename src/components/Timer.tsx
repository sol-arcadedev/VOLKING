import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';

interface CountdownData {
    minutes: number;
    seconds: number;
    progress: number;
    roundInProgress: boolean;
}

const useCountdown = (): CountdownData => {
    const [countdown, setCountdown] = useState<CountdownData>({
        minutes: 0,
        seconds: 0,
        progress: 0,
        roundInProgress: true,
    });

    const API_URL = import.meta.env?.VITE_API_URL || 'https://volking-production.up.railway.app';

    useEffect(() => {
        const calculateTimeRemaining = async () => {
            try {
                // Fetch round status from backend
                const response = await fetch(`${API_URL}/api/reward-pool`);
                const data = await response.json();

                const now = Date.now();
                const roundDuration = 3 * 60 * 1000; // 15 minutes in ms
                const currentRoundStart = now - (now % roundDuration);
                const nextRoundStart = currentRoundStart + roundDuration;
                const timeRemaining = nextRoundStart - now;

                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);
                const progress = ((roundDuration - timeRemaining) / roundDuration) * 100;

                return {
                    minutes,
                    seconds,
                    progress,
                    roundInProgress: data.roundInProgress !== undefined ? data.roundInProgress : true
                };
            } catch (error) {
                // Fallback if API fails
                const now = Date.now();
                const roundDuration = 15 * 60 * 1000;
                const currentRoundStart = now - (now % roundDuration);
                const nextRoundStart = currentRoundStart + roundDuration;
                const timeRemaining = nextRoundStart - now;

                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);
                const progress = ((roundDuration - timeRemaining) / roundDuration) * 100;

                return { minutes, seconds, progress, roundInProgress: true };
            }
        };

        const updateCountdown = async () => {
            const data = await calculateTimeRemaining();
            setCountdown(data);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [API_URL]);

    return countdown;
};

export const Timer: React.FC = () => {
    const { minutes, seconds, progress, roundInProgress } = useCountdown();
    const isUrgent = minutes === 0 && seconds <= 30 && roundInProgress;
    const isProcessing = !roundInProgress;

    return (
        <div className="inline-block">
            <motion.div
                className={`pixel-box p-8 ${isUrgent ? 'border-pulse' : isProcessing ? 'bg-yellow-900 bg-opacity-20' : 'bg-retro-black'}`}
                animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
                transition={isUrgent ? { duration: 0.5, repeat: Infinity } : {}}
            >
                {/* Header */}
                <div className="flex items-center justify-center space-x-3 mb-6">
                    {isProcessing ? (
                        <AlertCircle className="w-8 h-8 text-yellow-400 animate-pulse" />
                    ) : (
                        <Clock className={`w-8 h-8 ${isUrgent ? 'text-candle-red animate-pulse' : 'text-candle-green'}`} />
                    )}
                    <h3 className={`text-2xl font-display uppercase text-shadow-retro ${
                        isProcessing ? 'text-yellow-400' : isUrgent ? 'text-candle-red' : 'text-candle-green'
                    }`}>
                        {isProcessing ? '⏳ PROCESSING ROUND...' : isUrgent ? '⚠️ ROUND ENDING!' : 'NEXT ROUND IN'}
                    </h3>
                </div>

                {isProcessing ? (
                    // Show processing message
                    <div className="text-center py-8">
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="mb-4"
                        >
                            <div className="text-3xl mb-4">⏳</div>
                            <div className="text-yellow-400 font-display text-xl mb-2">
                                ROUND ENDED
                            </div>
                            <div className="text-retro-white font-body text-base opacity-80 max-w-md mx-auto">
                                Waiting for final trades to register, distributing fees, sending rewards, and executing buyback & burn...
                            </div>
                        </motion.div>

                        <div className="mt-6 space-y-2 text-sm text-retro-white opacity-70">
                            <div>✓ Claiming final fees</div>
                            <div>✓ Distributing to treasury & reward wallet</div>
                            <div>✓ Sending reward to winner</div>
                            <div>✓ Executing buyback & burn</div>
                            <div className="text-candle-green mt-4">→ Next round starts after completion</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Timer Display */}
                        <div className="flex items-center justify-center space-x-6 mb-6">
                            <TimeUnit value={minutes} label="MIN" isUrgent={isUrgent} />
                            <motion.div
                                className={`text-6xl font-display ${isUrgent ? 'text-candle-red' : 'text-candle-green'} blink`}
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                :
                            </motion.div>
                            <TimeUnit value={seconds} label="SEC" isUrgent={isUrgent} />
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-retro-black h-8 border-4 border-candle-green relative mb-6 overflow-hidden">
                            <motion.div
                                className={`h-full ${isUrgent ? 'bg-candle-red' : 'bg-candle-green'}`}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                {/* Animated scanline effect on progress bar */}
                                <motion.div
                                    className="absolute inset-0 bg-white"
                                    animate={{
                                        x: ['-100%', '100%'],
                                        opacity: [0, 0.3, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="font-display text-black text-sm z-10 mix-blend-difference">
                                    {progress.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Call to Action */}
                        <motion.p
                            className={`text-center font-display text-xl uppercase ${
                                isUrgent ? 'text-candle-red' : 'text-candle-green'
                            }`}
                            animate={isUrgent ? { opacity: [1, 0.5, 1] } : {}}
                            transition={isUrgent ? { duration: 0.8, repeat: Infinity } : {}}
                        >
                            {isUrgent ? '▶ TRADE NOW OR LOSE!' : '▶ BE THE KING!'}
                        </motion.p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

interface TimeUnitProps {
    value: number;
    label: string;
    isUrgent?: boolean;
}

const TimeUnit: React.FC<TimeUnitProps> = ({ value, label, isUrgent = false }) => {
    return (
        <div className="text-center">
            <motion.div
                key={value}
                initial={{ scale: 1.1, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`pixel-box ${isUrgent ? 'bg-candle-red bg-opacity-20 border-candle-red' : 'bg-retro-black'} p-6 min-w-[120px] relative overflow-hidden`}
            >
                {/* Background glow effect */}
                {isUrgent && (
                    <motion.div
                        className="absolute inset-0 bg-candle-red"
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                )}

                <div className={`text-6xl font-display ${isUrgent ? 'text-candle-red' : 'text-candle-green'} text-shadow-retro tabular-nums relative z-10`}>
                    {value.toString().padStart(2, '0')}
                </div>
            </motion.div>
            <div className={`text-sm ${isUrgent ? 'text-candle-red' : 'text-pepe-green'} font-display mt-3 uppercase tracking-wider`}>
                {label}
            </div>
        </div>
    );
};