import React from 'react';
import {motion} from 'framer-motion';
import {Target, TrendingUp, Award, Zap} from 'lucide-react';

export const About: React.FC = () => {
    const cycle = [
        {step: '1', text: 'Trade $VOLK', icon: TrendingUp},
        {step: '2', text: 'Volume tracked live', icon: Target}, // Shortened text for compact layout
        {step: '3', text: 'Timer hits zero', icon: Zap},
        {step: '4', text: 'Top trader wins 15%', icon: Award}, // Shortened text
    ];

    const feeDistribution = [
        {label: 'Treasury', percentage: 70, color: 'bg-candle-green'},
        {label: 'Reward Pool', percentage: 20, color: 'bg-yellow-500'},
        {label: 'Buyback & Burn', percentage: 10, color: 'bg-candle-red'},
    ];

    return (
        <section id="about" className="py-8 bg-retro-black relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 retro-grid opacity-30"/>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* The Volking Cycle */}
                <motion.div
                    initial={{opacity: 0, y: 30}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    className="mb-10"
                >
                    <div className="text-center mb-6">
                        <h3 className="text-3xl md:text-4xl font-display text-candle-green uppercase text-shadow-retro mb-2">
                            THE VOLKING CYCLE
                        </h3>
                        <p className="text-lg text-retro-white font-body">
                            Every 15 minutes, a new opportunity to become king
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {cycle.map((item, index) => (
                            <motion.div
                                key={item.step}
                                initial={{opacity: 0, scale: 0.9}}
                                whileInView={{opacity: 1, scale: 1}}
                                viewport={{once: true}}
                                transition={{delay: index * 0.1}}
                                className="relative"
                            >
                                <div className="text-center">
                                    {/* COMPACT BOX: Reduced padding (p-4), margin (mb-3) */}
                                    <div
                                        className="pixel-box bg-candle-green p-4 mb-3 relative group hover:shadow-retro-lg transition-all">
                                        {/* Reduced font size (text-4xl) and icon size (w-8 h-8) */}
                                        <div className="text-4xl font-display text-black text-shadow-retro mb-2">
                                            {item.step}
                                        </div>
                                        <item.icon className="w-8 h-8 text-black mx-auto" strokeWidth={2.5}/>
                                    </div>
                                    <p className="text-retro-white font-body text-base leading-snug px-1">
                                        {item.text}
                                    </p>
                                </div>

                                {/* Arrow connector */}
                                {index < cycle.length - 1 && (
                                    <div
                                        className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-candle-green text-2xl font-display">
                                        ►
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Section Divider - Reduced spacing */}
                <div className="section-divider mb-8"/>

                {/* Fee Distribution - Compacted container and bars */}
                <motion.div
                    initial={{opacity: 0, y: 30}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    className="pixel-box p-6 bg-retro-gray-dark"
                >
                    <h3 className="text-2xl md:text-3xl font-display text-candle-green text-center mb-6 uppercase text-shadow-retro">
                        CREATOR FEE DISTRIBUTION
                    </h3>

                    {/* Visual Bar - Reduced height (h-10) */}
                    <div className="h-10 flex border-4 border-black mb-6 overflow-hidden">
                        {feeDistribution.map((item) => (
                            <motion.div
                                key={item.label}
                                className={`${item.color} flex items-center justify-center relative group cursor-pointer`}
                                style={{width: `${item.percentage}%`}}
                                initial={{width: 0}}
                                whileInView={{width: `${item.percentage}%`}}
                                viewport={{once: true}}
                                transition={{duration: 1, delay: 0.2}}
                                whileHover={{scale: 1.05, zIndex: 10}}
                            >
                                <span className="font-display text-black text-sm font-bold">
                                  {item.percentage}%
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Legend - Reduced padding and text size */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="pixel-box bg-retro-black p-4 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <div className="w-4 h-4 bg-candle-green border-2 border-black"/>
                                <span className="text-candle-green font-display text-sm">Project Funding (70%)</span>
                            </div>
                            <p className="text-retro-white font-body text-xs leading-relaxed">
                                Growth, dev, marketing & community rewards
                            </p>
                        </div>

                        <div className="pixel-box bg-retro-black p-4 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <div className="w-4 h-4 bg-yellow-500 border-2 border-black"/>
                                <span className="text-yellow-500 font-display text-sm">REWARD POOL (20%)</span>
                            </div>
                            <p className="text-retro-white font-body text-xs leading-relaxed">
                                15% to winner + 5% for next round
                            </p>
                        </div>

                        <div className="pixel-box bg-retro-black p-4 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <div className="w-4 h-4 bg-candle-red border-2 border-black"/>
                                <span className="text-candle-red font-display text-sm">BUYBACK (10%)</span>
                            </div>
                            <p className="text-retro-white font-body text-xs leading-relaxed">
                                Deflationary - tokens burned forever
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
