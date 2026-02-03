"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useParams, useRouter } from "next/navigation";
import { TechnicalChart } from "@/components/TechnicalChart";
import { ArrowLeft, BrainCircuit, Activity, Layers, Loader2, BarChart2, TrendingUp as TrendingUpIcon, AreaChart as AreaChartIcon, Heart, Code, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { fetchChartData, ChartDataPoint } from "@/lib/api";
import { addToWatchlist, createWatchlist, getUserWatchlists, removeFromWatchlist, syncUserProfile, updateHistory, getSystemConfig } from "@/lib/db";
import { calculateIndicators, calculateHeikinAshi, IndicatorConfig } from "@/lib/indicators";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "@/components/UserMenu";
import { IndicatorMenu } from "@/components/IndicatorMenu";
import { DrawingToolbar } from "@/components/DrawingToolbar";
import { ChartLegend } from "@/components/ChartLegend";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { NewsPanel } from "@/components/NewsPanel";
import { IndicatorSettingsDialog } from "@/components/IndicatorSettingsDialog";
import { useMarketStream } from "@/hooks/useMarketStream";
import { Script, ScriptEngine, ScriptResult } from "@/lib/scripting-engine";
import { ScriptEditor } from "@/components/ScriptEditor";
import { ScriptManager } from "@/components/ScriptManager";

const TIMEFRAMES = ['5m', '15m', '1H', 'D', '1Y', 'ALL'];

const RANGE_CONFIG: Record<string, { valid: string[], default: string }> = {
    '1D': { valid: ['5m', '15m', '1H'], default: '5m' },
    '1M': { valid: ['15m', '1H', '4H', '1D'], default: '1H' },
    '1Y': { valid: ['4H', '1D'], default: '1D' },
    'ALL': { valid: ['1D'], default: '1D' } // Simplified for ALL to just 1D for now as others aren't in UI
};

const CHART_COLORS = { backgroundColor: "#050505", textColor: "#64748B" };

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
    const [activeRange, setActiveRange] = useState("1mo");
    const [activeInterval, setActiveInterval] = useState("1d");
    const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartMode, setChartMode] = useState<"candle" | "area" | "line" | "heikin">("candle");

    // Live Data State
    const { lastTrade } = useMarketStream(true); // Always listen, filter locally
    const [liveCandle, setLiveCandle] = useState<ChartDataPoint | undefined>(undefined);

    // Filter and Process Stream
    useEffect(() => {
        if (!lastTrade || !chartData || chartData.length === 0) return;

        // Normalization: BTC-USD (Page) vs BTCUSDT (Stream)
        const pageSymbol = ticker.replace("-", "").replace("USD", "").toUpperCase();
        const streamSymbol = lastTrade.symbol.toUpperCase();

        if (streamSymbol.startsWith(pageSymbol)) {
            const lastCandle = chartData[chartData.length - 1];
            const tradeTime = lastTrade.time || Date.now();

            // Interval Parsing
            const getIntervalSeconds = (int: string) => {
                if (int.endsWith('m')) return parseInt(int) * 60;
                if (int.endsWith('h')) return parseInt(int) * 3600;
                if (int.endsWith('d')) return parseInt(int) * 86400;
                return 60; // Default 1m
            };

            const intervalSec = getIntervalSeconds(activeInterval);
            const lastCandleTime = typeof lastCandle.time === 'string'
                ? new Date(lastCandle.time).getTime() / 1000
                : lastCandle.time;

            const tradeTimeSec = Math.floor(tradeTime / 1000);
            const isNewCandle = (tradeTimeSec - (lastCandleTime as number)) >= intervalSec;

            if (isNewCandle) {
                // Create NEW candle
                const newCandle: ChartDataPoint = {
                    time: (lastCandleTime as number) + intervalSec,
                    open: lastTrade.price,
                    high: lastTrade.price,
                    low: lastTrade.price,
                    close: lastTrade.price,
                    volume: lastTrade.size
                };
                setLiveCandle(newCandle);
                if (liveCandle) {
                    setChartData(prev => prev ? [...prev, liveCandle] : [liveCandle]);
                }
            } else {
                // Update CURRENT candle
                const baseLow = liveCandle ? liveCandle.low : lastCandle.low;
                const baseHigh = liveCandle ? liveCandle.high : lastCandle.high;
                const baseOpen = liveCandle ? liveCandle.open : lastCandle.open;
                const currentVol = liveCandle ? (liveCandle.volume || 0) : (lastCandle.volume || 0);

                const updated: ChartDataPoint = {
                    time: lastCandle.time,
                    open: baseOpen,
                    close: lastTrade.price,
                    high: Math.max(baseHigh, lastTrade.price),
                    low: Math.min(baseLow, lastTrade.price),
                    volume: currentVol + lastTrade.size
                };
                setLiveCandle(updated);
            }
        }
    }, [lastTrade, chartData, ticker, activeInterval]);

    // Handlers
    const handleIntervalChange = (val: string) => {
        // Map UI to API Interval
        // 5m, 15m, 1H->1h, 4H->1h (agg later), 1D->1d
        let apiInt = val;
        if (val === '1H') apiInt = '1h';
        if (val === '4H') apiInt = '1h'; // Fallback
        if (val === '1D') apiInt = '1d';

        setActiveInterval(apiInt);
        setLoading(true);
        setLiveCandle(undefined);
    };

    const handleRangeChange = (val: string) => {
        // Map UI to API Range
        // 1D->1d, 1M->1mo, 1Y->1y, ALL->max
        let apiRng = val;
        if (val === '1M') apiRng = '1mo';
        if (val === '1Y') apiRng = '1y';
        if (val === '1D') apiRng = '1d';

        // Enforce Logic
        const config = RANGE_CONFIG[val] || { valid: [], default: '1d' };
        // Check if current interval is valid
        // activeInterval is API format (1h), UI buttons are 1H. 
        // Need to check against UI format if possible or map back.
        // Simpler: Map API interval back to UI for check, or just check 'activeInterval' against mapped config defaults?
        // Let's rely on the config using UI keys (1H) and mapping.

        // Actually, we need to set the API interval
        // Let's find the UI key for the current activeInterval to check validity
        // This is getting complex with the mapping.
        // Let's simplify: Just set to default for the range if we switch ranges? 
        // No, user annoyance.

        // Let's use a helper to get valid API intervals for this Range
        // valid UI: ['5m', ...]. Map to API: ['5m', ...]
        // 1H -> 1h, 4H -> 1h.

        // Quick map for check
        const uiToApi = (ui: string) => {
            if (ui === '1H' || ui === '4H') return '1h';
            if (ui === '1D') return '1d';
            return ui;
        };

        const validApiIntervals = config.valid.map(uiToApi);

        let newInterval = activeInterval;
        if (!validApiIntervals.includes(activeInterval) && activeInterval !== '1wk' && activeInterval !== '1mo') {
            // Current is invalid, switch to default
            newInterval = uiToApi(config.default);
        }

        setActiveRange(apiRng);
        if (newInterval !== activeInterval) {
            setActiveInterval(newInterval);
        }
        setLoading(true);
        setLiveCandle(undefined);
    };

    useEffect(() => {
        const controller = new AbortController();
        const loadData = async () => {
            try {
                const data = await fetchChartData(ticker, activeRange, activeInterval, controller.signal);
                if (!controller.signal.aborted) {
                    setChartData(data);
                    setLoading(false);
                    setLiveCandle(undefined);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Failed to load chart data", err);
                    if (!controller.signal.aborted) setLoading(false);
                }
            }
        };
        loadData();
        return () => { controller.abort(); };
    }, [ticker, activeRange, activeInterval]);

    // History & Favorites
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [favListId, setFavListId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return; // Only proceed if user is logged in

        // Update history for the current ticker
        if (params.ticker) {
            updateHistory(user.uid, ticker).catch(console.error);
        }

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

        const loadUserConfig = async () => {
            if (params.ticker) {
                // ... (existing history logic if any)
            }
            // Load system config
            try {
                const sysConfig = await getSystemConfig();
                setShowAIInsights(sysConfig.features.showAIInsights);
                if (sysConfig.features.showAIInsights) {
                    setRightTab("ai");
                }
            } catch (error) {
                console.error("Failed to load config", error);
            }
        };

        loadUserConfig();
    }, [user, params.ticker]);

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

    // --- Scripting Engine State ---
    const [scripts, setScripts] = useState<Script[]>([]);
    const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
    const [isScriptPanelOpen, setIsScriptPanelOpen] = useState(false);
    const [scriptResults, setScriptResults] = useState<ScriptResult[]>([]);

    // Editor State
    const [executionLogs, setExecutionLogs] = useState<string[]>([]);
    const [executionError, setExecutionError] = useState<string | undefined>(undefined);
    const [executionLogRunning, setExecutionLogRunning] = useState(false);

    // Initial Scripts Load (Mock)
    useEffect(() => {
        // TODO: Load from DB
        if (scripts.length === 0) {
            setScripts([
                {
                    id: '1',
                    name: 'My First Script',
                    enabled: false,
                    code: `// Simple SMA Strategy
const period = 20;
const sma = SMA.calculate({period, values: close});
plot("SMA", sma, {color: "#3b82f6"});

// Loop through history to find crossover signals
for (let i = period; i < close.length; i++) {
    const prevPrice = close[i - 1];
    const prevSMA = sma[i - 1];
    const currPrice = close[i];
    const currSMA = sma[i];

    // Crossover Buy
    if (prevPrice <= prevSMA && currPrice > currSMA) {
        log("Buy Signal at index " + i);
        signal(i, "BUY", "BUY");
    }

    // Crossover Sell
    if (prevPrice >= prevSMA && currPrice < currSMA) {
        log("Sell Signal at index " + i);
        signal(i, "SELL", "SELL");
    }
}
`
                }
            ]);
        }
    }, []);

    // Execute scripts when data or scripts change
    useEffect(() => {
        if (!chartData || chartData.length === 0) return;

        const runScripts = async () => {
            const promises = scripts.filter(s => s.enabled).map(script =>
                ScriptEngine.execute(script.code, chartData)
            );

            const results = await Promise.all(promises);
            // Filter out any undefined/null if that happens, though execute always returns a result object
            setScriptResults(results);
        };

        runScripts();
    }, [chartData, scripts]); // Re-run when data updates or scripts change

    // Run specific code (from editor)
    const handleRunScript = async (code: string) => {
        if (!chartData) return;
        setExecutionLogRunning(true);
        const res = await ScriptEngine.execute(code, chartData);
        setExecutionLogRunning(false);
        setExecutionLogs(res.logs);
        setExecutionError(res.error);

        // UX Improvement: Await feedback immediately by enabling script
        if (activeScriptId) {
            setScripts(prev => prev.map(s => {
                if (s.id === activeScriptId) {
                    return { ...s, code, enabled: true };
                }
                return s;
            }));
        }
    };

    const handleSaveScript = (updated: Script) => {
        setScripts(prev => prev.map(s => s.id === updated.id ? updated : s));
        // TODO: Persist to DB
    };

    const handleCreateScript = () => {
        const newScript: Script = {
            id: Date.now().toString(),
            name: "New Script",
            code: "// Write your strategy here...",
            enabled: false
        };
        setScripts(prev => [...prev, newScript]);
        setActiveScriptId(newScript.id);
    };

    const handleDeleteScript = (id: string) => {
        setScripts(prev => prev.filter(s => s.id !== id));
        if (activeScriptId === id) setActiveScriptId(null);
    };

    const handleToggleScript = (id: string) => {
        setScripts(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    const activeScript = scripts.find(s => s.id === activeScriptId);

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
    const [rightTab, setRightTab] = useState<"ai" | "watchlist" | "news">("watchlist"); // Default to watchlist initially
    const [showAIInsights, setShowAIInsights] = useState(true);

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
                            <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value} % ` }} />
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

                        {/* Intervals */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground mr-1 uppercase">Int</span>
                            {['5m', '15m', '1H', '4H', '1D'].map(int => (
                                <button
                                    key={int}
                                    onClick={() => handleIntervalChange(int)}
                                    className={cn(
                                        "px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-white/5 transition-colors relative",
                                        activeInterval === int ? "text-primary bg-primary/10" : "text-muted-foreground",
                                        // Highlight default if it's not the active one (or even if it is, to show it's default)
                                        RANGE_CONFIG[activeRange === '1mo' ? '1M' : activeRange === '1y' ? '1Y' : activeRange === '1d' ? '1D' : activeRange === 'max' ? 'ALL' : '1D']?.default === int && "ring-1 ring-primary/30"
                                    )}
                                    disabled={!RANGE_CONFIG[activeRange === '1mo' ? '1M' : activeRange === '1y' ? '1Y' : activeRange === '1d' ? '1D' : activeRange === 'max' ? 'ALL' : '1D']?.valid.includes(int)}
                                >
                                    {int}
                                </button>
                            ))}
                        </div>

                        <div className="h-4 w-px bg-white/10 mx-2" />

                        {/* Ranges */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground mr-1 uppercase">Rng</span>
                            {['1D', '1M', '1Y', 'ALL'].map(rng => (
                                <button
                                    key={rng}
                                    onClick={() => handleRangeChange(rng)}
                                    className={cn(
                                        "px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-white/5 transition-colors relative",
                                        (activeRange === '1d' && rng === '1D') ||
                                            (activeRange === '1mo' && rng === '1M') ||
                                            (activeRange === '1y' && rng === '1Y') ||
                                            (activeRange === 'max' && rng === 'ALL')
                                            ? "text-primary bg-primary/10 ring-1 ring-primary/30"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {rng}
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
                            <span className="hidden sm:inline">Indicators</span>
                        </button>

                        <button
                            onClick={() => setIsScriptPanelOpen(!isScriptPanelOpen)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ml-1",
                                isScriptPanelOpen ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-muted-foreground hover:text-primary"
                            )}
                        >
                            <Terminal className="w-4 h-4" />
                            <span className="hidden sm:inline">Editor</span>
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
                            <TechnicalChart
                                data={chartDataToRender}
                                indicators={indicatorsData}
                                activeTool={activeTool}
                                mode={chartMode}
                                onDrawingComplete={() => setActiveTool("cursor")}
                                colors={CHART_COLORS}
                                liveDataPoint={liveCandle}
                                scriptResults={scriptResults}
                            />


                        </div>
                    </div>

                    {/* Right Panel (Collapsible / Tabbed) */}
                    <div className="w-[320px] border-l border-white/5 bg-[#0B0E11] flex flex-col z-20">
                        {/* Tabs */}
                        <div className="flex border-b border-white/5">
                            {showAIInsights && (
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
                            )}
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

                {/* Script Editor Panel */}
                {isScriptPanelOpen && (
                    <div className="h-[300px] border-t border-white/10 flex z-[100] bg-[#0B0E11] shadow-2xl relative">
                        {/* Drag Handle (Visual only for now) */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 hover:bg-white/10 cursor-ns-resize" />

                        <ScriptManager
                            scripts={scripts}
                            selectedId={activeScriptId}
                            onSelect={setActiveScriptId}
                            onCreate={handleCreateScript}
                            onDelete={handleDeleteScript}
                            onToggle={handleToggleScript}
                        />

                        <div className="flex-1 overflow-hidden">
                            {activeScript ? (
                                <ScriptEditor
                                    script={activeScript}
                                    onSave={handleSaveScript}
                                    onRun={handleRunScript}
                                    logs={executionLogs}
                                    error={executionError}
                                    isRunning={executionLogRunning}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                    <Code size={48} className="opacity-20" />
                                    <div className="text-sm">Select or create a script to start coding</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute >
    );
}
