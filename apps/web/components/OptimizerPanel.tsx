"use client";

import { useState, useEffect } from "react";
import { ScriptEngine, ScriptParameter, ScriptResult } from "@/lib/scripting-engine";
import { BacktestEngine, BacktestResult } from "@/lib/backtest-engine";
import { ChartDataPoint } from "@/lib/api";

interface OptimizerPanelProps {
    scriptCode: string;
    chartData: ChartDataPoint[];
    onApplyParams: (params: Record<string, number>) => void;
}

interface OptimizationResult {
    params: Record<string, number>;
    netProfit: number;
    sharpe?: number;
    maxDrawdown?: number;
    trades: number;
}

export function OptimizerPanel({ scriptCode, chartData, onApplyParams }: OptimizerPanelProps) {
    const [inputs, setInputs] = useState<ScriptParameter[]>([]);
    const [ranges, setRanges] = useState<Record<string, { start: number, end: number, step: number }>>({});
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<OptimizationResult[]>([]);

    // 1. Scan for Inputs on Open
    useEffect(() => {
        const detected = ScriptEngine.scanInputs(scriptCode);
        setInputs(detected);

        // Initialize ranges from detected options or defaults
        const initialRanges: Record<string, any> = {};
        detected.forEach(inp => {
            initialRanges[inp.title] = {
                start: inp.min ?? Math.max(1, inp.defval - 5),
                end: inp.max ?? (inp.defval + 5),
                step: inp.step ?? 1
            };
        });
        setRanges(initialRanges);
    }, [scriptCode]);

    const handleRunOptimization = async () => {
        setIsRunning(true);
        setResults([]);

        // 1. Generate Combinations (Cartesian Product)
        const keys = Object.keys(ranges);
        if (keys.length === 0) {
            setIsRunning(false);
            return;
        }

        const variations: Record<string, number>[] = [];

        const generate = (index: number, current: Record<string, number>) => {
            if (index === keys.length) {
                variations.push({ ...current });
                return;
            }

            const key = keys[index];
            const range = ranges[key];
            // Safety Check: Limit iterations per param to avoid infinite loop
            // Use local variable to avoid mutation of state
            const stepValue = (!range.step || range.step <= 0) ? 1 : range.step;

            for (let val = range.start; val <= range.end; val += stepValue) {
                // Round to remove float errors
                const cleanVal = Math.round(val * 100) / 100;
                current[key] = cleanVal;
                generate(index + 1, current);
            }
        };

        generate(0, {});

        console.log(`[Optimizer] Generated ${variations.length} combinations.`);

        // Safety Cap
        const MAX_RUNS = 200;
        const runBatch = variations.length > MAX_RUNS ? variations.slice(0, MAX_RUNS) : variations;

        // 2. Run Batch
        const tempResults: OptimizationResult[] = [];

        for (let i = 0; i < runBatch.length; i++) {
            setProgress(Math.round(((i + 1) / runBatch.length) * 100));

            const params = runBatch[i];

            // A. Run Logic (Script)
            try {
                // TODO: Need to pass mtfData? For now assume basic script.
                // We should pass empty mtfData or propagate it if available in props.
                const scriptRes = await ScriptEngine.execute(scriptCode, chartData, {}, params);

                // B. Run Backtest
                if (scriptRes.signals.length > 0) {
                    // Simplified Backtest
                    const bt = BacktestEngine.run(scriptRes.signals, chartData, {
                        initialCapital: 10000,
                        commissionPercent: 0.1,
                        slippagePercent: 0.05
                    });

                    tempResults.push({
                        params,
                        netProfit: bt.metrics.netProfit,
                        sharpe: bt.metrics.sharpeRatio,
                        maxDrawdown: bt.metrics.maxDrawdown,
                        trades: bt.metrics.totalTrades
                    });
                } else {
                    tempResults.push({
                        params,
                        netProfit: 0,
                        trades: 0
                    });
                }
            } catch (e) {
                console.error("Opt error", e);
            }

            // Allow UI to breathe
            await new Promise(r => setTimeout(r, 1));
        }

        // Sort by Net Profit
        tempResults.sort((a, b) => b.netProfit - a.netProfit);

        setResults(tempResults);
        setIsRunning(false);
    };

    if (inputs.length === 0) return (
        <div className="p-4 text-gray-400 text-sm italic border rounded border-white/10 bg-black">
            No inputs detected. Use <code>input(defval, "Title")</code> in your script.
        </div>
    );

    return (
        <div className="flex flex-col gap-4 bg-[#0A0A0A] border border-white/10 rounded p-4 text-sm h-full overflow-hidden">
            <h3 className="font-semibold text-white">Strategy Hyper-Tuner</h3>

            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {inputs.map(inp => (
                    <div key={inp.title} className="p-2 bg-white/5 rounded border border-white/10">
                        <label className="text-xs text-gray-400 block mb-1">{inp.title}</label>
                        <div className="flex gap-1 items-center">
                            <input
                                className="w-12 bg-black border border-white/20 px-1 py-0.5 rounded text-white"
                                type="number"
                                value={ranges[inp.title]?.start}
                                onChange={e => setRanges(prev => ({ ...prev, [inp.title]: { ...prev[inp.title], start: Number(e.target.value) } }))}
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                className="w-12 bg-black border border-white/20 px-1 py-0.5 rounded text-white"
                                type="number"
                                value={ranges[inp.title]?.end}
                                onChange={e => setRanges(prev => ({ ...prev, [inp.title]: { ...prev[inp.title], end: Number(e.target.value) } }))}
                            />
                            <span className="text-gray-500">step</span>
                            <input
                                className="w-10 bg-black border border-white/20 px-1 py-0.5 rounded text-white"
                                type="number"
                                value={ranges[inp.title]?.step}
                                onChange={e => setRanges(prev => ({ ...prev, [inp.title]: { ...prev[inp.title], step: Number(e.target.value) } }))}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
                <button
                    onClick={handleRunOptimization}
                    disabled={isRunning}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition disabled:opacity-50"
                >
                    {isRunning ? `Running (${progress}%)` : "Start Optimization"}
                </button>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto border border-white/10 rounded">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 sticky top-0">
                        <tr>
                            <th className="p-2 border-b border-white/10">Profit %</th>
                            <th className="p-2 border-b border-white/10">Sharpe</th>
                            <th className="p-2 border-b border-white/10">DD %</th>
                            <th className="p-2 border-b border-white/10">Trades</th>
                            <th className="p-2 border-b border-white/10">Params</th>
                            <th className="p-2 border-b border-white/10">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((res, i) => (
                            <tr key={i} className="hover:bg-white/5 border-b border-white/5">
                                <td className={`p-2 ${res.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {res.netProfit.toFixed(2)}%
                                </td>
                                <td className="p-2">{res.sharpe?.toFixed(2) ?? '-'}</td>
                                <td className="p-2 text-red-300">{Math.abs(res.maxDrawdown || 0).toFixed(2)}%</td>
                                <td className="p-2">{res.trades}</td>
                                <td className="p-2 font-mono text-xs text-gray-400">
                                    {Object.entries(res.params).map(([k, v]) => `${k}=${v}`).join(", ")}
                                </td>
                                <td className="p-2">
                                    <button
                                        onClick={() => onApplyParams(res.params)}
                                        className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
                                    >
                                        Apply
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {results.length === 0 && !isRunning && (
                    <div className="p-8 text-center text-gray-500">
                        Results will appear here.
                    </div>
                )}
            </div>
        </div>
    );
}
