import React from 'react';
import {motion} from 'framer-motion';
import {Github} from 'lucide-react';
import {CYCLE, REWARD_FEATURES} from '../constants';

export const Hero: React.FC = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 bg-retro-black">
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">

                    {/* GitHub Transparency Link */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <a
                            href="https://github.com/sol-arcadedev/VOLKING"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-retro-white hover:text-candle-green transition-colors"
                        >
                            <Github className="w-6 h-6"/>
                        </a>
                        <p className="text-sm font-body text-retro-white">
                            Full transparency if you would like to see the code behind the implementation.
                        </p>
                    </div>

                    {/* Contract Address */}
                    <p className="text-lg font-body text-candle-green mb-8">
                        CA: To be added
                    </p>

                    {/* Logo */}
                    <motion.div
                        className="mb-6"
                        animate={{y: [0, -8, 0]}}
                        transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}}
                    >
                        <img
                            src="/volking-logo.png"
                            alt="VOLKING"
                            className="w-32 h-32 mx-auto mb-4"
                            style={{imageRendering: 'pixelated'}}
                        />
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-4xl sm:text-5xl font-display text-candle-green text-shadow-retro mb-4 uppercase leading-tight">
                        RULE THE
                        <br/>
                        VOLUME
                    </h2>

                    <p className="text-xl font-body text-retro-white mb-3">
                        TRADE. COMPETE. WIN.
                    </p>

                    <p className="text-retro-white font-body text-base leading-relaxed mb-4">
                        VOLKING is the ultimate volume-based reward token! Every 15 minutes, the trader who generates
                        the <span className="text-candle-green font-bold">highest volume</span> becomes the VOLKING and
                        claims the prize pool. It's simple: trade smart, and claim your throne!
                    </p>


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
                                            className="pixel-box bg-candle-green p-4 mb-3 relative group hover:shadow-retro-lg transition-all">
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


                    {/*/!* Community & Version Notice *!/*/}
                    {/*<div className="pixel-box p-5 mb-12 max-w-3xl mx-auto border-candle-green-dark">*/}
                    {/*  <p className="text-retro-white font-body text-sm leading-relaxed mb-3">*/}
                    {/*    <span className="text-candle-green font-bold">🚀 VERSION 1.0 — LAUNCH EDITION</span>*/}
                    {/*  </p>*/}
                    {/*  <p className="text-retro-white font-body text-sm leading-relaxed mb-3">*/}
                    {/*    This is the first version of VOLKING! We're starting with <span className="text-candle-green">1 winner every 15 minutes</span>.*/}
                    {/*  </p>*/}
                    {/*  <p className="text-retro-white font-body text-sm leading-relaxed">*/}
                    {/*    We'd love to hear from you! Got ideas for new volume-based competitions? Want 24-hour rounds with multiple winners? Different prize structures? <span className="text-candle-green">The community decides the future of VOLKING.</span> Drop your suggestions and let's build this together! 💬*/}
                    {/*  </p>*/}
                    {/*</div>*/}

                    {/*/!* Mini Candlestick Chart *!/*/}
                    {/*<div className="flex justify-center items-end space-x-2 mb-12 h-24">*/}
                    {/*  {[40, 60, 35, 70, 45, 55, 65, 50].map((height, i) => (*/}
                    {/*      <div key={i} className="flex flex-col items-center justify-end">*/}
                    {/*        <div className="candle-wick bg-white w-1 h-4 mb-1" />*/}
                    {/*        <motion.div*/}
                    {/*            className={`candle w-6 ${i % 2 === 0 ? 'candle-green' : 'candle-red'}`}*/}
                    {/*            style={{ height: `${height}px` }}*/}
                    {/*            animate={{ height: [`${height}px`, `${height + 5}px`, `${height}px`] }}*/}
                    {/*            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}*/}
                    {/*        />*/}
                    {/*      </div>*/}
                    {/*  ))}*/}
                    {/*</div>*/}

                    {/* Reward Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                        {REWARD_FEATURES.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{opacity: 0, y: 30}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{delay: index * 0.1}}
                                whileHover={{y: -8, transition: {duration: 0.2}}}
                                className="pixel-box p-6 bg-retro-gray-dark relative overflow-hidden group card-hover"
                            >
                                <div
                                    className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}/>

                                <div className="relative">
                                    <div
                                        className={`pixel-box ${feature.bgColor} p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center`}>
                                        <feature.icon className="w-10 h-10 text-black" strokeWidth={2.5}/>
                                    </div>
                                    <h3 className={`text-xl font-display ${feature.color} mb-4 uppercase text-shadow-retro text-center`}>
                                        {feature.title}
                                    </h3>
                                    <p className="text-retro-white font-body text-base leading-relaxed text-center">
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