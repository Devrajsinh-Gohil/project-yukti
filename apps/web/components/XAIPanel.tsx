"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X, BrainCircuit, BarChart3, ListChecks } from "lucide-react";
import { SignalData } from "./SignalCard";
import { TechnicalChart } from "./TechnicalChart";

interface XAIPanelProps {
    isOpen: boolean;
    onClose: () => void;
    data: SignalData | null;
}

export function XAIPanel({ isOpen, onClose, data }: XAIPanelProps) {
    if (!data) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Side Sheet */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] glass-strong border-l border-border/50 shadow-2xl p-6 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-3">
                                <BrainCircuit className="w-6 h-6 text-primary" />
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                    Signal Logic
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-8">
                            {/* Asset Context */}
                            <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                                <div>
                                    <h1 className="text-3xl font-mono font-bold">{data.ticker}</h1>
                                    <p className="text-muted-foreground">{data.name}</p>
                                </div>
                                <div className={cn(
                                    "text-xl font-bold px-3 py-1 rounded",
                                    data.action === "BUY" ? "bg-success/10 text-success" :
                                        data.action === "SELL" ? "bg-danger/10 text-danger" : "bg-gray-500/10"
                                )}>
                                    {data.action}
                                </div>
                            </div>

                            {/* Score Breakdown */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass p-4 rounded-xl">
                                    <div className="text-xs text-muted-foreground uppercase mb-1">Confidence</div>
                                    <div className="text-3xl font-mono font-bold text-primary">{data.confidence}%</div>
                                </div>
                                <div className="glass p-4 rounded-xl">
                                    <div className="text-xs text-muted-foreground uppercase mb-1">Model Regime</div>
                                    <div className="text-lg font-medium">High Volatility</div>
                                </div>
                            </div>

                            {/* Logic Summary */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 text-primary text-sm font-semibold uppercase tracking-wider">
                                    <ListChecks className="w-4 h-4" />
                                    <span>Rationale</span>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-sm p-3 rounded-lg bg-white/5 border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                                        <span>RSI (14) crossed below 30 indicating oversold conditions.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm p-3 rounded-lg bg-white/5 border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                                        <span>Volume spike 2.5x above 20-day moving average.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm p-3 rounded-lg bg-white/5 border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span>Price touched lower Bollinger Band with bullish rejection candle.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Chart Placeholder */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 text-primary text-sm font-semibold uppercase tracking-wider">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>Technical Context</span>
                                </div>
                                <div className="aspect-video rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                                    <TechnicalChart
                                        mode="area"
                                        colors={{
                                            lineColor: data.action === "BUY" ? "#4ADE80" : data.action === "SELL" ? "#FB7185" : "#D4AF37",
                                            areaTopColor: data.action === "BUY" ? "rgba(74, 222, 128, 0.4)" : data.action === "SELL" ? "rgba(251, 113, 133, 0.4)" : "rgba(212, 175, 55, 0.4)",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
