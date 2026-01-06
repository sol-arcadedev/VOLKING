import React from 'react';
import {motion} from 'framer-motion';
import {Target, TrendingUp, Award, Zap} from 'lucide-react';

export const About: React.FC = () => {
    const cycle = [
        {step: '1', text: 'Trade $VOLK', icon: TrendingUp},
        {step: '2', text: 'Your Volume is tracked in real-time', icon: Target},
        {step: '3', text: 'Timer hits zero', icon: Zap},
        {step: '4', text: 'Top trader wins 15% reward', icon: Award},
    ];

    const feeDistribution = [
        {label: 'Treasury', percentage: 70, color: 'bg-candle-green'},
        {label: 'Reward Pool', percentage: 20, color: 'bg-yellow-500'},
        {label: 'Buyback & Burn', percentage: 10, color: 'bg-candle-red'},
    ];

    return (
        <section id="about" className="py-32 bg-retro-black relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 retro-grid opacity-30"/>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* The Volking Cycle */}
                <motion.div
                    initial={{opacity: 0, y: 30}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    className="mb-20"
                >
                    <div className="text-center mb-12">
                        <h3 className="text-4xl md:text-5xl font-display text-candle-green uppercase text-shadow-retro mb-4">
                            THE VOLKING CYCLE
                        </h3>
                        <p className="text-xl text-retro-white font-body">
                            Every 15 minutes, a new opportunity to become king
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
                                    <div
                                        className="pixel-box bg-candle-green p-8 mb-6 relative group hover:shadow-retro-lg transition-all">
                                        <div className="text-6xl font-display text-black text-shadow-retro mb-4">
                                            {item.step}
                                        </div>
                                        <item.icon className="w-12 h-12 text-black mx-auto" strokeWidth={2.5}/>
                                    </div>
                                    <p className="text-retro-white font-body text-lg leading-relaxed px-2">
                                        {item.text}
                                    </p>
                                </div>

                                {/* Arrow connector (hidden on mobile and last item) */}
                                {index < cycle.length - 1 && (
                                    <div
                                        className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-candle-green text-4xl font-display">
                                        ►
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Section Divider */}
                <div className="section-divider mb-20"/>

                {/* Fee Distribution */}
                <motion.div
                    initial={{opacity: 0, y: 30}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    className="pixel-box p-10 bg-retro-gray-dark"
                >
                    <h3 className="text-3xl md:text-4xl font-display text-candle-green text-center mb-8 uppercase text-shadow-retro">
                        CREATOR FEE DISTRIBUTION
                    </h3>

                    {/* Visual Bar */}
                    <div className="h-16 flex border-4 border-black mb-8 overflow-hidden">
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
                    <span className="font-display text-black text-lg font-bold">
                      {item.percentage}%
                    </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="pixel-box bg-retro-black p-6 text-center">
                            <div className="flex items-center justify-center space-x-3 mb-3">
                                <div className="w-6 h-6 bg-candle-green border-2 border-black"/>
                                <span className="text-candle-green font-display text-base">Project Funding (70%)</span>
                            </div>
                            <p className="text-retro-white font-body text-sm leading-relaxed">
                                Project growth, development, maintenance, marketing and for additional community rewards
                            </p>
                        </div>

                        <div className="pixel-box bg-retro-black p-6 text-center">
                            <div className="flex items-center justify-center space-x-3 mb-3">
                                <div className="w-6 h-6 bg-yellow-500 border-2 border-black"/>
                                <span className="text-yellow-500 font-display text-base">REWARD POOL (20%)</span>
                            </div>
                            <p className="text-retro-white font-body text-sm leading-relaxed">
                                15% to winner + 5% as base reward for the next round
                            </p>
                        </div>

                        <div className="pixel-box bg-retro-black p-6 text-center">
                            <div className="flex items-center justify-center space-x-3 mb-3">
                                <div className="w-6 h-6 bg-candle-red border-2 border-black"/>
                                <span className="text-candle-red font-display text-base">BUYBACK & BURN (10%)</span>
                            </div>
                            <p className="text-retro-white font-body text-sm leading-relaxed">
                                Deflationary mechanism - tokens burned forever
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};