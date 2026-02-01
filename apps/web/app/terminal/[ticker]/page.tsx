"use client";
import ProtectedRoute from "@/components/ProtectedRoute"; // Import added correctly
import { useParams, useRouter } from "next/navigation";
import { TechnicalChart } from "@/components/TechnicalChart";
import { ArrowLeft, BrainCircuit, Zap, Activity, Eye, Share2, Layers, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button"; // Assuming I check/create this simple button or use primitive
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchChartData, ChartDataPoint } from "@/lib/api";

const TIMEFRAMES = ['1m', '5m', '15m', '1H', 'D', '1Y', 'ALL'];

export default function TerminalPage() {
    const params = useParams();
    const router = useRouter();
    const ticker = (params.ticker as string).toUpperCase();

    // State
    const [range, setRange] = useState("1mo"); // Default to 1mo or closest match like 'D'
    const [activeTf, setActiveTf] = useState("D"); // UI State
    const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
    const [loading, setLoading] = useState(true);

    // Map UI TF to API Range
    const handleTimeframeChange = (tf: string) => {
        setActiveTf(tf);
        setLoading(true);
        // Map: 1m -> 1m, 5m -> 5m, 1H -> 1H, etc.
        // API supports: 1m, 5m, 15m, 1H, D, 1Y, ALL
        let apiRange = tf;
        if (tf === '4H') apiRange = '4H'; // If we add 4H later
        setRange(apiRange);
    };

    useEffect(() => {
        const loadData = async () => {
            // If chartData is null or range changed
            const data = await fetchChartData(ticker, activeTf);
            setChartData(data);
            setLoading(false);
        };
        loadData();
    }, [ticker, activeTf]);



    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col overflow-hidden font-sans selection:bg-primary/30">

                {/* Navigation Bar */}
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0B0E11]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-lg tracking-tight">{ticker}</h1>
                                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono">AI-DRIVEN</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground mr-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                Market Open
                            </span>
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm font-medium hover:bg-primary/20 transition-colors">
                            <Share2 className="w-4 h-4" />
                            Share
                        </button>
                    </div>
                </header>

                {/* Main Content - Bento Grid */}
                <main className="flex-1 p-3 grid grid-cols-12 grid-rows-6 gap-3 overflow-hidden">

                    {/* Chart Area (Main) */}
                    <div className="col-span-12 lg:col-span-9 row-span-4 lg:row-span-6 glass rounded-xl border border-white/5 relative overflow-hidden flex flex-col">
                        <div className="absolute top-4 left-4 z-10 flex gap-2">
                            {/* Timeframe Selectors */}
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => handleTimeframeChange(tf)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md glass transition-colors border border-transparent",
                                        activeTf === tf ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground hover:bg-white/10"
                                    )}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        {/* Stats overlay on Chart - Dynamic later? For now Mock is OK or derive from last chartData point */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col items-end pointer-events-none">
                            <div className="text-3xl font-mono font-bold">
                                {chartData && chartData.length > 0 ?
                                    (ticker.includes('NVDA') || ticker.includes('AAPL') ? '$' : '₹') + chartData[chartData.length - 1].close.toFixed(2)
                                    : "..."}
                            </div>
                        </div>

                        <div className="flex-1 w-full h-full pt-12 pb-2 relative">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            )}
                            <TechnicalChart
                                data={chartData || []}
                                colors={{
                                    backgroundColor: "transparent",
                                    textColor: "#64748B",
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Side Column */}

                    {/* AI Confidence / Prediction Tile */}
                    <div className="col-span-12 lg:col-span-3 row-span-2 glass rounded-xl p-5 border border-white/5 flex flex-col relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />

                        <div className="flex items-center gap-2 mb-4 z-10">
                            <BrainCircuit className="w-5 h-5 text-primary" />
                            <div>
                                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground block leading-none">AI Confidence</span>
                                <span className="text-[10px] text-muted-foreground/60">Includes uncertainty estimation</span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center z-10">
                            <div className="relative">
                                <svg className="w-32 h-32 md:w-40 md:h-40 rotate-[135deg]">
                                    {/* Background Track */}
                                    <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#1E293B" strokeWidth="8" />

                                    {/* Uncertainty Interval (82% - 92%) - Mocked visual representation */}
                                    {/* Roughly 270 degrees total. 87% is essentially full. 
                                 Let's simulate a wider, fainter band around the tip */}
                                    <circle
                                        cx="50%" cy="50%" r="48%" fill="none"
                                        stroke="#D4AF37" strokeWidth="16" strokeOpacity="0.15"
                                        strokeDasharray="300" strokeDashoffset="40"
                                        strokeLinecap="butt"
                                    />

                                    {/* Main Confidence Value */}
                                    <circle
                                        cx="50%" cy="50%" r="48%" fill="none"
                                        stroke="#D4AF37" strokeWidth="8"
                                        strokeDasharray="300" strokeDashoffset="40"
                                        strokeLinecap="round"
                                        className="drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-[-135deg]">
                                    <span className="text-4xl md:text-5xl font-bold font-mono text-primary">87<span className="text-xl">%</span></span>
                                    <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-white/5">
                                        <span>±5.2%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Insight / Rationale Tile - Enhanced with Visual Attribution */}
                    <div className="col-span-12 lg:col-span-3 row-span-2 glass rounded-xl p-5 border border-white/5 flex flex-col overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <Layers className="w-5 h-5 text-secondary" />
                            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key Drivers (Attribution)</span>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: "RSI Divergence", value: 85, color: "bg-success" },
                                { label: "Vol. Breakout", value: 65, color: "bg-primary" },
                                { label: "Sector Momentum", value: 30, color: "bg-gray-600" },
                                { label: "Insiders", value: 45, color: "bg-success" }
                            ].map((item, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-300">{item.label}</span>
                                        <span className="text-muted-foreground font-mono">{item.value}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.value}%` }}
                                            transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                            className={cn("h-full rounded-full", item.color)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts / Risks Tile */}
                    <div className="col-span-12 lg:col-span-3 row-span-2 glass rounded-xl p-5 border border-white/5 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                            <AlertTriangle className="w-24 h-24 text-danger" />
                        </div>

                        <div className="flex items-center gap-2 mb-4 z-10">
                            <Activity className="w-5 h-5 text-danger" />
                            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk Factors</span>
                        </div>

                        <div className="z-10 space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Volatility</span>
                                    <span className="text-danger font-medium">Critical</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-danger w-[85%]" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Upcoming earnings report in 2 days may trigger high variance. Stop-loss recommended at <span className="text-white font-mono">₹1,410</span>.
                            </p>
                        </div>
                    </div>

                </main>
            </div>
        </ProtectedRoute>
    );
}
