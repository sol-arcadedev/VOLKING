import React from 'react';
import {motion} from 'framer-motion';
import {Github} from 'lucide-react';
import {CYCLE, VOLKING_CYCLE_STEPS} from '../constants';

export const Hero: React.FC = () => {
    return (
        <section id="hero" className="relative min-h-screen flex items-center justify-center pt-16 bg-retro-black">
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center">


                    {/* GitHub Link and Contract Address - Same Line */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6">
                        <a
                            href="https://github.com/sol-arcadedev/VOLKING"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pixel-box px-4 py-2 bg-retro-gray-dark hover:bg-retro-gray transition-colors flex items-center gap-2 text-retro-white hover:text-candle-green text-sm"
                        >
                            <Github className="w-4 h-4"/>
                            <span>Full transparency - View code</span>
                        </a>
                        <div className="pixel-box px-4 py-2 bg-retro-gray-dark">
                            <p className="text-sm font-body text-candle-green">
                                CA: To be added
                            </p>
                        </div>
                    </div>

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
                    <h2 className="text-3xl sm:text-4xl font-display text-candle-green text-shadow-retro mb-6 uppercase leading-tight">
                        RULE THE
                        <br/>
                        VOLUME
                    </h2>

                    <p className="text-xl sm:text-2xl text-retro-white font-body leading-relaxed mb-3 max-w-4xl mx-auto">
                        VOLKING is the ultimate volume-based reward token! Every Round, the trader who generates
                        the <span className="text-candle-green font-bold">highest volume</span> becomes the VOLKING and
                        receives the prize pool.
                    </p>

                    <p className="text-xl sm:text-2xl font-body text-retro-white mb-6">
                        TRADE. COMPETE. WIN.
                    </p>

                    {/* The Volking Cycle */}
                    <motion.div
                        initial={{opacity: 0, y: 30}}
                        whileInView={{opacity: 1, y: 0}}
                        viewport={{once: true}}
                    >
                        <div className="text-center mb-4">
                            <h3 className="text-2xl md:text-3xl font-display text-candle-green uppercase text-shadow-retro mb-2">
                                THE VOLKING CYCLE
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {CYCLE.map((item, index) => {
                                const feature = VOLKING_CYCLE_STEPS[index];
                                return (
                                    <motion.div
                                        key={item.step}
                                        initial={{opacity: 0, scale: 0.9}}
                                        whileInView={{opacity: 1, scale: 1}}
                                        viewport={{once: true}}
                                        transition={{delay: index * 0.1}}
                                        whileHover={{y: -8, transition: {duration: 0.2}}}
                                        className="relative"
                                    >
                                        <div className="pixel-box p-4 bg-retro-gray-dark relative overflow-hidden group card-hover h-full">
                                            <div
                                                className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}/>

                                            <div className="relative">
                                                {/* Step number */}
                                                <div className="flex items-center justify-center gap-2 mb-3">
                                                    <div className="text-3xl font-display text-candle-green text-shadow-retro">
                                                        {item.step}
                                                    </div>
                                                </div>

                                                {/* Reward feature title */}
                                                <h3 className={`text-base font-display ${feature.color} mb-2 uppercase text-shadow-retro text-center`}>
                                                    {feature.title}
                                                </h3>

                                                {/* Reward feature description */}
                                                <p className="text-retro-white font-body text-xs leading-relaxed text-center opacity-90">
                                                    {feature.description}
                                                </p>
                                            </div>

                                            <div
                                                className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-candle-green opacity-50"/>
                                            <div
                                                className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-candle-green opacity-50"/>
                                        </div>

                                        {/* Arrow connector */}
                                        {index < CYCLE.length - 1 && (
                                            <div
                                                className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-candle-green text-2xl font-display z-10">
                                                ►
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};