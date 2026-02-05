"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchTickers, SearchResult } from "@/lib/api";

export function SearchBar({ className, onSelect }: { className?: string, onSelect?: (ticker: string) => void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const router = useRouter();
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 2) {
                setIsSearching(true);
                const data = await searchTickers(query);
                console.log("Search results for:", query, data);
                setResults(Array.isArray(data) ? data : []);
                setIsSearching(false);
                setShowDropdown(true);
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (ticker: string) => {
        if (onSelect) {
            onSelect(ticker);
            setQuery("");
            setShowDropdown(false);
            return;
        }
        router.push(`/terminal/${ticker}`);
        setQuery("");
        setShowDropdown(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query) {
            handleSelect(query.toUpperCase());
        }
    };

    return (
        <div ref={wrapperRef} className={cn("relative w-full max-w-md z-50", className)}>
            <form onSubmit={handleSubmit} className="relative group">
                <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowDropdown(true)}
                    placeholder="Search stocks (e.g. RELIANCE, AAPL)..."
                    className="w-full h-12 pl-12 pr-4 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm placeholder:text-muted-foreground/50 glass-input"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    {isSearching ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Search className="w-5 h-5" />
                    )}
                </div>
            </form>

            {/* Dropdown Results */}
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                    {results.length > 0 ? (
                        results.map((item) => (
                            <button
                                key={item.symbol}
                                onClick={() => handleSelect(item.symbol)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {item.symbol.substring(0, 1)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-white">{item.symbol}</div>
                                        <div className="text-xs text-zinc-400 truncate max-w-[200px]">{item.name}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] bg-white/10 px-2 py-1 rounded text-zinc-400 border border-white/5">
                                    {item.exchange}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            {isSearching ? "Searching..." : "No results found."}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
