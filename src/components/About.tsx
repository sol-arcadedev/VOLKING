import React from 'react';
import {motion} from 'framer-motion';

export const About: React.FC = () => {

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
