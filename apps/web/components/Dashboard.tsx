"use client";

import { useState, useEffect } from "react";
import { MarketSwitch, MarketRegion } from "./MarketSwitch";
import { SignalCard, SignalData } from "./SignalCard";
import { useRouter } from "next/navigation";
import { fetchSignals } from "@/lib/api";
import { Loader2, Activity as LucideActivity } from "lucide-react";
import { WatchlistWidget } from "./WatchlistWidget";
import { UserMenu } from "./UserMenu";
import { SearchBar } from "./SearchBar";
import { IndicatorMenu } from "./IndicatorMenu";

export function Dashboard() {
    const [market, setMarket] = useState<MarketRegion>("IN");
    const [signals, setSignals] = useState<SignalData[]>([]);
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
            const data = await fetchSignals(market);
            setSignals(data);
            setLoading(false);
        };
        loadSignals();
    }, [market]);

    // Filter signals based on mock logic for now (just showing all or filtered by market if I had that data field)
    // For demo, I'll just show all, maybe filter NVDA for US.

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

            <header className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Market Terminal</h1>
                    <p className="text-muted-foreground mt-1">Real-time AI analysis & signals</p>
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

            {/* Search Section */}
            <div className="flex justify-center -mt-4 mb-8">
                <SearchBar />
            </div>

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
