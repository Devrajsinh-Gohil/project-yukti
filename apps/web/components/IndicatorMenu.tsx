"use client";

import { useState } from "react";
import { Search, X, Activity, TrendingUp, BarChart2, Zap, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Categorized Indicators List (Subset for Phase 1)
const INDICATOR_CATEGORIES = [
    {
        id: "trend",
        name: "Trend",
        icon: TrendingUp,
        items: [
            { id: "SMA", name: "Simple Moving Average", description: "Average price over a specific period." },
            { id: "EMA", name: "Exponential Moving Average", description: "Weighted average giving more importance to recent price data." },
            { id: "WMA", name: "Weighted Moving Average", description: "Assigns a heavier weighting to more current data points." },
            { id: "BollingerBands", name: "Bollinger Bands", description: "Volatility bands placed above and below a moving average." },
            { id: "ParabolicSAR", name: "Parabolic SAR", description: "Highlights the direction of an asset's momentum." },
            { id: "SuperTrend", name: "SuperTrend", description: "Trend-following indicator based on ATR." },
        ]
    },
    {
        id: "momentum",
        name: "Momentum",
        icon: Zap,
        items: [
            { id: "RSI", name: "Relative Strength Index", description: "Measures the speed and change of price movements." },
            { id: "Stochastic", name: "Stochastic Oscillator", description: "Compares a particular closing price to a range of prices." },
            { id: "MACD", name: "MACD", description: "Trend-following momentum indicator." },
            { id: "CCI", name: "Commodity Channel Index", description: "Identifies cyclical turns in commodities." },
            { id: "WilliamsR", name: "Williams %R", description: "Momentum indicator that measures overbought and oversold levels." },
        ]
    },
    {
        id: "volatility",
        name: "Volatility",
        icon: Activity,
        items: [
            { id: "ATR", name: "Average True Range", description: "Measure of market volatility." },
            { id: "StandardDeviation", name: "Standard Deviation", description: "Shows how much price variation from the mean exists." },
            { id: "KeltnerChannels", name: "Keltner Channels", description: "Volatility-based envelopes set above and below an exponential moving average." },
        ]
    },
    {
        id: "volume",
        name: "Volume",
        icon: BarChart2,
        items: [
            { id: "OBV", name: "On-Balance Volume", description: "Uses volume flow to predict changes in stock price." },
            { id: "VWAP", name: "VWAP", description: "Volume Weighted Average Price." },
            { id: "MFI", name: "Money Flow Index", description: "Uses price and volume to identify overbought or oversold conditions." },
        ]
    }
];

interface IndicatorMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectIndicator: (indicatorId: string) => void;
    activeIndicators: string[];
}

export function IndicatorMenu({ open, onOpenChange, onSelectIndicator, activeIndicators }: IndicatorMenuProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    const filteredCategories = INDICATOR_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            (selectedCategory === "all" || selectedCategory === cat.id) &&
            (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[600px] p-0 gap-0 bg-[#0B0E11] border-white/10 text-white overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-white/5 space-y-4">
                    <DialogTitle className="text-xl font-medium">Indicators</DialogTitle>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search indicators..."
                            className="w-full h-10 pl-10 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-sm"
                        />
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Categories */}
                    <div className="w-64 border-r border-white/5 p-4 space-y-1 overflow-y-auto">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                selectedCategory === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <Layers className="w-4 h-4" /> All Indicators
                        </button>
                        {INDICATOR_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    selectedCategory === cat.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                )}
                            >
                                <cat.icon className="w-4 h-4" /> {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Main List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-6">
                            {filteredCategories.map(cat => (
                                <div key={cat.id}>
                                    <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-3 px-2">{cat.name}</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {cat.items.map(item => {
                                            const isActive = activeIndicators.includes(item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => onSelectIndicator(item.id)}
                                                    className={cn(
                                                        "flex items-start justify-between p-3 rounded-lg border transition-all text-left group",
                                                        isActive
                                                            ? "bg-primary/5 border-primary/20"
                                                            : "bg-white/5 border-transparent hover:bg-white/10"
                                                    )}
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium flex items-center gap-2">
                                                            {item.name}
                                                            {isActive && <span className="text-[10px] bg-primary text-black px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {filteredCategories.length === 0 && (
                                <div className="text-center py-20 text-muted-foreground">
                                    No indicators found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
