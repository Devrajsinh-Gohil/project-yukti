"use client";

import { useState } from "react";
import { MarketSwitch, MarketRegion } from "./MarketSwitch";
import { SignalCard, SignalData } from "./SignalCard";
import { useRouter } from "next/navigation";

// Mock Data
const MOCK_SIGNALS: SignalData[] = [
    {
        id: "1",
        ticker: "RELIANCE",
        name: "Reliance Industries",
        price: "₹1,452.30",
        action: "BUY",
        confidence: 87,
        timestamp: "10:45 AM",
        model: "Mean Reversion v2"
    },
    {
        id: "2",
        ticker: "TCS",
        name: "Tata Consultancy Svc",
        price: "₹3,920.10",
        action: "NEUTRAL",
        confidence: 45,
        timestamp: "10:42 AM",
        model: "Momentum Alpha"
    },
    {
        id: "3",
        ticker: "HDFCBANK",
        name: "HDFC Bank Ltd",
        price: "₹1,680.50",
        action: "SELL",
        confidence: 92,
        timestamp: "10:30 AM",
        model: "Volatility Breakout"
    },
    {
        id: "4",
        ticker: "NVDA",
        name: "NVIDIA Corp",
        price: "$890.45",
        action: "BUY",
        confidence: 95,
        timestamp: "Pre-mkt",
        model: "Trend Follower"
    }
];

export function Dashboard() {
    const [market, setMarket] = useState<MarketRegion>("IN");
    const router = useRouter();

    // Filter signals based on mock logic for now (just showing all or filtered by market if I had that data field)
    // For demo, I'll just show all, maybe filter NVDA for US.

    const filteredSignals = MOCK_SIGNALS.filter(s => {
        if (market === "IN") return !["NVDA", "AAPL"].includes(s.ticker);
        if (market === "US") return ["NVDA", "AAPL", "MSFT", "TSLA"].includes(s.ticker);
        return true;
    });

    const handleSignalClick = (data: SignalData) => {
        // Setup minimal robust navigation
        router.push(`/terminal/${data.ticker}`);
    };

    return (
        <div className="min-h-screen p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Market Pulse
                    </h1>
                    <p className="text-muted-foreground mt-1">Real-time AI generated signals</p>
                </div>
                <MarketSwitch currentMarket={market} onChange={setMarket} />
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSignals.map((signal) => (
                    <SignalCard
                        key={signal.id}
                        data={signal}
                        onClick={handleSignalClick}
                    />
                ))}

                {/* Empty State / Skeleton Mock for visual volume */}
                {filteredSignals.length === 0 && (
                    <div className="col-span-full h-64 flex items-center justify-center text-muted-foreground glass rounded-xl border-dashed">
                        No signals found for {market} market.
                    </div>
                )}
            </div>
        </div>
    );
}
