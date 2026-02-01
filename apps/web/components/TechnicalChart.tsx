"use client";

import { createChart, ColorType, IChartApi, AreaSeries, CandlestickSeries, HistogramSeries, LineSeries, Time, MouseEventParams, ITimeScaleApi } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { IndicatorResult } from "@/lib/indicators";

interface Point {
    time: Time;
    price: number;
}

interface Drawing {
    id: string;
    type: "trendline" | "ray" | "fib" | "rect" | "circle" | "text" | "measure";
    p1: Point;
    p2: Point;
    text?: string;
}

interface TechnicalChartProps {
    data?: any[];
    volumeData?: { time: string; value: number; color: string }[];
    predictionData?: { time: string; value: number }[];
    indicators?: IndicatorResult[];
    mode?: "candle" | "area" | "line" | "heikin"; // Extended modes
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
}

export function TechnicalChart({
    data,
    volumeData,
    predictionData,
    indicators = [],
    colors,
    mode = "candle",
    activeTool = "cursor",
    onDrawingComplete
}: TechnicalChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRefs = useRef<IChartApi[]>([]);
    const mainChartRef = useRef<IChartApi | null>(null);
    const mainSeriesRef = useRef<any>(null);

    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<Partial<Drawing> | null>(null);
    const [isChartReady, setIsChartReady] = useState(false);
    const [_, setForceUpdate] = useState(0);

    const overlays = indicators.filter(i => i.pane === "overlay");
    const separatePanes = indicators.filter(i => i.pane === "separate");

    // Handle Delete (Clear All)
    useEffect(() => {
        if (activeTool === 'delete') {
            setDrawings([]);
            if (onDrawingComplete) onDrawingComplete();
        }
    }, [activeTool, onDrawingComplete]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        chartContainerRef.current.innerHTML = "";
        chartRefs.current = [];
        setIsChartReady(false);

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

        const mainChart = createChart(chartDiv, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || "transparent" },
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
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
            crosshair: {
                mode: 1,
            },
        });
        chartRefs.current.push(mainChart);
        mainChartRef.current = mainChart;

        // Series Logic
        let mainSeries: any;
        const seriesData = (data && data.length > 0) ? data : [];

        if (mode === "area") {
            mainSeries = mainChart.addSeries(AreaSeries, {
                lineColor: colors?.lineColor || "#D4AF37",
                topColor: colors?.areaTopColor || "rgba(212, 175, 55, 0.4)",
                bottomColor: colors?.areaBottomColor || "rgba(212, 175, 55, 0)",
            });
            mainSeries.setData(seriesData.map((d: any) => ({ time: d.time, value: d.value ?? d.close ?? 0 })));
        } else if (mode === "line") {
            mainSeries = mainChart.addSeries(LineSeries, {
                color: colors?.lineColor || "#3B82F6",
                lineWidth: 2,
            });
            mainSeries.setData(seriesData.map((d: any) => ({ time: d.time, value: d.value ?? d.close ?? 0 })));
        } else {
            // Candle or Heikin (Handle heikin calculation ideally before passing, but assuming 'candle' style for now)
            mainSeries = mainChart.addSeries(CandlestickSeries, {
                upColor: colors?.upColor || "#4ADE80",
                downColor: colors?.downColor || "#FB7185",
                borderVisible: false,
                wickUpColor: colors?.upColor || "#4ADE80",
                wickDownColor: colors?.downColor || "#FB7185",
            });
            mainSeries.setData(seriesData);
        }
        mainSeriesRef.current = mainSeries;

        if (volumeData) {
            const volumeSeries = mainChart.addSeries(HistogramSeries, {
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            volumeSeries.setData(volumeData);
        }

        if (predictionData) {
            const predSeries = mainChart.addSeries(AreaSeries, {
                lineColor: "#D4AF37",
                topColor: "rgba(212, 175, 55, 0.2)",
                bottomColor: "rgba(212, 175, 55, 0)",
                lineStyle: 2,
                lineWidth: 2
            });
            predSeries.setData(predictionData);
        }

        overlays.forEach(ind => {
            ind.series.forEach(s => {
                if (s.type === 'Line') {
                    const line = mainChart.addSeries(LineSeries, { ...s.options, crosshairMarkerVisible: false } as any);
                    line.setData(s.data as any);
                }
            });
        });

        separatePanes.forEach((paneInd) => {
            const subContainer = document.createElement("div");
            subContainer.style.height = "160px";
            subContainer.style.width = "100%";
            subContainer.style.borderTop = "1px solid rgba(255,255,255,0.05)";
            chartContainerRef.current?.appendChild(subContainer);

            const subChart = createChart(subContainer, {
                layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#64748B", attributionLogo: false },
                width: subContainer.clientWidth,
                height: subContainer.clientHeight,
                grid: { vertLines: { visible: false }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
                timeScale: { visible: false, timeVisible: true },
                rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
            });
            chartRefs.current.push(subChart);

            paneInd.series.forEach(s => {
                const SeriesClass = s.type === 'Histogram' ? HistogramSeries : LineSeries;
                const seriesObj = subChart.addSeries(SeriesClass, s.options as any);
                seriesObj.setData(s.data as any);
            });
        });

        const mainTimeScale = mainChart.timeScale();
        const syncCharts = (timeRange: any) => {
            setForceUpdate(n => n + 1);
            chartRefs.current.forEach(chart => {
                if (chart === mainChart) return;
                chart.timeScale().setVisibleLogicalRange(timeRange);
            });
        };
        mainTimeScale.subscribeVisibleLogicalRangeChange(syncCharts);
        mainChart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver((entries) => {
            const containerWidth = chartContainerRef.current?.clientWidth || 800;
            const containerHeight = chartContainerRef.current?.clientHeight || 600;
            const subHeight = 160;
            const totalSubHeight = separatePanes.length * subHeight;
            const mainHeight = Math.max(300, containerHeight - totalSubHeight);
            mainChart.applyOptions({ width: containerWidth, height: mainHeight });
        });
        resizeObserver.observe(chartContainerRef.current);

        setIsChartReady(true);

        return () => {
            resizeObserver.disconnect();
            chartRefs.current.forEach(c => c.remove());
        };

    }, [data, indicators, mode, colors]);


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

    const renderDrawing = (d: Drawing | Partial<Drawing>) => {
        if (!d.p1 || !mainChartRef.current || !mainSeriesRef.current) return null;
        if (d.type === 'fib') return renderFibonacci(d);
        if (d.type === 'measure') return renderMeasure(d);

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
    const handleChartClick = (e: React.MouseEvent) => {
        if (activeTool === 'cursor' || activeTool === 'delete' || !mainChartRef.current || !mainSeriesRef.current) return;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);

        if (!time || !price) return;

        // Handle Text Tool - Instant Draw
        if (activeTool === 'text') {
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
            return; // Stop processing
        }

        if (!currentDrawing) {
            let type: Drawing["type"] = 'trendline';
            if (activeTool === 'fib') type = 'fib';
            else if (activeTool === 'rect') type = 'rect';
            else if (activeTool === 'circle') type = 'circle';
            else if (activeTool === 'measure') type = 'measure';

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

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!currentDrawing || !mainChartRef.current || !mainSeriesRef.current) return;
        const chart = mainChartRef.current;
        const series = mainSeriesRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);

        if (time && price) {
            setCurrentDrawing(prev => ({ ...prev, p2: { time, price } }));
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] relative">
            <div ref={chartContainerRef} className="w-full h-full flex flex-col" />

            <div className="absolute top-2 right-2 z-[60] text-[10px] text-white bg-black/50 px-2 rounded pointer-events-none border border-white/10">
                Tool: {activeTool} | Drawings: {drawings.length} {currentDrawing ? "| Drawing..." : ""}
            </div>

            {isChartReady && (
                <div
                    className="absolute top-0 left-0 z-50 pointer-events-auto"
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
                        pointerEvents: activeTool !== 'cursor' ? 'auto' : 'none'
                    }}
                    onClick={handleChartClick}
                    onMouseMove={handleMouseMove}
                >
                    <svg className="w-full h-full overflow-visible">
                        {drawings.map(d => renderDrawing(d))}
                        {currentDrawing && renderDrawing(currentDrawing)}
                    </svg>
                </div>
            )}
        </div>
    );
}
