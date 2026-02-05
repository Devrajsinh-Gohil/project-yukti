"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MarketSwitch, MarketRegion } from "./MarketSwitch";
import { useMarketStream } from "@/hooks/useMarketStream";
import { SignalCard, SignalData } from "./SignalCard";
import { useRouter } from "next/navigation";
import { fetchSignals } from "@/lib/api";
import { getSystemConfig } from "@/lib/db";
import { Loader2, Activity as LucideActivity } from "lucide-react";
import { WatchlistWidget } from "./WatchlistWidget";
import { UserMenu } from "./UserMenu";
import { SearchBar } from "./SearchBar";
import { IndicatorMenu } from "./IndicatorMenu";

export function Dashboard() {
    const [market, setMarket] = useState<MarketRegion>("IN");
    const [signals, setSignals] = useState<SignalData[]>([]);
    const [showSignals, setShowSignals] = useState(true);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [showIndicators, setShowIndicators] = useState(false);
    const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

    const toggleIndicator = (id: string) => {
        setActiveIndicators(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        const loadSignals = async () => {
            setLoading(true);
            try {
                const [data, config] = await Promise.all([
                    fetchSignals(market),
                    getSystemConfig()
                ]);
                setSignals(data);
                setShowSignals(config.features.showAIInsights);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        loadSignals();
    }, [market]);

    // Filter signals based on mock logic for now (just showing all or filtered by market if I had that data field)
    // For demo, I'll just show all, maybe filter NVDA for US.

    // Stream Integration
    const { lastTrade, status } = useMarketStream(market === "CRYPTO");

    useEffect(() => {
        if (!lastTrade) return;

        setSignals(prev => prev.map(sig => {
            // Normalize: API matches yfinance (BTC-USD), Stream matches Binance (BTCUSDT)
            const baseTicker = sig.ticker.replace("-", "").replace("USD", "").toUpperCase();
            const streamSymbol = lastTrade.symbol.toUpperCase();

            // Match if stream symbol starts with base ticker (e.g. BTCUSDT starts with BTC)
            if (streamSymbol.startsWith(baseTicker)) {
                return {
                    ...sig,
                    price: `$${lastTrade.price.toFixed(2)}`,
                };
            }
            return sig;
        }));
    }, [lastTrade]);

    // The fetchSignals function is now responsible for filtering based on the market.
    // So, filteredSignals can directly use the signals state.
    const filteredSignals = signals;

    const handleSignalClick = (data: SignalData) => {
        // Pass data via query params or context in future. 
        // For now, since Terminal fetches its own or uses static, we just push ticker.
        // Ideally Terminal should also fetch.
        router.push(`/terminal/${data.ticker}`);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-foreground p-6 md:p-10">
            <IndicatorMenu
                open={showIndicators}
                onOpenChange={setShowIndicators}
                onSelectIndicator={toggleIndicator}
                activeIndicators={activeIndicators}
            />

            <header className="flex justify-between items-center mb-8 relative z-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Market Terminal</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-3">
                        Real-time AI analysis & signals
                        {market === "CRYPTO" && (
                            <span className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                                status === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                    status === "connecting" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                        "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                    status === "connected" ? "bg-green-500 animate-pulse" :
                                        status === "connecting" ? "bg-yellow-500 animate-bounce" :
                                            "bg-red-500"
                                )} />
                                {status === "connected" ? "LIVE" : status ? status.toUpperCase() : "DISCONNECTED"}
                            </span>
                        )}
                    </p>
                </div>

                {/* Central Search Bar */}
                <div className="flex-1 max-w-md mx-6">
                    <SearchBar />
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowIndicators(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-sm font-medium"
                    >
                        <LucideActivity className="w-4 h-4 text-primary" />
                        Indicators
                        {activeIndicators.length > 0 && (
                            <span className="bg-primary text-black text-[10px] font-bold px-1.5 rounded-full">{activeIndicators.length}</span>
                        )}
                    </button>
                    <MarketSwitch
                        currentMarket={market}
                        onChange={setMarket}
                    />
                    <UserMenu />
                </div>
            </header>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left: Signals */}
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {signals.map((signal) => (
                                <SignalCard
                                    key={signal.id}
                                    data={signal}
                                    onClick={handleSignalClick}
                                    showSignals={showSignals}
                                />
                            ))}

                            {/* Empty State */}
                            {signals.length === 0 && (
                                <div className="col-span-full h-64 flex items-center justify-center text-muted-foreground glass rounded-xl border-dashed">
                                    No signals found for {market} market. Is the backend running?
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Watchlist (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="lg:sticky lg:top-6 h-[calc(100vh-10rem)]">
                        <WatchlistWidget />
                    </div>
                </div>
            </div>
        </div>
    );
}
