"use client";

import { motion } from "framer-motion";

export function About() {
    return (
        <section id="about" className="py-24 relative bg-black overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black -z-20" />

            <div className="container mx-auto px-6 md:px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
                            Our Mission
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                            Democratizing Institutional <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                Grade Intelligence
                            </span>
                        </h2>
                        <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                            <p>
                                At Yukti, we believe that the playing field in financial markets has been tilted for too long.
                                Institutional players have had exclusive access to advanced algorithms, high-frequency data,
                                and deep learning models.
                            </p>
                            <p>
                                We built Yukti to change that. By combining state-of-the-art AI with an intuitive
                                scripting engine, we empower individual traders to analyze markets with the same
                                precision and speed as top hedge funds.
                            </p>
                        </div>

                        <div className="mt-10 flex gap-12">
                            <div>
                                <div className="text-4xl font-bold text-white mb-1">100k+</div>
                                <div className="text-sm text-gray-500 uppercase tracking-wider">Data Points/Sec</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-white mb-1">99.9%</div>
                                <div className="text-sm text-gray-500 uppercase tracking-wider">Uptime</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="aspect-square rounded-full border border-white/5 bg-gradient-to-br from-zinc-900 to-black p-12 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

                            {/* Abstract Central Element */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full border border-indigo-500/20 flex items-center justify-center">
                                <div className="w-2/3 h-2/3 rounded-full border border-purple-500/20 animate-pulse">
                                </div>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-9xl font-bold text-white/5 select-none">Y</span>
                            </div>
                        </div>

                        {/* Floating Cards */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-10 -right-10 p-6 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl max-w-xs shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-white">System Status</div>
                                    <div className="text-xs text-green-400">Operational</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
