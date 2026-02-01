"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, TrendingUp, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Watchlist, getUserWatchlists, createWatchlist, removeFromWatchlist } from "@/lib/db";

export function WatchlistPanel({ currentTicker }: { currentTicker?: string }) {
    const { user } = useAuth();
    const router = useRouter();
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState("");

    // Load Watchlists
    const loadWatchlists = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const lists = await getUserWatchlists(user.uid);
            setWatchlists(lists);
            if (lists.length > 0 && !activeListId) {
                setActiveListId(lists[0].id);
            }
        } catch (error) {
            console.error("Failed to load watchlists", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWatchlists();
    }, [user]);

    const handleCreateList = async () => {
        if (!user || !newListName.trim()) return;
        try {
            await createWatchlist(user.uid, newListName);
            setNewListName("");
            setIsCreating(false);
            loadWatchlists(); // Reload
        } catch (error) {
            console.error("Failed to create list", error);
        }
    };

    const handleRemoveTicker = async (e: React.MouseEvent, ticker: string) => {
        e.stopPropagation();
        if (!user || !activeListId) return;
        try {
            await removeFromWatchlist(user.uid, activeListId, ticker);
            // Optimistic update
            setWatchlists(prev => prev.map(list => {
                if (list.id === activeListId) {
                    return { ...list, tickers: list.tickers.filter(t => t !== ticker) };
                }
                return list;
            }));
        } catch (error) {
            console.error("Failed to remove ticker", error);
        }
    };

    const activeList = watchlists.find(l => l.id === activeListId);

    return (
        <div className="flex flex-col h-full bg-[#0B0E11]">
            {/* Header / List Selector */}
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex-1 mr-2">
                    <select
                        className="w-full bg-[#1E293B] border-none text-xs font-medium rounded p-1.5 focus:ring-1 focus:ring-primary text-white outline-none"
                        value={activeListId || ""}
                        onChange={(e) => setActiveListId(e.target.value)}
                        disabled={loading}
                    >
                        {watchlists.map(list => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1.5 hover:bg-white/5 rounded text-muted-foreground hover:text-white"
                    title="Create New List"
                >
                    <FolderPlus className="w-4 h-4" />
                </button>
            </div>

            {/* Create List Form */}
            {isCreating && (
                <div className="p-3 border-b border-white/5 bg-white/5 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="List Name"
                            className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary"
                            value={newListName}
                            onChange={e => setNewListName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateList()}
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={handleCreateList}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsCreating(false)}>
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Tickers List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
                ) : !activeList || activeList.tickers.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <div className="text-xs text-muted-foreground">This list is empty.</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-1">Add symbols from the main chart.</div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {activeList.tickers.map(ticker => (
                            <div
                                key={ticker}
                                onClick={() => router.push(`/terminal/${ticker}`)}
                                className={cn(
                                    "group flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors",
                                    currentTicker === ticker ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "font-bold text-sm",
                                        currentTicker === ticker ? "text-primary" : "text-white"
                                    )}>
                                        {ticker}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">NSE</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Placeholder mini-sparkline/price would go here */}
                                    <button
                                        onClick={(e) => handleRemoveTicker(e, ticker)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded transition-all text-muted-foreground"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
