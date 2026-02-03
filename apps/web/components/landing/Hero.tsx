"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-20">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] -z-10" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-black to-black -z-20" />

            {/* Content */}
            <div className="container max-w-6xl mx-auto flex flex-col items-center text-center z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-medium mb-8"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Next Gen Trading Intelligence
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6 max-w-4xl"
                >
                    Master the Market using <br className="hidden md:block" />
                    <span className="text-white">AI-Driven Insights</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed"
                >
                    Yukti provides professional-grade tools, real-time analytics, and custom scripting
                    to help you make smarter trading decisions. Join the future of finance.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="flex flex-col sm:flex-row items-center gap-4"
                >
                    <Link href="/dashboard" className="px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                        Start Trading Now <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link href="#features" className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-colors">
                        Explore Features
                    </Link>
                </motion.div>

                {/* Abstract Floating UI / Chart Visualization */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    transition={{ duration: 1.2, delay: 1, type: "spring" }}
                    className="mt-20 relative w-full max-w-5xl aspect-video rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm shadow-2xl shadow-indigo-500/20 overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />

                    {/* Mock Chart UI */}
                    <div className="absolute top-0 left-0 right-0 h-12 border-b border-white/5 flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>

                    {/* Animated Elements mocking a chart */}
                    <svg className="absolute inset-0 w-full h-full pt-12 text-indigo-500/30" viewBox="0 0 100 50" preserveAspectRatio="none">
                        <path d="M0 40 Q 20 45, 40 30 T 80 20 T 100 10 V 50 H 0 Z" fill="currentColor" fillOpacity="0.1" />
                        <path d="M0 40 Q 20 45, 40 30 T 80 20 T 100 10" stroke="currentColor" strokeWidth="0.5" fill="none" />
                    </svg>

                    {/* Dynamic "Insight" Tooltip */}
                    <motion.div
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/3 right-1/4 px-4 py-2 bg-zinc-900/90 border border-indigo-500/30 rounded-lg shadow-xl"
                    >
                        <div className="text-xs text-indigo-300 font-mono mb-1">AI SIGNAL</div>
                        <div className="text-sm font-bold text-white">STRONG BUY</div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
