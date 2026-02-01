"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserWatchlists, Watchlist, addToWatchlist, removeFromWatchlist, createWatchlist } from "@/lib/db";
import { Plus, X, List, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function WatchlistWidget() {
    const { user } = useAuth();
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [newTicker, setNewTicker] = useState("");

    useEffect(() => {
        if (!user) return;
        loadWatchlists();
    }, [user]);

    const loadWatchlists = async () => {
        if (!user) return;
        try {
            const lists = await getUserWatchlists(user.uid);
            setWatchlists(lists);
            if (lists.length > 0 && !activeListId) {
                setActiveListId(lists[0].id);
            }
        } catch (error) {
            console.error("Failed to load watchlists:", error);
            // Fallback to empty
            setWatchlists([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTicker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !activeListId || !newTicker) return;
        try {
            await addToWatchlist(user.uid, activeListId, newTicker.toUpperCase());
            setNewTicker("");
            await loadWatchlists(); // Refresh
        } catch (error) {
            console.error("Failed to add ticker:", error);
        }
    };

    const handleRemoveTicker = async (ticker: string) => {
        if (!user || !activeListId) return;
        try {
            await removeFromWatchlist(user.uid, activeListId, ticker);
            await loadWatchlists(); // Refresh
        } catch (error) {
            console.error("Failed to remove ticker:", error);
        }
    };

    const activeList = watchlists.find(l => l.id === activeListId);

    if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-xl"></div>;

    return (
        <div className="glass rounded-xl p-5 border border-white/5 flex flex-col h-full bg-[#0B0E11]/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <List className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg tracking-tight">Watchlist</h3>
                </div>
                {/* List Selector (Simple for now) */}
                <select
                    className="bg-black/40 border border-white/10 rounded focus:outline-none text-xs p-1"
                    value={activeListId || ""}
                    onChange={(e) => setActiveListId(e.target.value)}
                >
                    {watchlists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
            </div>

            {/* Add Ticker Input */}
            <form onSubmit={handleAddTicker} className="mb-4 relative">
                <input
                    type="text"
                    placeholder="Add Symbol (e.g. AAPL)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 uppercase placeholder:normal-case"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-1.5 p-1 hover:bg-white/10 rounded">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeList?.tickers.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-8">
                        List is empty. Add a stock!
                    </div>
                )}
                {activeList?.tickers.map((ticker) => (
                    <div key={ticker} className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <Link href={`/terminal/${ticker}`} className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {ticker[0]}
                            </div>
                            <div>
                                <div className="text-sm font-semibold">{ticker}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>view details</span>
                                </div>
                            </div>
                        </Link>
                        <button
                            onClick={() => handleRemoveTicker(ticker)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-red-400 transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
