"use client";

import { useState, useEffect } from "react";
import { MarketSwitch, MarketRegion } from "./MarketSwitch";
import { SignalCard, SignalData } from "./SignalCard";
import { useRouter } from "next/navigation";
import { fetchSignals } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { WatchlistWidget } from "./WatchlistWidget";
import { UserMenu } from "./UserMenu";
import { SearchBar } from "./SearchBar";

export function Dashboard() {
    const [market, setMarket] = useState<MarketRegion>("IN");
    const [signals, setSignals] = useState<SignalData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
        <div className="min-h-screen p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Market Pulse
                    </h1>
                    <p className="text-muted-foreground mt-1">Real-time AI assisted signals</p>
                </div>
                <div className="flex items-center gap-4">
                    <MarketSwitch currentMarket={market} onChange={setMarket} />
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
