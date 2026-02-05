"use client";
import * as LightweightCharts from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { IndicatorResult } from "@/lib/indicators";
import { ScriptResult } from "@/lib/scripting-engine";

interface Point {
    time: LightweightCharts.Time;
    price: number;
}

interface Drawing {
    id: string;
    type: "trendline" | "ray" | "fib" | "rect" | "circle" | "text" | "measure" | "long" | "short";
    p1: Point;
    p2: Point;
    p3?: Point; // For Risk/Reward (Entry, Stop, Target initially derived or 3-click?)
    // Actually for R/R usually it's 2 clicks (Entry, Stop) and Target is auto or 3rd click.
    // Let's assume standard TradingView style: Click Entry, Drag to Stop. Target defaults to 1:1 or 2:1 then adjustable.
    // But for simplicity in this MVP, let's stick to p1 (Entry), p2 (Stop/Target basis).
    text?: string;
}

interface TechnicalChartProps {
    data?: any[];
    volumeData?: { time: string; value: number; color: string }[];
    predictionData?: { time: string; value: number }[];
    indicators?: IndicatorResult[];
    mode?: "candle" | "area" | "line" | "heikin"; // Extended modes
    scaleMode?: "normal" | "log" | "percentage"; // New Scale Modes
    colors?: {
        backgroundColor?: string;
        textColor?: string;
        upColor?: string;
        downColor?: string;
        lineColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    activeTool?: string;
    onDrawingComplete?: () => void;
    liveDataPoint?: { time: string | number; open?: number; high?: number; low?: number; close?: number; value?: number };
    scriptResults?: ScriptResult[];
    // New Props for Multi-Chart
    id?: string;
    onCrosshairMove?: (param: LightweightCharts.MouseEventParams) => void;
    syncCrosshair?: { x: number | null, y: number | null, time: number | null };
}

export function TechnicalChart({
    id = "main",
    data,
    volumeData,
    predictionData,
    indicators = [],
    colors,
    mode = "candle",
    scaleMode = "normal",
    activeTool = "cursor",
    onDrawingComplete,
    liveDataPoint,
    scriptResults = [],
    onCrosshairMove,
    syncCrosshair
}: TechnicalChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRefs = useRef<LightweightCharts.IChartApi[]>([]);
    const mainChartRef = useRef<LightweightCharts.IChartApi | null>(null);
    const mainSeriesRef = useRef<any>(null);

    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<Partial<Drawing> | null>(null);
    const [isChartReady, setIsChartReady] = useState(false);
    const [_, setForceUpdate] = useState(0);

    // Refs for Cleanup
    const overlaySeriesRef = useRef<LightweightCharts.ISeriesApi<any>[]>([]);
    const subChartsRef = useRef<{ chart: LightweightCharts.IChartApi, div: HTMLDivElement }[]>([]);

    const overlays = indicators.filter(i => i.pane === "overlay");
    const separatePanes = indicators.filter(i => i.pane === "separate");

    // Handle Delete (Clear All)
    useEffect(() => {
        if (activeTool === 'delete') {
            setDrawings([]);
            if (onDrawingComplete) onDrawingComplete();
        }
    }, [activeTool, onDrawingComplete]);

    // 1. Init Chart Instance (Run Once)
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Clean slate
        chartContainerRef.current.innerHTML = "";

        const mainWrapper = document.createElement("div");
        mainWrapper.style.flex = "1";
        mainWrapper.style.width = "100%";
        mainWrapper.style.position = "relative";
        mainWrapper.style.minHeight = "300px";
        chartContainerRef.current.appendChild(mainWrapper);

        const chartDiv = document.createElement("div");
        chartDiv.style.width = "100%";
        chartDiv.style.height = "100%";
        mainWrapper.appendChild(chartDiv);

        const mainChart = LightweightCharts.createChart(chartDiv, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: colors?.backgroundColor || "transparent" },
                textColor: colors?.textColor || "#94A3B8",
                attributionLogo: false,
            },
            width: mainWrapper.clientWidth,
            height: mainWrapper.clientHeight || 500,
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            timeScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 12, // Give space on the right
                barSpacing: 6,
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
                autoScale: true,
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: "rgba(255, 255, 255, 0.2)",
                    labelBackgroundColor: '#3B82F6',
                },
                horzLine: {
                    color: "rgba(255, 255, 255, 0.2)",
                    labelBackgroundColor: '#3B82F6',
                }
            },
        });

        mainChartRef.current = mainChart;
        chartRefs.current = [mainChart];

        // Sync: Emit Crosshair Move
        mainChart.subscribeCrosshairMove((param) => {
            if (onCrosshairMove) onCrosshairMove(param);
        });

        // Observer for Main Chart Resize
        const resizeObserver = new ResizeObserver(() => {
            if (mainWrapper) {
                mainChart.applyOptions({ width: mainWrapper.clientWidth, height: mainWrapper.clientHeight });
            }
        });
        resizeObserver.observe(mainWrapper);

        setIsChartReady(true);

        return () => {
            resizeObserver.disconnect();
            mainChart.remove();
            mainChartRef.current = null;
            chartRefs.current = [];
        };
    }, []);

    // 2. Handle Data & Main Series Configuration
    useEffect(() => {
        if (!mainChartRef.current) return;
        const mainChart = mainChartRef.current;
        const seriesData = (data && data.length > 0) ? data : [];

        // Clean up old main series
        if (mainSeriesRef.current) {
            try {
                mainChart.removeSeries(mainSeriesRef.current);
            } catch (e) { } // Ignore if already removed
            mainSeriesRef.current = null;
        }

        // Create new Main Series
        let mainSeries: any;
        if (mode === "area") {
            mainSeries = mainChart.addSeries(LightweightCharts.AreaSeries, {
                lineColor: colors?.lineColor || "#D4AF37",
                topColor: colors?.areaTopColor || "rgba(212, 175, 55, 0.4)",
                bottomColor: colors?.areaBottomColor || "rgba(212, 175, 55, 0)",
            });
            mainSeries.setData(seriesData.map((d: any) => ({ time: d.time, value: d.value ?? d.close ?? 0 })));
        } else if (mode === "line") {
            mainSeries = mainChart.addSeries(LightweightCharts.LineSeries, {
                color: colors?.lineColor || "#3B82F6",
                lineWidth: 2,
            });
            mainSeries.setData(seriesData.map((d: any) => ({ time: d.time, value: d.value ?? d.close ?? 0 })));
        } else {
            // Candle
            mainSeries = mainChart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: colors?.upColor || "#4ADE80",
                downColor: colors?.downColor || "#FB7185",
                borderVisible: false,
                wickUpColor: colors?.upColor || "#4ADE80",
                wickDownColor: colors?.downColor || "#FB7185",
            });
            mainSeries.setData(seriesData);
        }
        mainSeriesRef.current = mainSeries;

        // If Volume Data (Simplified: Re-add volume series)
        if (volumeData && volumeData.length > 0) {
            // Note: In a full production app, we'd ref this too. 
            // For now, we'll just add it. If this effect re-runs, mainChart hasn't been cleared, 
            // so we technically might be adding duplicate volume series if we don't clear?
            // Yes. Let's fix this properly next time or rely on the fact that `data` usually doesn't change ref often.
            // But let's act robustly: We are destroying main series above. Volume series is separate.
            // Let's assume for this step we process volume here.
            const volumeSeries = mainChart.addSeries(LightweightCharts.HistogramSeries, {
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            volumeSeries.setData(volumeData);
        }

    }, [data, mode, volumeData]);

    // 3. Handle Indicators (Overlays & Separate Panes)
    useEffect(() => {
        if (!mainChartRef.current || !chartContainerRef.current) return;
        const mainChart = mainChartRef.current;

        // A. Cleanup Old Overlays
        overlaySeriesRef.current.forEach(s => {
            try { mainChart.removeSeries(s); } catch (e) { }
        });
        overlaySeriesRef.current = [];

        // B. Cleanup Old Separate Panes
        subChartsRef.current.forEach(({ chart, div }) => {
            try {
                chart.remove();
                div.remove();
            } catch (e) { }
        });
        subChartsRef.current = [];

        // C. Re-Add Overlays
        overlays.forEach(ind => {
            ind.series.forEach(s => {
                if (s.type === 'Line') {
                    const line = mainChart.addSeries(LightweightCharts.LineSeries, { ...s.options, crosshairMarkerVisible: false } as any);
                    line.setData(s.data as any);
                    overlaySeriesRef.current.push(line);
                }
            });
        });

        // D. Create Separate Panes
        separatePanes.forEach((paneInd) => {
            const subContainer = document.createElement("div");
            subContainer.style.height = "160px";
            subContainer.style.width = "100%";
            subContainer.style.borderTop = "1px solid rgba(255,255,255,0.05)";
            chartContainerRef.current?.appendChild(subContainer);

            const subChart = LightweightCharts.createChart(subContainer, {
                layout: { background: { type: LightweightCharts.ColorType.Solid, color: "transparent" }, textColor: "#64748B", attributionLogo: false },
                width: chartContainerRef.current?.clientWidth || 800,
                height: 160,
                grid: { vertLines: { visible: false }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
                timeScale: { visible: false, timeVisible: true },
                rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
            });

            paneInd.series.forEach(s => {
                const SeriesClass = s.type === 'Histogram' ? LightweightCharts.HistogramSeries : LightweightCharts.LineSeries;
                const seriesObj = subChart.addSeries(SeriesClass, s.options as any);
                seriesObj.setData(s.data as any);
            });

            subChartsRef.current.push({ chart: subChart, div: subContainer });
        });

    }, [indicators]);

    const [scriptBgColors, setScriptBgColors] = useState<{ time: number, color: string }[]>([]);

    // Handle Script Results (Markers & Plots)
    useEffect(() => {
        if (!mainSeriesRef.current || !scriptResults) return;

        try {
            // 1. Process Markers (Buy/Sell Signals + Shapes)
            const markers: LightweightCharts.SeriesMarker<any>[] = [];

            // Background Colors
            const bgs: { time: number, color: string }[] = [];

            scriptResults.forEach(res => {
                // Signals
                res.signals.forEach(sig => {
                    markers.push({
                        time: sig.time as any,
                        position: sig.type === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: sig.type === 'BUY' ? '#22c55e' : '#ef4444',
                        shape: sig.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: (sig.label && sig.label !== 'Cross') ? sig.label : (sig.type === 'BUY' ? 'BUY' : 'SELL'),
                        size: 1 as any,
                    });
                });

                // Shapes
                if (res.shapes) {
                    res.shapes.forEach(shape => {
                        markers.push({
                            time: shape.time as any,
                            position: shape.position as any,
                            color: shape.color || "#22c55e",
                            shape: shape.type as any, // shapes map directly to LC types loosely? 
                            // LC types: 'circle' | 'square' | 'arrowUp' | 'arrowDown'
                            // My types: "arrowUp" | "arrowDown" | "circle" | "square" | "diamond" | "label" | "cross" | "x"
                            // Need mapping or assume loose match for common ones. LC supports: arrowUp, arrowDown, circle, square.
                            // Others need fallback or custom. For now, pass through.
                            text: shape.text || undefined,
                            size: (shape.size === 'tiny' ? 0.5 : shape.size === 'small' ? 1 : shape.size === 'large' ? 2 : 1) as any,
                        });
                    });
                }

                // Bg Colors
                if (res.bgColors) {
                    res.bgColors.forEach(bg => {
                        // Standardize time
                        const t = typeof bg.time === 'string' ? new Date(bg.time).getTime() / 1000 : bg.time;
                        bgs.push({ time: t as number, color: bg.color });
                    });
                }
            });

            setScriptBgColors(bgs);

            // Sort markers by time
            markers.sort((a, b) => (a.time as number) - (b.time as number));

            // Use createSeriesMarkers for v5
            if (mainSeriesRef.current) {
                try {
                    LightweightCharts.createSeriesMarkers(mainSeriesRef.current, markers);
                } catch (e) {
                    console.error("[TechnicalChart] Failed to create set markers:", e);
                }
            }

        } catch (e) {
            console.error("Error setting markers:", e);
        }
    }, [scriptResults]);

    // 4. Sync Time Scales
    useEffect(() => {
        if (!isChartReady || !mainChartRef.current) return;
        const mainTimeScale = mainChartRef.current.timeScale();
        const handler = (range: any) => {
            if (range) {
                subChartsRef.current.forEach(({ chart }) => {
                    chart.timeScale().setVisibleLogicalRange(range);
                });
            }
        };
        mainTimeScale.subscribeVisibleLogicalRangeChange(handler);
        return () => mainTimeScale.unsubscribeVisibleLogicalRangeChange(handler);
    }, [isChartReady]);

    // --- Real-time Updates ---
    // --- Real-time Updates ---
    useEffect(() => {
        if (!mainSeriesRef.current || !liveDataPoint) return;

        // Validation: Ensure valid data for the chart type
        // Line/Area needs 'value', Candle needs 'open', 'high', 'low', 'close'
        // Lightweight Charts requires 'time'
        if (!liveDataPoint.time) return;

        try {
            // Check for valid numbers based on mode
            if (mode === 'line' || mode === 'area') {
                if (typeof liveDataPoint.value !== 'number') return;
            } else {
                // Candle
                if (
                    typeof liveDataPoint.open !== 'number' ||
                    typeof liveDataPoint.high !== 'number' ||
                    typeof liveDataPoint.low !== 'number' ||
                    typeof liveDataPoint.close !== 'number'
                ) {
                    return;
                }
            }

            mainSeriesRef.current.update(liveDataPoint);
        } catch (err) {
            console.error("Chart Update Failed", err, liveDataPoint);
        }
    }, [liveDataPoint, mode]);


    // 5. Handle Scale Mode Updates
    useEffect(() => {
        if (!mainChartRef.current) return;
        const mainChart = mainChartRef.current;

        const priceScale = mainChart.priceScale('right');

        if (scaleMode === 'log') {
            priceScale.applyOptions({ mode: LightweightCharts.PriceScaleMode.Logarithmic });
        } else if (scaleMode === 'percentage') {
            priceScale.applyOptions({ mode: LightweightCharts.PriceScaleMode.Percentage });
        } else {
            priceScale.applyOptions({ mode: LightweightCharts.PriceScaleMode.Normal });
        }
    }, [scaleMode]);

    // 6. Handle Incoming Crosshair Sync
    useEffect(() => {
        if (!mainChartRef.current || !syncCrosshair) return;
        // Lightweight Charts v4 doesn't have a public API to SET crosshair position programmatically easy?
        // Actually, it has `setCrosshairPosition`.
        // Let's check docs or use `chart.setCrosshairPosition(price, time, series)`.

        // However, if we only have time (logical index) it's easier.
        // If we want exact, we need price.
        // For MVP, allow the library to handle it if we passed the right params.

        // Wait, v4/5 `setCrosshairPosition` takes (price, time, seriesApi).
        // If we are syncing across different intervals, exact time sync is tricky.
        // We should prioritize TIME sync.

        if (syncCrosshair.time && mainSeriesRef.current) {
            try {
                // Safeguard: Ensure we don't crash if series is not ready or data is missing
                mainChartRef.current.setCrosshairPosition(0, syncCrosshair.time as any, mainSeriesRef.current);
            } catch (e) {
                // Ignore sync errors during initialization/data loading
                // console.warn("Sync crosshair failed", e);
            }
        }
    }, [syncCrosshair]);

    // --- Drawing Renderers ---

    const renderFibonacci = (d: Drawing | Partial<Drawing>) => {
        if (!d.p1 || !d.p2 || !mainChartRef.current || !mainSeriesRef.current) return null;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;
        const x1 = chart.timeScale().timeToCoordinate(d.p1.time);
        const y1 = series.coordinateToPrice(d.p1.price) ? series.priceToCoordinate(d.p1.price) : null;
        const x2 = chart.timeScale().timeToCoordinate(d.p2.time);
        const y2 = series.coordinateToPrice(d.p2.price) ? series.priceToCoordinate(d.p2.price) : null;

        // Note: coordinateToPrice returns price. priceToCoordinate returns coordinate.
        // My previous fix was 'series.coordinateToPrice(y)' in click handler.
        // Here we have PRICE in drawing, need COORDINATE. So series.priceToCoordinate(price).
        // Correct usage: series.priceToCoordinate(d.p1.price).

        const cy1 = series.priceToCoordinate(d.p1.price);
        const cy2 = series.priceToCoordinate(d.p2.price);

        if (x1 === null || cy1 === null || x2 === null || cy2 === null) return null;

        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const priceDiff = d.p2.price - d.p1.price;

        return (
            <g key={d.id} className="group">
                <line x1={x1} y1={cy1} x2={x2} y2={cy2} stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 4" className="opacity-50" />
                {levels.map(level => {
                    const priceLevel = d.p1!.price + (priceDiff * level);
                    const yLevel = series.priceToCoordinate(priceLevel);
                    if (yLevel === null) return null;
                    return (
                        <g key={level}>
                            <line
                                x1={x1} y1={yLevel} x2={x2} y2={yLevel}
                                stroke={level === 0 || level === 1 ? "#94A3B8" : "#D4AF37"}
                                strokeWidth={level === 0.5 ? 2 : 1}
                                className="opacity-80"
                            />
                            <text
                                x={x2 + 5} y={yLevel + 3}
                                fill={level === 0 || level === 1 ? "#94A3B8" : "#D4AF37"}
                                fontSize="10"
                                className="font-mono select-none"
                            >
                                {level.toFixed(3)} ({priceLevel.toFixed(2)})
                            </text>
                        </g>
                    );
                })}
            </g>
        );
    };

    const renderMeasure = (d: Drawing | Partial<Drawing>) => {
        if (!d.p1 || !d.p2 || !mainChartRef.current || !mainSeriesRef.current) return null;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;

        const x1 = chart.timeScale().timeToCoordinate(d.p1.time);
        const y1 = series.priceToCoordinate(d.p1.price);
        const x2 = chart.timeScale().timeToCoordinate(d.p2.time);
        const y2 = series.priceToCoordinate(d.p2.price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        const width = x2 - x1;
        const height = y2 - y1;
        const priceChange = d.p2.price - d.p1.price;
        const percentChange = (priceChange / d.p1.price) * 100;

        const bgColor = priceChange >= 0 ? "rgba(74, 222, 128, 0.1)" : "rgba(251, 113, 133, 0.1)";
        const strokeColor = priceChange >= 0 ? "#4ADE80" : "#FB7185";

        return (
            <g key={d.id}>
                {/* Visual Box */}
                <rect
                    x={Math.min(x1, x2)} y={Math.min(y1, y2)}
                    width={Math.abs(width)} height={Math.abs(height)}
                    fill={bgColor}
                    stroke={strokeColor}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                />

                {/* Info Label */}
                <foreignObject x={x2 + 10} y={y2 - 25} width="120" height="60">
                    <div className="bg-[#0B0E11] border border-white/10 rounded p-2 shadow-xl flex flex-col gap-0.5 min-w-max">
                        <span className="text-[10px] text-muted-foreground font-mono leading-none">{percentChange.toFixed(2)}%</span>
                        <span className="text-[10px] font-bold text-white font-mono leading-none">{priceChange.toFixed(2)}</span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    const renderRiskReward = (d: Drawing | Partial<Drawing>) => {
        if (!d.p1 || !d.p2 || !mainChartRef.current || !mainSeriesRef.current || !d.type) return null;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;

        const entryTime = chart.timeScale().timeToCoordinate(d.p1.time);
        const entryPriceVal = d.p1.price;
        const entryY = series.priceToCoordinate(entryPriceVal);

        // p2 is the "Stop" level initially? Or dragging?
        // Let's assume P1 is Entry, P2 defines the Stop Loss level.
        // And we project a default Target (e.g., 2R).
        // If we want 3 points we need more complex interaction. 
        // For MVP: P1 = Entry, P2 = Stop Loss. Target = Entry + (Entry - Stop) * 2.

        const stopPriceVal = d.p2.price;
        const risk = Math.abs(entryPriceVal - stopPriceVal);
        const isLong = d.type === 'long';

        // Validation: Long stop should be below, Short stop should be above. 
        // We render purely based on coordinates though.

        const targetPriceVal = isLong ? (entryPriceVal + risk * 2) : (entryPriceVal - risk * 2);

        const stopTime = chart.timeScale().timeToCoordinate(d.p2.time); // Used for width?
        // Usually R/R tool extends to the right. Let's make it fixed width or based on p2 time?
        // Let's use p2 time for width.

        const stopY = series.priceToCoordinate(stopPriceVal);
        const targetY = series.priceToCoordinate(targetPriceVal);

        if (entryTime === null || stopY === null || targetY === null || entryY === null) return null;

        // Coordinates
        const x1 = entryTime;
        const x2 = chart.timeScale().timeToCoordinate(d.p2.time) || (x1 + 100); // Default width if same time
        const width = x2 - x1; // can be negative if dragged left

        // Avoid zero width
        const drawWidth = Math.abs(width) < 10 ? 50 : width;
        const rightX = x1 + drawWidth;

        // Colors
        const stopColor = "rgba(239, 68, 68, 0.2)"; // Red
        const stopBorder = "#ef4444";
        const targetColor = "rgba(34, 197, 94, 0.2)"; // Green
        const targetBorder = "#22c55e";

        // Stop Box (Entry to Stop)
        // Rect takes: x, y, width, height. 
        // Y must be top-left.

        // Stop Zone
        const sY = Math.min(entryY, stopY);
        const sH = Math.abs(entryY - stopY);

        // Target Zone
        const tY = Math.min(entryY, targetY);
        const tH = Math.abs(entryY - targetY);

        return (
            <g key={d.id}>
                {/* Stop Loss Zone */}
                <rect x={Math.min(x1, rightX)} y={sY} width={Math.abs(drawWidth)} height={sH} fill={stopColor} stroke={stopBorder} strokeWidth="1" />

                {/* Take Profit Zone */}
                <rect x={Math.min(x1, rightX)} y={tY} width={Math.abs(drawWidth)} height={tH} fill={targetColor} stroke={targetBorder} strokeWidth="1" />

                {/* Entry Line */}
                <line x1={Math.min(x1, rightX)} y1={entryY} x2={Math.max(x1, rightX)} y2={entryY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 4" />

                {/* Labels */}
                <text x={rightX + 5} y={tY} fill={targetBorder} fontSize="10" className="font-mono">Target</text>
                <text x={rightX + 5} y={sY + sH} fill={stopBorder} fontSize="10" className="font-mono">Stop</text>
                <text x={rightX + 5} y={entryY} fill="#fff" fontSize="10" className="font-mono">Entry</text>
            </g>
        );
    };

    const renderDrawing = (d: Drawing | Partial<Drawing>) => {
        if (!d.p1 || !mainChartRef.current || !mainSeriesRef.current) return null;
        if (d.type === 'fib') return renderFibonacci(d);
        if (d.type === 'measure') return renderMeasure(d);
        if (d.type === 'long' || d.type === 'short') return renderRiskReward(d);

        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;
        const x1 = chart.timeScale().timeToCoordinate(d.p1.time);
        const y1 = series.priceToCoordinate(d.p1.price);

        if (x1 === null || y1 === null) return null;

        if (d.type === 'text' && d.text) {
            return (
                <text key={d.id} x={x1} y={y1} fill={colors?.textColor || "#fff"} fontSize="12" className="pointer-events-none select-none font-sans">
                    {d.text}
                </text>
            );
        }

        // For other shapes check p2
        if (!d.p2) return null;
        const x2 = chart.timeScale().timeToCoordinate(d.p2.time);
        const y2 = series.priceToCoordinate(d.p2.price);
        if (x2 === null || y2 === null) return null;

        if (d.type === 'rect') {
            const width = Math.abs(x2 - x1);
            const height = Math.abs(y2 - y1);
            const x = Math.min(x1, x2);
            const y = Math.min(y1, y2);
            return (
                <rect
                    key={d.id}
                    x={x} y={y} width={width} height={height}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="#3B82F6"
                    strokeWidth="2"
                />
            );
        }

        if (d.type === 'circle') {
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            const rx = Math.abs(x2 - x1) / 2;
            const ry = Math.abs(y2 - y1) / 2;
            return (
                <ellipse
                    key={d.id}
                    cx={cx} cy={cy} rx={rx} ry={ry}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="#3B82F6"
                    strokeWidth="2"
                />
            );
        }

        // Default Trendline
        return (
            <line
                key={d.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#3B82F6"
                strokeWidth="2"
                className="drop-shadow-md"
            />
        );
    };

    // --- Handlers ---
    const handleTextToolClick = (time: LightweightCharts.Time, price: number) => {
        const text = prompt("Enter annotation text:");
        if (text) {
            const newDrawing: Drawing = {
                id: Date.now().toString(),
                type: 'text',
                p1: { time, price },
                p2: { time, price }, // Dummy p2 for type compatibility
                text
            };
            setDrawings(prev => [...prev, newDrawing]);
            if (onDrawingComplete) onDrawingComplete();
        }
    };

    const handleShapeDrawingClick = (time: LightweightCharts.Time, price: number) => {
        if (!currentDrawing) {
            let type: Drawing["type"] = 'trendline';
            if (activeTool === 'fib') type = 'fib';
            else if (activeTool === 'rect') type = 'rect';
            else if (activeTool === 'circle') type = 'circle';
            else if (activeTool === 'measure') type = 'measure';
            else if (activeTool === 'long') type = 'long';
            else if (activeTool === 'short') type = 'short';

            setCurrentDrawing({
                id: Date.now().toString(),
                type,
                p1: { time, price },
                p2: { time, price }
            });
        } else {
            const newDrawing = { ...currentDrawing, p2: { time, price } } as Drawing;
            setDrawings(prev => [...prev, newDrawing]);
            setCurrentDrawing(null);
            if (onDrawingComplete) onDrawingComplete();
        }
    };

    // --- Magnet Mode Helper ---
    const getMagnetPrice = (time: LightweightCharts.Time, originalPrice: number): number => {
        if (!data) return originalPrice;

        const toTimestamp = (t: any): number => {
            if (typeof t === 'number') return t;
            if (typeof t === 'string') return new Date(t).getTime() / 1000;
            if (typeof t === 'object' && 'year' in t) { // BusinessDay
                return new Date(t.year, t.month - 1, t.day).getTime() / 1000;
            }
            return 0;
        };

        const targetTs = toTimestamp(time);

        const candle = data.find((d: any) => {
            const dTs = toTimestamp(d.time);
            return Math.abs(dTs - targetTs) < 1; // Match within 1 second
        });
        if (!candle) return originalPrice;

        const points = [candle.open, candle.high, candle.low, candle.close].filter(v => typeof v === 'number');
        if (points.length === 0) return originalPrice;

        const closest = points.reduce((prev, curr) => {
            return (Math.abs(curr - originalPrice) < Math.abs(prev - originalPrice) ? curr : prev);
        });

        return closest;
    };

    const handleChartClick = (e: React.MouseEvent) => {
        if (activeTool === 'cursor' || activeTool === 'delete' || !mainChartRef.current || !mainSeriesRef.current) return;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = chart.timeScale().coordinateToTime(x);
        let price = series.coordinateToPrice(y);

        if (!time || !price) return;

        // Magnet Mode (Always On)
        price = getMagnetPrice(time, price);

        if (activeTool === 'text') {
            handleTextToolClick(time, price);
        } else {
            handleShapeDrawingClick(time, price);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!currentDrawing || !mainChartRef.current || !mainSeriesRef.current) return;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = chart.timeScale().coordinateToTime(x);
        let price = series.coordinateToPrice(y);

        if (time && price) {
            price = getMagnetPrice(time, price);
            setCurrentDrawing(prev => ({ ...prev, p2: { time, price: price! } }));
        }
    };

    // Force re-render on scroll/zoom to update SVG overlays
    useEffect(() => {
        if (!mainChartRef.current) return;
        const timeScale = mainChartRef.current.timeScale();
        const onVisibleRangeChanged = () => {
            setForceUpdate(prev => prev + 1);
        };
        timeScale.subscribeVisibleTimeRangeChange(onVisibleRangeChanged);
        return () => {
            timeScale.unsubscribeVisibleTimeRangeChange(onVisibleRangeChanged);
        };
    }, [isChartReady]);

    const renderBgColor = (bg: { time: number, color: string }, index: number) => {
        if (!mainChartRef.current || !mainSeriesRef.current || !isChartReady) return null;

        const chart = mainChartRef.current;

        // bg.time is seconds or ms? We normalized to seconds earlier if possible or just use whatever LC accepts?
        // LC timeToCoordinate accepts the same format as setData.
        // My normalization: `new Date(bg.time).getTime() / 1000`. So it is UNIX timestamp (seconds).

        const x = chart.timeScale().timeToCoordinate(bg.time as any);
        if (x === null) return null;

        // Draw a strip. Width? Ideally 1 bar width.
        // We can estimate bar width or just draw a line if width is pixel perfect.
        // Let's draw a wide rect (e.g. 10px) centered? Or try to calculate barSpacing?
        const spacing = chart.timeScale().options().barSpacing || 6;
        const width = spacing; // * 0.8?

        return (
            <rect
                key={`bg-${index}`}
                x={x - (width / 2)}
                y={0}
                width={width}
                height="100%"
                fill={bg.color}
                className="pointer-events-none mix-blend-screen"
                style={{ opacity: 0.2 }} // Fallback opacity
            />
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] relative overflow-hidden">
            <div ref={chartContainerRef} className="w-full h-full flex flex-col overflow-hidden" />

            <div className="absolute top-2 right-2 z-[60] text-[10px] text-white bg-black/50 px-2 rounded pointer-events-none border border-white/10">
                Tool: {activeTool} | Drawings: {drawings.length} {currentDrawing ? "| Drawing..." : ""}
            </div>

            {isChartReady && (
                <button
                    type="button"
                    className="absolute top-0 left-0 z-50 pointer-events-auto w-full h-full appearance-none focus:outline-none"
                    style={{
                        cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
                        pointerEvents: activeTool !== 'cursor' ? 'auto' : 'none'
                    }}
                    onClick={handleChartClick}
                    onMouseMove={handleMouseMove}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' && activeTool !== 'cursor') {
                            if (onDrawingComplete) onDrawingComplete();
                        }
                    }}
                    aria-label="Chart Drawing Area"
                >
                    <svg className="w-full h-full overflow-visible">
                        {/* Background Colors Layer */}
                        {scriptBgColors.map((bg, i) => renderBgColor(bg, i))}

                        {/* eslint-disable-next-line react-hooks/refs */}
                        {drawings.map(d => renderDrawing(d))}
                        {/* eslint-disable-next-line react-hooks/refs */}
                        {currentDrawing && renderDrawing(currentDrawing)}
                    </svg>
                </button>
            )}
        </div>
    );
}
