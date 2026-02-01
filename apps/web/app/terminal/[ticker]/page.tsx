"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useParams, useRouter } from "next/navigation";
import { TechnicalChart } from "@/components/TechnicalChart";
import { ArrowLeft, BrainCircuit, Activity, Layers, Loader2, BarChart2, TrendingUp as TrendingUpIcon, AreaChart as AreaChartIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { fetchChartData, ChartDataPoint } from "@/lib/api";
import { updateHistory, getUserWatchlists, createWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/db";
import { calculateIndicators, calculateHeikinAshi, IndicatorConfig } from "@/lib/indicators";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "@/components/UserMenu";
import { IndicatorMenu } from "@/components/IndicatorMenu";
import { DrawingToolbar } from "@/components/DrawingToolbar";
import { ChartLegend } from "@/components/ChartLegend";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { NewsPanel } from "@/components/NewsPanel";
import { IndicatorSettingsDialog } from "@/components/IndicatorSettingsDialog";

const TIMEFRAMES = ['1m', '5m', '15m', '1H', 'D', '1Y', 'ALL'];

const DEFAULT_INDICATOR_PARAMS: Record<string, any> = {
    SMA: { period: 20 },
    EMA: { period: 20 },
    RSI: { period: 14 },
    MACD: { fast: 12, slow: 26, signal: 9 },
    BollingerBands: { period: 20, stdDev: 2 },
    Stochastic: { period: 14, signal: 3 },
    CCI: { period: 20 },
    ATR: { period: 14 },
    ParabolicSAR: { step: 0.02, max: 0.2 },
    SuperTrend: { period: 10, multiplier: 3 }
};

export default function TerminalPage() {
    const params = useParams();
    const router = useRouter();
    const ticker = (params.ticker as string).toUpperCase();

    // State
    const [range, setRange] = useState("1mo");
    const [activeTf, setActiveTf] = useState("D");
    const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartMode, setChartMode] = useState<"candle" | "area" | "line" | "heikin">("candle");

    // Map UI TF to API Range
    const handleTimeframeChange = (tf: string) => {
        setActiveTf(tf);
        setLoading(true);
        let apiRange = tf;
        if (tf === '4H') apiRange = '4H';
        setRange(apiRange);
    };

    useEffect(() => {
        const loadData = async () => {
            const data = await fetchChartData(ticker, activeTf);
            setChartData(data);
            setLoading(false);
        };
        loadData();
    }, [ticker, activeTf]);

    // History & Favorites
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [favListId, setFavListId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || loading) return;
        updateHistory(user.uid, ticker).catch(console.error);

        const checkFavorite = async () => {
            try {
                const lists = await getUserWatchlists(user.uid);
                const favList = lists.find(l => l.name === "Favorites") || lists[0];
                if (favList) {
                    setFavListId(favList.id);
                    setIsFavorite(favList.tickers.includes(ticker));
                } else {
                    try {
                        await createWatchlist(user.uid, "Favorites");
                    } catch (e) { console.warn("Failed to create default watchlist", e) }
                }
            } catch (error) {
                console.error("Failed to sync favorites:", error);
            }
        };
        checkFavorite();
    }, [user, ticker, loading]);

    const toggleFavorite = async () => {
        if (!user || !favListId) return;
        try {
            if (isFavorite) {
                await removeFromWatchlist(user.uid, favListId, ticker);
                setIsFavorite(false);
            } else {
                await addToWatchlist(user.uid, favListId, ticker);
                setIsFavorite(true);
            }
        } catch (error) {
            console.error("Failed to toggle favorite:", error);
        }
    };

    // --- Indicators State ---
    const [showIndicators, setShowIndicators] = useState(false);
    const [activeIndicators, setActiveIndicators] = useState<IndicatorConfig[]>([]);

    // Settings Dialog State
    const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const toggleIndicator = (type: string) => {
        const exists = activeIndicators.some(i => i.type === type);

        if (exists) {
            setActiveIndicators(prev => prev.filter(i => i.type !== type));
        } else {
            // Add new with default params
            const newConfig: IndicatorConfig = {
                id: `${type}-${Date.now()}`,
                type,
                params: DEFAULT_INDICATOR_PARAMS[type] || { period: 14 }
            };
            setActiveIndicators(prev => [...prev, newConfig]);
        }
    };

    const handleRemoveIndicator = (id: string) => {
        setActiveIndicators(prev => prev.filter(i => i.id !== id));
    };

    const handleEditIndicator = (config: IndicatorConfig) => {
        setEditingIndicator(config);
        setIsSettingsOpen(true);
    };

    const handleSaveIndicator = (newConfig: IndicatorConfig) => {
        setActiveIndicators(prev => prev.map(i => i.id === newConfig.id ? newConfig : i));
    };

    // Calculate Indicators
    const indicatorsData = useMemo(() => {
        if (!chartData || activeIndicators.length === 0) return [];
        return calculateIndicators(chartData, activeIndicators);
    }, [chartData, activeIndicators]);

    // Derived Data for Chart Rendering
    const chartDataToRender = useMemo(() => {
        if (!chartData) return [];
        if (chartMode === 'heikin') {
            return calculateHeikinAshi(chartData);
        }
        return chartData;
    }, [chartData, chartMode]);


    // --- Workspace State ---
    const [activeTool, setActiveTool] = useState("cursor");
    const [rightTab, setRightTab] = useState<"ai" | "watchlist" | "news">("ai");

    const renderAIContent = () => (
        <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
            {/* AI Confidence */}
            <div className="glass rounded-xl p-5 border border-white/5 flex flex-col relative overflow-hidden group min-h-[180px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
                <div className="flex items-center gap-2 mb-4 z-10">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <div>
                        <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground block leading-none">AI Confidence</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center z-10">
                    <div className="relative">
                        <span className="text-4xl md:text-5xl font-bold font-mono text-primary">87<span className="text-xl">%</span></span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Strong Buy Signal</div>
                </div>
            </div>

            {/* Insight Tile */}
            <div className="glass rounded-xl p-5 border border-white/5 flex flex-col space-y-4">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drivers</span>
                </div>
                {[
                    { label: "RSI Divergence", value: 85, color: "bg-success" },
                    { label: "Vol. Breakout", value: 65, color: "bg-primary" },
                    { label: "Sector Momentum", value: 30, color: "bg-gray-600" }
                ].map((item, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-gray-300">{item.label}</span>
                            <span className="text-muted-foreground">{item.value}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Risks Tile */}
            <div className="glass rounded-xl p-5 border border-white/5 flex flex-col relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-danger" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risks</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    Earnings volatility approaching. High variance expected in next 48h.
                </div>
            </div>
        </div>
    );

    const renderWatchlistContent = () => (
        <WatchlistPanel currentTicker={ticker} />
    );

    return (
        <ProtectedRoute>
            <div className="h-screen w-screen bg-[#050505] text-foreground flex flex-col overflow-hidden font-sans">
                <IndicatorSettingsDialog
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                    config={editingIndicator}
                    onSave={handleSaveIndicator}
                />

                <IndicatorMenu
                    open={showIndicators}
                    onOpenChange={setShowIndicators}
                    onSelectIndicator={toggleIndicator}
                    activeIndicators={activeIndicators.map(i => i.type)} // Menu expects strings
                />

                {/* Top Toolbar */}
                <header className="h-12 border-b border-white/5 flex items-center justify-between px-2 bg-[#0B0E11] z-30">
                    <div className="flex items-center gap-1">
                        <button onClick={() => router.push('/')} className="p-2 hover:bg-white/5 rounded text-muted-foreground">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="h-6 w-px bg-white/10 mx-1" />
                        <div className="flex items-center gap-2 px-2">
                            <h1 className="font-bold text-sm tracking-tight">{ticker}</h1>
                            <span className="text-[10px] bg-white/5 px-1 rounded text-muted-foreground">NSE</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {/* Chart Types */}
                        <div className="flex items-center gap-1 mx-2">
                            <button
                                onClick={() => setChartMode("candle")}
                                className={cn("p-1.5 rounded hover:bg-white/5", chartMode === "candle" ? "text-primary bg-primary/10" : "text-muted-foreground")}
                                title="Candles"
                            >
                                <BarChart2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setChartMode("heikin")}
                                className={cn("p-1.5 rounded hover:bg-white/5", chartMode === "heikin" ? "text-primary bg-primary/10" : "text-muted-foreground")}
                                title="Heikin Ashi"
                            >
                                <Activity className="w-4 h-4 rotate-90" /> {/* Using Activity rotated as pseudo-HA icon */}
                            </button>
                            <button
                                onClick={() => setChartMode("line")}
                                className={cn("p-1.5 rounded hover:bg-white/5", chartMode === "line" ? "text-primary bg-primary/10" : "text-muted-foreground")}
                                title="Line"
                            >
                                <TrendingUpIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setChartMode("area")}
                                className={cn("p-1.5 rounded hover:bg-white/5", chartMode === "area" ? "text-primary bg-primary/10" : "text-muted-foreground")}
                                title="Area"
                            >
                                <AreaChartIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {/* Timeframes */}
                        <div className="flex items-center gap-1">
                            {TIMEFRAMES.slice(0, 5).map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => handleTimeframeChange(tf)}
                                    className={cn(
                                        "px-2 py-1 text-[11px] font-medium rounded hover:bg-white/5 transition-colors",
                                        activeTf === tf ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {/* Chart Tools */}
                        <button
                            onClick={() => setShowIndicators(true)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-white/5 rounded text-muted-foreground hover:text-primary transition-colors"
                        >
                            <Layers className="w-4 h-4" />
                            <span className="hidden sm:inline">Indicators</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={toggleFavorite} className={cn("h-8 w-8 p-0", isFavorite && "text-red-500")}>
                            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                        </Button>
                        <UserMenu />
                    </div>
                </header>

                {/* Main Workspace Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Toolbar */}
                    <DrawingToolbar activeTool={activeTool} onToolSelect={setActiveTool} />

                    {/* Center Chart */}
                    <div className="flex-1 flex flex-col relative bg-[#050505]">
                        <div className="flex-1 w-full h-full relative">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            )}

                            {/* Legend Overlay */}
                            <ChartLegend
                                ticker={ticker}
                                indicators={activeIndicators}
                                onRemoveIndicator={handleRemoveIndicator}
                                onEditIndicator={handleEditIndicator}
                            />

                            <TechnicalChart
                                data={chartDataToRender}
                                indicators={indicatorsData}
                                activeTool={activeTool}
                                mode={chartMode}
                                onDrawingComplete={() => setActiveTool("cursor")}
                                colors={{ backgroundColor: "#050505", textColor: "#64748B" }}
                            />
                        </div>
                    </div>

                    {/* Right Panel (Collapsible / Tabbed) */}
                    <div className="w-[320px] border-l border-white/5 bg-[#0B0E11] flex flex-col z-20">
                        {/* Tabs */}
                        <div className="flex border-b border-white/5">
                            <button
                                onClick={() => setRightTab("ai")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-medium uppercase tracking-wider hover:bg-white/5 transition-colors relative",
                                    rightTab === "ai" ? "text-primary " : "text-muted-foreground"
                                )}
                            >
                                AI Insight
                                {rightTab === "ai" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                            </button>
                            <button
                                onClick={() => setRightTab("watchlist")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-medium uppercase tracking-wider hover:bg-white/5 transition-colors relative",
                                    rightTab === "watchlist" ? "text-primary " : "text-muted-foreground"
                                )}
                            >
                                Watchlist
                                {rightTab === "watchlist" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                            </button>
                            <button
                                onClick={() => setRightTab("news")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-medium uppercase tracking-wider hover:bg-white/5 transition-colors relative",
                                    rightTab === "news" ? "text-primary " : "text-muted-foreground"
                                )}
                            >
                                News
                                {rightTab === "news" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden">
                            {rightTab === "ai" && renderAIContent()}
                            {rightTab === "watchlist" && renderWatchlistContent()}
                            {rightTab === "news" && <NewsPanel ticker={ticker} />}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
