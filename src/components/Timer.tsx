import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownData {
    minutes: number;
    seconds: number;
    progress: number;
}

const useCountdown = (): CountdownData => {
    const [countdown, setCountdown] = useState<CountdownData>({
        minutes: 0,
        seconds: 0,
        progress: 0,
    });

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = Date.now();
            const roundDuration = 15 * 60 * 1000; // 15 minutes in ms
            const currentRoundStart = now - (now % roundDuration);
            const nextRoundStart = currentRoundStart + roundDuration;
            const timeRemaining = nextRoundStart - now;

            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            const progress = ((roundDuration - timeRemaining) / roundDuration) * 100;

            return { minutes, seconds, progress };
        };

        const updateCountdown = () => {
            setCountdown(calculateTimeRemaining());
        };

        // Initial calculation
        updateCountdown();

        // Update every second
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, []);

    return countdown;
};

export const Timer: React.FC = () => {
    const { minutes, seconds, progress } = useCountdown();

    return (
        <div className="inline-block">
            <div className="pixel-box p-6 bg-retro-black">
                <div className="flex items-center justify-center space-x-3 mb-4">
                    <h3 className="text-lg font-display text-candle-green uppercase text-shadow-retro">
                        NEXT ROUND IN
                    </h3>
                </div>

                <div className="flex items-center justify-center space-x-4 mb-4">
                    <TimeUnit value={minutes} label="MIN" />
                    <div className="text-5xl font-display text-candle-green blink">:</div>
                    <TimeUnit value={seconds} label="SEC" />
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-retro-black h-6 border-3 border-candle-green relative">
                    <motion.div
                        className="h-full bg-candle-green"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <p className="text-center text-retro-white font-body text-lg mt-4 uppercase">
                    &gt; BE THE KING!
                </p>
            </div>
        </div>
    );
};

interface TimeUnitProps {
    value: number;
    label: string;
}

const TimeUnit: React.FC<TimeUnitProps> = ({ value, label }) => {
    return (
        <div className="text-center">
            <motion.div
                key={value}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.1 }}
                className="pixel-box bg-retro-black p-4 min-w-[100px]"
            >
                <div className="text-5xl font-display text-candle-green text-shadow-retro tabular-nums">
                    {value.toString().padStart(2, '0')}
                </div>
            </motion.div>
            <div className="text-xs text-candle-green-dark font-display mt-2 uppercase">
                {label}
            </div>
        </div>
    );
};