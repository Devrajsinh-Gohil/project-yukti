"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity, ArrowRight } from "lucide-react";

export interface SignalData {
    id: string;
    ticker: string;
    name: string;
    price: string;
    action: "BUY" | "SELL" | "NEUTRAL";
    confidence: number;
    timestamp: string;
    model: string;
}

interface SignalCardProps {
    data: SignalData;
    onClick: (data: SignalData) => void;
}

export function SignalCard({ data, onClick }: SignalCardProps) {
    const isBuy = data.action === "BUY";
    const isSell = data.action === "SELL";

    const accentColor = isBuy
        ? "text-success border-success/20 bg-success/5"
        : isSell
            ? "text-danger border-danger/20 bg-danger/5"
            : "text-muted-foreground border-border bg-card/20";

    const signalIcon = isBuy
        ? <TrendingUp className="w-5 h-5" />
        : isSell
            ? <TrendingDown className="w-5 h-5" />
            : <Minus className="w-5 h-5" />;

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="group relative cursor-pointer"
            onClick={() => onClick(data)}
        >
            {/* Glow Effect */}
            <div className={cn(
                "absolute -inset-0.5 rounded-xl blur opacity-0 group-hover:opacity-40 transition duration-500",
                isBuy ? "bg-success" : isSell ? "bg-danger" : "bg-primary"
            )} />

            <div className="relative glass rounded-xl p-5 h-full flex flex-col justify-between border border-border/50 hover:border-border transition-colors">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold font-mono tracking-tight text-foreground">{data.ticker}</h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{data.name}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-sm">{data.price}</span>
                        <span className="text-[10px] text-muted-foreground">{data.timestamp}</span>
                    </div>
                </div>

                {/* Action & Confidence */}
                <div className="flex items-center justify-between mt-2">
                    <div className={cn("flex items-center space-x-2 px-3 py-1.5 rounded-lg border", accentColor)}>
                        {signalIcon}
                        <span className="font-bold tracking-wide text-sm">{data.action}</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
                            <Activity className="w-3 h-3" />
                            <span>Confidence</span>
                        </div>
                        <div className="flex items-baseline space-x-1">
                            <span className={cn("text-2xl font-bold font-mono",
                                data.confidence > 80 ? "text-primary" : "text-foreground"
                            )}>
                                {data.confidence}
                            </span>
                            <span className="text-sm text-muted-foreground">%</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Model info */}
                <div className="mt-4 pt-3 border-t border-border/30 flex justify-between items-center opacity-70 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Model: {data.model}</span>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
            </div>
        </motion.div>
    );
}
