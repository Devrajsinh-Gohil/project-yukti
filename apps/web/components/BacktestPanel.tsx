
"use client";

import { BacktestResult, Trade } from "@/lib/backtest-engine";
import { useEffect, useRef } from "react";
import * as LightweightCharts from "lightweight-charts";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, BarChart3, AlertTriangle } from "lucide-react";

interface BacktestPanelProps {
    result: BacktestResult;
    onClose: () => void;
}

export function BacktestPanel({ result, onClose }: BacktestPanelProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const { metrics, trades, equityCurve } = result;

    // Render Equity Curve
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = LightweightCharts.createChart(chartContainerRef.current, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: "transparent" },
                textColor: "#64748B",
                attributionLogo: false
            },
            width: chartContainerRef.current.clientWidth,
            height: 200,
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" }
            },
            timeScale: {
                timeVisible: true,
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
        });

        const areaSeries = chart.addSeries(LightweightCharts.AreaSeries, {
            lineColor: "#3B82F6",
            topColor: "rgba(59, 130, 246, 0.4)",
            bottomColor: "rgba(59, 130, 246, 0)",
            lineWidth: 2,
        });

        // Ensure time is unique and sorted
        const data = equityCurve.map(pt => ({ time: pt.time as any, value: pt.value }));
        areaSeries.setData(data);
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [equityCurve]);

    return (
        <div className="flex flex-col h-full bg-[#0B0E11] border-l border-white/10 text-slate-300 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#14181D]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-500" />
                    Backtest Results
                </h3>
                <button onClick={onClose} className="text-xs hover:text-white transition-colors">Close</button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 p-4">
                <MetricCard
                    label="Net Profit"
                    value={`$${metrics.netProfit.toFixed(2)}`}
                    subValue={`${metrics.netProfitPercent.toFixed(2)}%`}
                    isPositive={metrics.netProfit >= 0}
                />
                <MetricCard
                    label="Active Trades"
                    value={metrics.totalTrades.toString()}
                    icon={<Activity size={14} />}
                />
                <MetricCard
                    label="Win Rate"
                    value={`${metrics.winRate.toFixed(1)}%`}
                    isPositive={metrics.winRate > 50}
                />
                <MetricCard
                    label="Profit Factor"
                    value={metrics.profitFactor.toFixed(2)}
                    isPositive={metrics.profitFactor > 1.5}
                />
                <MetricCard
                    label="Max Drawdown"
                    value={`-${metrics.maxDrawdown.toFixed(2)}%`}
                    isPositive={false}
                    isNegative={true}
                />
                <MetricCard
                    label="Sharpe Ratio"
                    value={metrics.sharpeRatio.toFixed(2)}
                    isPositive={metrics.sharpeRatio > 1}
                />
            </div>

            {/* Equity Curve */}
            <div className="p-4 border-t border-white/10">
                <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Equity Curve</h4>
                <div ref={chartContainerRef} className="w-full h-[200px]" />
            </div>

            {/* Recent Trades List */}
            <div className="flex-1 p-4 border-t border-white/10">
                <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Trade List ({trades.length})</h4>
                <div className="space-y-2">
                    {trades.length === 0 && <span className="text-xs italic text-slate-600">No trades executed.</span>}
                    {trades.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded border border-white/5">
                            <div className="flex flex-col">
                                <span className={`font-bold ${t.side === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{t.side}</span>
                                <span className="text-slate-500">{new Date(t.entryTime).toLocaleDateString()}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`font-mono ${t.pnl && t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.pnl ? `${t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}` : 'OPEN'}
                                </span>
                                <span className="text-slate-500 font-mono">{t.pnlPercent ? `${t.pnlPercent.toFixed(2)}%` : '-'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, subValue, isPositive, isNegative, icon }: any) {
    let colorClass = "text-white";
    if (isPositive) colorClass = "text-green-400";
    if (isNegative) colorClass = "text-red-400";

    return (
        <div className="bg-white/5 border border-white/5 rounded p-3 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                {icon} {label}
            </span>
            <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold font-mono ${colorClass}`}>{value}</span>
                {subValue && <span className={`text-xs ${colorClass}`}>{subValue}</span>}
            </div>
        </div>
    );
}
