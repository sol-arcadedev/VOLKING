import React from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '../hooks/useCountdown';

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