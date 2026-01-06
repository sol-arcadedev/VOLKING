import React from 'react';
import {motion} from 'framer-motion';
import {Github} from 'lucide-react';
import {CYCLE, REWARD_FEATURES} from '../constants';

export const Hero: React.FC = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-16 bg-retro-black">
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center">

                    {/* GitHub Transparency Link */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <a
                            href="https://github.com/sol-arcadedev/VOLKING"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-retro-white hover:text-candle-green transition-colors"
                        >
                            <Github className="w-5 h-5"/>
                        </a>
                        <p className="text-sm font-body text-retro-white">
                            Full transparency if you would like to see the code behind the implementation.
                        </p>
                    </div>

                    {/* Contract Address */}
                    <p className="text-base font-body text-candle-green mb-4">
                        CA: To be added
                    </p>

                    {/* Logo */}
                    <motion.div
                        className="mb-3"
                        animate={{y: [0, -8, 0]}}
                        transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}}
                    >
                        <img
                            src="/volking-logo.png"
                            alt="VOLKING"
                            className="w-24 h-24 mx-auto mb-2"
                            style={{imageRendering: 'pixelated'}}
                        />
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-3xl sm:text-4xl font-display text-candle-green text-shadow-retro mb-3 uppercase leading-tight">
                        RULE THE
                        <br/>
                        VOLUME
                    </h2>

                    <p className="text-lg text-retro-white font-body leading-relaxed mb-2">
                        VOLKING is the ultimate volume-based reward token! Every 15 minutes, the trader who generates
                        the <span className="text-candle-green font-bold">highest volume</span> becomes the VOLKING and
                        claims the prize pool.
                    </p>

                    <p className="text-lg font-body text-retro-white mb-4">
                        TRADE. COMPETE. WIN.
                    </p>

                    {/* The Volking Cycle */}
                    <motion.div
                        initial={{opacity: 0, y: 30}}
                        whileInView={{opacity: 1, y: 0}}
                        viewport={{once: true}}
                        className="mb-6"
                    >
                        <div className="text-center mb-4">
                            <h3 className="text-2xl md:text-3xl font-display text-candle-green uppercase text-shadow-retro mb-2">
                                THE VOLKING CYCLE
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {CYCLE.map((item, index) => (
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
                                            className="pixel-box bg-candle-green p-3 mb-2 relative group hover:shadow-retro-lg transition-all">
                                            <div className="text-3xl font-display text-black text-shadow-retro mb-1">
                                                {item.step}
                                            </div>
                                            <item.icon className="w-7 h-7 text-black mx-auto" strokeWidth={2.5}/>
                                        </div>
                                        <p className="text-retro-white font-body text-sm leading-snug px-1">
                                            {item.text}
                                        </p>
                                    </div>

                                    {/* Arrow connector */}
                                    {index < CYCLE.length - 1 && (
                                        <div
                                            className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-candle-green text-2xl font-display">
                                            ►
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Reward Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {REWARD_FEATURES.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{opacity: 0, y: 30}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{delay: index * 0.1}}
                                whileHover={{y: -8, transition: {duration: 0.2}}}
                                className="pixel-box p-4 bg-retro-gray-dark relative overflow-hidden group card-hover"
                            >
                                <div
                                    className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}/>

                                <div className="relative">
                                    <div
                                        className={`pixel-box ${feature.bgColor} p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center`}>
                                        <feature.icon className="w-8 h-8 text-black" strokeWidth={2.5}/>
                                    </div>
                                    <h3 className={`text-lg font-display ${feature.color} mb-2 uppercase text-shadow-retro text-center`}>
                                        {feature.title}
                                    </h3>
                                    <p className="text-retro-white font-body text-sm leading-relaxed text-center">
                                        {feature.description}
                                    </p>
                                </div>

                                <div
                                    className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-candle-green opacity-50"/>
                                <div
                                    className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-candle-green opacity-50"/>
                            </motion.div>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};