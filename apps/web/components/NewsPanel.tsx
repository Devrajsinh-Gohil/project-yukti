"use client";

import { useEffect, useState } from "react";
import { NewsItem, fetchNews } from "@/lib/api";
import { ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewsPanel({ ticker }: { ticker: string }) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNews = async () => {
            setLoading(true);
            try {
                const data = await fetchNews(ticker);
                setNews(data);
            } catch (error) {
                console.error("Failed to load news", error);
            } finally {
                setLoading(false);
            }
        };
        loadNews();
    }, [ticker]);

    const getSentimentIcon = (sentiment: string) => {
        if (sentiment === "positive") return <TrendingUp className="w-3 h-3 text-success" />;
        if (sentiment === "negative") return <TrendingDown className="w-3 h-3 text-danger" />;
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    };

    const getSentimentColor = (sentiment: string) => {
        if (sentiment === "positive") return "bg-success/10 text-success border-success/20";
        if (sentiment === "negative") return "bg-danger/10 text-danger border-danger/20";
        return "bg-white/5 text-muted-foreground border-white/10";
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHrs < 1) return "Just now";
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-[#0B0E11]">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market News</h3>
                <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{ticker}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col gap-4 p-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="h-3 bg-white/5 rounded w-3/4" />
                                <div className="h-2 bg-white/5 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {news.map(item => (
                            <a
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group p-4 border-b border-white/5 hover:bg-white/5 transition-colors block"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground">{item.source}</span>
                                        <span className="text-[10px] text-muted-foreground/50">•</span>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(item.published_at)}
                                        </div>
                                    </div>
                                    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", getSentimentColor(item.sentiment))}>
                                        {getSentimentIcon(item.sentiment)}
                                        <span className="capitalize">{item.sentiment}</span>
                                    </div>
                                </div>
                                <h4 className="text-sm font-medium text-white group-hover:text-primary transition-colors leading-snug">
                                    {item.title}
                                </h4>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
