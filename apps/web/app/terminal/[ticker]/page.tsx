"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useParams, useRouter } from "next/navigation";
import { TechnicalChart } from "@/components/TechnicalChart";
import { ArrowLeft, BrainCircuit, Activity, Layers, Loader2, BarChart2, TrendingUp as TrendingUpIcon, AreaChart as AreaChartIcon, Heart, Code, Terminal, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef } from "react";
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
import { BacktestEngine, BacktestResult } from "@/lib/backtest-engine";
import { ScriptEditor } from "@/components/ScriptEditor";
import { ScriptManager } from "@/components/ScriptManager";
import { TechnicalsPanel } from "@/components/TechnicalsPanel";
import { Separator as ResizableHandle, Panel as ResizablePanel, Group as ResizablePanelGroup, type PanelImperativeHandle } from "react-resizable-panels";
import { ChartGrid, ChartLayoutType } from "@/components/ChartGrid";
import { SmartChart } from "@/components/SmartChart";
import { AP_INTERVALS, RANGE_CONFIG } from "@/hooks/useChartData";
import { SearchBar } from "@/components/SearchBar";
import { LayoutTemplate, Search, ChevronDown } from "lucide-react";

/* 
   AP_INTERVALS and RANGE_CONFIG are now imported from hooks/useChartData 
*/


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

    // --- Multi-Chart State ---
    type ChartConfig = {
        id: string;
        interval: string;
        range: string;
        ticker?: string; // Optional override
        mode: "candle" | "area" | "line" | "heikin";
        indicators: IndicatorConfig[];
    };

    const [chartLayout, setChartLayout] = useState<ChartLayoutType>("single");
    const [charts, setCharts] = useState<ChartConfig[]>([
        { id: "main", interval: "1h", range: "1mo", mode: "candle", indicators: [] }
    ]);
    const [activeChartId, setActiveChartId] = useState("main");

    // Helper to update active chart
    const updateActiveChart = (updates: Partial<ChartConfig>) => {
        setCharts(prev => prev.map(c => c.id === activeChartId ? { ...c, ...updates } : c));
    };

    // Helper to get active chart
    const activeChart = charts.find(c => c.id === activeChartId) || charts[0];

    // Live Data State (Global Stream)
    const { lastTrade } = useMarketStream(true); // Always listen, filter locally

    // Scripting Data Legacy Support (Hoisted)
    const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);

    // Note: Live aggregation is now handled inside SmartChart via useChartData hook.
    // We just pass `lastTrade` down.

    // Handlers
    // Handlers
    const handleIntervalChange = (val: string) => {
        updateActiveChart({ interval: val });
    };

    const handleRangeChange = (val: string) => {
        // Map to API Range
        let apiRng = val.toLowerCase();
        if (val === 'ALL') apiRng = 'max';
        if (val === 'YTD') apiRng = 'ytd';
        if (val === '1M') apiRng = '1mo';
        if (val === '3M') apiRng = '3mo';
        if (val === '6M') apiRng = '6mo';

        // Get Config for this UI Range
        const config = RANGE_CONFIG[val];
        if (!config) return;

        // Check if current activeInterval is valid for this range
        let newInterval = activeChart.interval;
        if (!config.valid.includes(activeChart.interval)) {
            newInterval = config.default;
        }

        updateActiveChart({ range: apiRng, interval: newInterval });
    };

    // Layout Change Handler
    const handleLayoutChange = (newLayout: ChartLayoutType) => {
        setChartLayout(newLayout);
        // If switching to multi-view, ensure we have enough chart configs
        setCharts(prev => {
            const desiredCount = newLayout === 'quad' ? 4 : (newLayout === 'single' ? 1 : 2);
            if (prev.length >= desiredCount) return prev;

            // Add new charts by cloning the active one or default
            const missing = desiredCount - prev.length;
            const newConfigs: ChartConfig[] = [];
            const base = prev[prev.length - 1] || prev[0];

            for (let i = 0; i < missing; i++) {
                newConfigs.push({
                    ...base,
                    id: `chart-${Date.now()}-${i}`,
                    indicators: [] // Start clean or clone? Let's start clean to unnecessary load
                });
            }
            return [...prev, ...newConfigs];
        });

        // If active chart becomes hidden (e.g. single view), reset active to main
        if (newLayout === 'single') setActiveChartId(charts[0].id);
    };

    // Removed Data Fetching UseEffect (Moved to useChartData hook)

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
    // Removed local activeIndicators state. Using activeChart.indicators.

    // Settings Dialog State
    const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

    const toggleIndicator = (type: string) => {
        const currentIndicators = activeChart.indicators;
        const exists = currentIndicators.some(i => i.type === type);

        if (exists) {
            updateActiveChart({ indicators: currentIndicators.filter(i => i.type !== type) });
        } else {
            // Restrain: Max 3 active indicators
            if (currentIndicators.length >= 3) {
                alert("Maximum 3 active indicators allowed used to prevent chart clutter.");
                return;
            }

            // Add new with default params
            const newConfig: IndicatorConfig = {
                id: `${type}-${Date.now()}`,
                type,
                params: DEFAULT_INDICATOR_PARAMS[type] || { period: 14 }
            };
            updateActiveChart({ indicators: [...currentIndicators, newConfig] });
        }
    };

    const handleRemoveIndicator = (id: string) => {
        updateActiveChart({ indicators: activeChart.indicators.filter(i => i.id !== id) });
    };

    const handleEditIndicator = (config: IndicatorConfig) => {
        setEditingIndicator(config);
        setIsSettingsOpen(true);
    };

    const handleSaveIndicator = (newConfig: IndicatorConfig) => {
        updateActiveChart({ indicators: activeChart.indicators.map(i => i.id === newConfig.id ? newConfig : i) });
    };

    // Removed indicatorsData memo (Calculated inside SmartChart)

    // --- Chart Data Derived ---
    // Removed chartDataToRender memo (Calculated inside SmartChart)


    // --- Scripting Engine State ---
    const [scripts, setScripts] = useState<Script[]>([]);
    const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
    const [isScriptPanelOpen, setIsScriptPanelOpen] = useState(false);
    const [scriptResults, setScriptResults] = useState<ScriptResult[]>([]);
    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

    // Layout State
    const rightPanelRef = useRef<PanelImperativeHandle>(null);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

    const toggleRightPanel = () => {
        const panel = rightPanelRef.current;
        if (panel) {
            if (isRightPanelOpen) panel.collapse();
            else panel.expand();
        }
    };

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
    }, [scripts]);

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

    const handleRunBacktest = async (code: string) => {
        if (!chartData) return;
        setExecutionLogRunning(true);
        setBacktestResult(null); // Reset previous result

        // 1. Execute Script to get Signals
        const scriptRes = await ScriptEngine.execute(code, chartData);
        setExecutionLogs(scriptRes.logs);
        setExecutionError(scriptRes.error);

        if (!scriptRes.error) {
            // 2. Run Backtest Engine
            try {
                const btResult = BacktestEngine.run(scriptRes.signals, chartData);
                setBacktestResult(btResult);
                setExecutionLogs(prev => [...prev, "Backtest completed successfully."]);
            } catch (e: any) {
                setExecutionError("Backtest Error: " + e.message);
                setExecutionLogs(prev => [...prev, "Backtest Error: " + e.message]);
            }
        }

        setExecutionLogRunning(false);
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




    // --- Workspace State ---
    const [activeTool, setActiveTool] = useState("cursor");
    const [rightTab, setRightTab] = useState<"ai" | "watchlist" | "news" | "technicals">("watchlist"); // Default to watchlist initially
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
                    activeIndicators={activeChart.indicators.map(i => i.type)}
                />

                {/* Top Toolbar */}
                <header className="h-12 border-b border-white/5 flex items-center justify-between px-2 bg-[#0B0E11] z-50 shrink-0">
                    <div className="flex items-center gap-1">
                        <button onClick={() => router.push('/')} className="p-2 hover:bg-white/5 rounded text-muted-foreground">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="h-6 w-px bg-white/10 mx-1" />
                        <div className="flex items-center gap-2 px-2 relative group">
                            {/* Ticker Selector */}
                            {!isSearchOpen ? (
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="text-left hover:bg-white/5 p-1 -ml-1 rounded transition-colors"
                                >
                                    <h1 className="font-bold text-sm tracking-tight">{activeChart?.ticker || ticker}</h1>
                                    <span className="text-[10px] bg-white/5 px-1 rounded text-muted-foreground">NSE</span>
                                </button>
                            ) : (
                                <div className="absolute top-0 left-0 w-[400px] z-50">
                                    <SearchBar
                                        className="w-full h-8 text-xs"
                                        onSelect={(val) => {
                                            updateActiveChart({ ticker: val });
                                            setIsSearchOpen(false);
                                        }}
                                    />
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsSearchOpen(false)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {/* Layout Selector */}
                        {/* Layout Selector Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                                className={cn(
                                    "p-1.5 rounded hover:bg-white/5 transition-colors text-muted-foreground hover:text-primary",
                                    isLayoutMenuOpen && "bg-white/5 text-primary"
                                )}
                                title="Change Layout"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>

                            {isLayoutMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsLayoutMenuOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 bg-[#0B0E11] border border-white/10 rounded-lg shadow-xl z-50 p-1 min-w-[120px] flex flex-col gap-1">
                                        <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase tracking-wider font-semibold">Layout</div>
                                        <button
                                            onClick={() => { handleLayoutChange('single'); setIsLayoutMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", chartLayout === 'single' && "text-primary bg-primary/10")}
                                        >
                                            <div className="w-3 h-3 border border-current rounded-sm" />
                                            <span>Single</span>
                                        </button>
                                        <button
                                            onClick={() => { handleLayoutChange('vertical'); setIsLayoutMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", chartLayout === 'vertical' && "text-primary bg-primary/10")}
                                        >
                                            <div className="w-3 h-3 border border-current rounded-sm flex"><div className="w-1/2 border-r border-current"></div></div>
                                            <span>Split</span>
                                        </button>
                                        <button
                                            onClick={() => { handleLayoutChange('quad'); setIsLayoutMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", chartLayout === 'quad' && "text-primary bg-primary/10")}
                                        >
                                            <LayoutTemplate className="w-3 h-3" />
                                            <span>Grid (4)</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {/* Chart Types */}
                        {/* Chart Mode Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                                className={cn(
                                    "p-1.5 rounded hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-medium",
                                    isModeMenuOpen ? "bg-white/5 text-primary" : "text-muted-foreground"
                                )}
                                title="Chart Type"
                            >
                                {activeChart.mode === 'candle' && <BarChart2 className="w-4 h-4" />}
                                {activeChart.mode === 'heikin' && <Activity className="w-4 h-4 rotate-90" />}
                                {activeChart.mode === 'line' && <TrendingUpIcon className="w-4 h-4" />}
                                {activeChart.mode === 'area' && <AreaChartIcon className="w-4 h-4" />}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>

                            {isModeMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsModeMenuOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 bg-[#0B0E11] border border-white/10 rounded-lg shadow-xl z-50 p-1 min-w-[140px] flex flex-col gap-1">
                                        <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase tracking-wider font-semibold">Style</div>
                                        <button
                                            onClick={() => { updateActiveChart({ mode: 'candle' }); setIsModeMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", activeChart.mode === 'candle' && "text-primary bg-primary/10")}
                                        >
                                            <BarChart2 className="w-3.5 h-3.5" />
                                            <span>Candles</span>
                                        </button>
                                        <button
                                            onClick={() => { updateActiveChart({ mode: 'heikin' }); setIsModeMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", activeChart.mode === 'heikin' && "text-primary bg-primary/10")}
                                        >
                                            <Activity className="w-3.5 h-3.5 rotate-90" />
                                            <span>Heikin Ashi</span>
                                        </button>
                                        <button
                                            onClick={() => { updateActiveChart({ mode: 'line' }); setIsModeMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", activeChart.mode === 'line' && "text-primary bg-primary/10")}
                                        >
                                            <TrendingUpIcon className="w-3.5 h-3.5" />
                                            <span>Line</span>
                                        </button>
                                        <button
                                            onClick={() => { updateActiveChart({ mode: 'area' }); setIsModeMenuOpen(false); }}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-left", activeChart.mode === 'area' && "text-primary bg-primary/10")}
                                        >
                                            <AreaChartIcon className="w-3.5 h-3.5" />
                                            <span>Area</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {/* Intervals */}
                        {/* Intervals */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground mr-1 uppercase">Int</span>
                            {AP_INTERVALS.map(int => {
                                // Find current UI Range Key for validation logic
                                const currentUiRange = Object.keys(RANGE_CONFIG).find(key => {
                                    let apiR = key.toLowerCase();
                                    if (key === 'ALL') apiR = 'max';
                                    if (key === 'YTD') apiR = 'ytd';
                                    if (key === '1M') apiR = '1mo';
                                    return apiR === activeChart.range;
                                }) || '1D';

                                const isValid = RANGE_CONFIG[currentUiRange]?.valid.includes(int.value);

                                return (
                                    <button
                                        key={int.value}
                                        onClick={() => handleIntervalChange(int.value)}
                                        disabled={!isValid}
                                        className={cn(
                                            "px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-white/5 transition-colors relative",
                                            activeChart.interval === int.value ? "text-primary bg-primary/10" : "text-muted-foreground",
                                            !isValid && "opacity-30 cursor-not-allowed"
                                        )}
                                    >
                                        {int.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="h-4 w-px bg-white/10 mx-2" />

                        {/* Ranges */}
                        <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground mr-1 uppercase">Rng</span>
                            {Object.keys(RANGE_CONFIG).map(rng => {
                                let apiR = rng.toLowerCase();
                                if (rng === 'ALL') apiR = 'max';
                                if (rng === 'YTD') apiR = 'ytd';
                                if (rng === '1M') apiR = '1mo';

                                return (
                                    <button
                                        key={rng}
                                        onClick={() => handleRangeChange(rng)}
                                        className={cn(
                                            "px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-white/5 transition-colors relative",
                                            activeChart.range === apiR
                                                ? "text-primary bg-primary/10 ring-1 ring-primary/30"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {rng}
                                    </button>
                                )
                            })}
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", !isRightPanelOpen && "opacity-50")}
                            onClick={toggleRightPanel}
                            title="Toggle Sidebar"
                        >
                            <PanelRight className="w-4 h-4" />
                        </Button>
                        <UserMenu />
                    </div>
                </header>

                {/* Resizable Main Layout */}
                <div className="flex-1 overflow-hidden">
                    <ResizablePanelGroup orientation="vertical">
                        {/* Top Section: Chart + Right Panel */}
                        <ResizablePanel defaultSize={isScriptPanelOpen ? 70 : 100} minSize={20}>
                            <ResizablePanelGroup orientation="horizontal">
                                {/* Chart Area (with Toolbar) */}
                                <ResizablePanel defaultSize={75} minSize={30}>
                                    <div className="flex h-full w-full min-w-0 overflow-hidden">
                                        <DrawingToolbar activeTool={activeTool} onToolSelect={setActiveTool} />
                                        <div className="flex-1 flex flex-col relative bg-[#050505] min-w-0 overflow-hidden">
                                            <ChartGrid
                                                layout={chartLayout}
                                                charts={charts.map(c => c.id)}
                                                activeChartId={activeChartId}
                                                onActivateChart={setActiveChartId}
                                                renderChart={(id, syncProps) => {
                                                    const config = charts.find(c => c.id === id);
                                                    if (!config) return null;
                                                    return (
                                                        <SmartChart
                                                            key={id}
                                                            id={id}
                                                            ticker={config.ticker || ticker}
                                                            interval={config.interval}
                                                            range={config.range}
                                                            mode={config.mode}
                                                            indicators={config.indicators}
                                                            lastTrade={lastTrade}
                                                            activeTool={activeTool}
                                                            onDrawingComplete={() => setActiveTool("cursor")}
                                                            scriptResults={id === activeChartId ? scriptResults : []}
                                                            syncProps={syncProps}
                                                            colors={CHART_COLORS}
                                                            isActive={id === activeChartId}
                                                            onDataLoad={(d) => {
                                                                // Sync legacy chartData for Scripts if this is active chart
                                                                if (id === activeChartId) {
                                                                    setChartData(d);
                                                                }
                                                            }}
                                                        />
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                </ResizablePanel>

                                <ResizableHandle className="w-1 bg-white/5 hover:bg-white/10 transition-colors" />

                                {/* Right Panel */}
                                <ResizablePanel
                                    panelRef={rightPanelRef}
                                    defaultSize={25}
                                    minSize={15}
                                    collapsible={true}
                                    collapsedSize={0}
                                    onResize={(size) => setIsRightPanelOpen(size.asPercentage > 0)}
                                >
                                    <div className="h-full w-full border-l border-white/5 bg-[#0B0E11] flex flex-col min-w-0 overflow-hidden">
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
                                                    AI
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
                                                Watch
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
                                            <button
                                                onClick={() => setRightTab("technicals")}
                                                className={cn(
                                                    "flex-1 py-3 text-xs font-medium uppercase tracking-wider hover:bg-white/5 transition-colors relative",
                                                    rightTab === "technicals" ? "text-primary " : "text-muted-foreground"
                                                )}
                                            >
                                                Techs
                                                {rightTab === "technicals" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                                            </button>
                                        </div>

                                        {/* Tab Content */}
                                        <div className="flex-1 overflow-hidden overflow-y-auto">
                                            {rightTab === "ai" && renderAIContent()}
                                            {rightTab === "watchlist" && renderWatchlistContent()}
                                            {rightTab === "news" && <NewsPanel ticker={ticker} />}
                                            {rightTab === "technicals" && <TechnicalsPanel data={chartData || []} />}
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        </ResizablePanel>

                        {/* Bottom Section: Script Editor */}
                        {isScriptPanelOpen && (
                            <>
                                <ResizableHandle className="h-1 bg-white/5 hover:bg-white/10 transition-colors" />
                                <ResizablePanel defaultSize={30} minSize={10} collapsible={true} collapsedSize={0} onResize={(size) => { if (size.asPercentage === 0) setIsScriptPanelOpen(false); }}>
                                    <div className="h-full w-full border-t border-white/10 flex bg-[#0B0E11] overflow-hidden">
                                        <ScriptManager
                                            scripts={scripts}
                                            selectedId={activeScriptId}
                                            onSelect={setActiveScriptId}
                                            onCreate={handleCreateScript}
                                            onDelete={handleDeleteScript}
                                            onToggle={handleToggleScript}
                                        />
                                        <div className="flex-1 h-full overflow-hidden">
                                            {activeScript ? (
                                                <ScriptEditor
                                                    script={activeScript}
                                                    onSave={handleSaveScript}
                                                    onRun={handleRunScript}
                                                    onBacktest={handleRunBacktest}
                                                    logs={executionLogs}
                                                    error={executionError}
                                                    isRunning={executionLogRunning}
                                                    backtestResult={backtestResult}
                                                    chartData={chartData || []}
                                                />
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                                    Select or create a script to edit
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
                </div>
            </div>
        </ProtectedRoute>
    );
}
