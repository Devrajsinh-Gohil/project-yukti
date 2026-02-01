"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type MarketRegion = "IN" | "US" | "CRYPTO";

interface MarketSwitchProps {
    currentMarket: MarketRegion;
    onChange: (market: MarketRegion) => void;
}

export function MarketSwitch({ currentMarket, onChange }: MarketSwitchProps) {
    return (
        <div className="flex items-center space-x-2 bg-card/50 glass rounded-full p-1 border border-border">
            <button
                onClick={() => onChange("IN")}
                className={cn(
                    "relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 z-10",
                    currentMarket === "IN" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {currentMarket === "IN" && (
                    <motion.div
                        layoutId="market-pill"
                        className="absolute inset-0 bg-primary rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                Dalal Street (IN)
            </button>

            <button
                onClick={() => onChange("US")}
                className={cn(
                    "relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 z-10",
                    currentMarket === "US" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {currentMarket === "US" && (
                    <motion.div
                        layoutId="market-pill"
                        className="absolute inset-0 bg-primary rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                Wall Street (US)
            </button>

            <button
                onClick={() => onChange("CRYPTO")}
                className={cn(
                    "relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 z-10",
                    currentMarket === "CRYPTO" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {currentMarket === "CRYPTO" && (
                    <motion.div
                        layoutId="market-pill"
                        className="absolute inset-0 bg-primary rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                Crypto
            </button>
        </div>
    );
}
