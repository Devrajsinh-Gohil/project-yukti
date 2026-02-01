"use client";

import { createChart, ColorType, IChartApi, AreaSeries, CandlestickSeries, HistogramSeries, LineSeries, Time, WhitespaceData } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { IndicatorData } from "@/lib/indicators";

interface TechnicalChartProps {
    data?: any[]; // Flexible data
    volumeData?: { time: string; value: number; color: string }[];
    predictionData?: { time: string; value: number }[];
    indicators?: IndicatorData[];
    mode?: "candle" | "area"; // New prop to switch modes
    colors?: {
        backgroundColor?: string;
        textColor?: string;
        upColor?: string;
        downColor?: string;
        lineColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export function TechnicalChart({ data, volumeData, predictionData, indicators, colors, mode = "candle" }: TechnicalChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [tooltipData, setTooltipData] = useState<{
        time: string;
        open: string;
        high: string;
        low: string;
        close: string;
        change: string;
        changeColor: string;
    } | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || "transparent" },
                textColor: colors?.textColor || "#94A3B8",
                attributionLogo: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
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
                vertLine: {
                    labelVisible: true,
                    style: 0, // Solid
                    width: 1,
                    color: "rgba(255, 255, 255, 0.2)",
                },
                horzLine: {
                    labelVisible: true,
                    style: 0, // Solid
                    width: 1,
                    color: "rgba(255, 255, 255, 0.2)",
                },
            },
        });

        let mainSeries: any;

        if (mode === "area") {
            mainSeries = chart.addSeries(AreaSeries, {
                lineColor: colors?.lineColor || "#D4AF37",
                topColor: colors?.areaTopColor || "rgba(212, 175, 55, 0.4)",
                bottomColor: colors?.areaBottomColor || "rgba(212, 175, 55, 0)",
            });
            const areaData = (data && data.length > 0) ? data.map(d => ({
                time: d.time,
                value: d.value ?? d.close ?? 0
            })) : [];

            if (areaData.length > 0) mainSeries.setData(areaData);
            else mainSeries.setData(generateMockAreaData());
        } else {
            mainSeries = chart.addSeries(CandlestickSeries, {
                upColor: colors?.upColor || "#4ADE80",
                downColor: colors?.downColor || "#FB7185",
                borderVisible: false,
                wickUpColor: colors?.upColor || "#4ADE80",
                wickDownColor: colors?.downColor || "#FB7185",
            });
            const initialData = (data && data.length > 0) ? data : generateMockCandleData();
            mainSeries.setData(initialData);
        }

        // Volume Series (Overlay)
        if (volumeData) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });
            volumeSeries.setData(volumeData);
        }

        // Indicators (Overlays)
        if (indicators) {
            indicators.forEach(ind => {
                if (ind.type === "overlay") {
                    const lineSeries = chart.addSeries(LineSeries, {
                        color: ind.color,
                        lineWidth: 1,
                        crosshairMarkerVisible: false,
                        lastValueVisible: false, // Don't clutter axis
                        priceLineVisible: false
                    });
                    lineSeries.setData(ind.data as any);
                }
            });
        }

        // Prediction Line
        if (predictionData) {
            const predSeries = chart.addSeries(AreaSeries, {
                lineColor: "#D4AF37",
                topColor: "rgba(212, 175, 55, 0.2)",
                bottomColor: "rgba(212, 175, 55, 0)",
                lineStyle: 2,
                lineWidth: 2
            });
            predSeries.setData(predictionData);
        }

        chart.timeScale().fitContent();

        // Crosshair Handler
        chart.subscribeCrosshairMove((param) => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current!.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current!.clientHeight
            ) {
                setTooltipData(null);
            } else {
                // Get data from the main series
                const dataPoint = param.seriesData.get(mainSeries) as any;
                if (dataPoint) {
                    const open = dataPoint.open !== undefined ? dataPoint.open : dataPoint.value;
                    const close = dataPoint.close !== undefined ? dataPoint.close : dataPoint.value;
                    const high = dataPoint.high !== undefined ? dataPoint.high : open;
                    const low = dataPoint.low !== undefined ? dataPoint.low : open;

                    // Calculate Change
                    const changeVal = close - open;
                    const changePercent = ((changeVal / open) * 100).toFixed(2);
                    const isUp = changeVal >= 0;

                    // Format Time
                    let dateStr = "";
                    if (typeof param.time === 'string') {
                        // "2024-03-15" format
                        const date = new Date(param.time);
                        date.setDate(date.getDate() + 1); // Fix timezone offset causing previous day
                        dateStr = date.toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                        });
                    } else {
                        // Timestamp format
                        dateStr = new Date(Number(param.time) * 1000).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                    }

                    setTooltipData({
                        time: dateStr,
                        open: open.toFixed(2),
                        high: high.toFixed(2),
                        low: low.toFixed(2),
                        close: close.toFixed(2),
                        change: `${isUp ? '+' : ''}${changePercent}%`,
                        changeColor: isUp ? "text-green-400" : "text-red-400"
                    });
                }
            }
        });

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    chart.applyOptions({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, volumeData, predictionData, colors, mode]);

    return (
        <div className="relative w-full h-full group">
            <div ref={chartContainerRef} className="w-full h-full" />

            {/* Legend / Tooltip Overlay */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none transition-opacity duration-200">
                {tooltipData ? (
                    <div className="glass-strong rounded-lg p-3 border border-white/10 shadow-xl bg-[#0B0E11]/80 backdrop-blur-md">
                        <div className="flex items-center gap-3 text-xs font-mono mb-2 text-muted-foreground border-b border-white/5 pb-1">
                            <span>{tooltipData.time}</span>
                            <span className={tooltipData.changeColor}>{tooltipData.change}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs">
                            <div>
                                <div className="text-muted-foreground scale-[0.8] origin-left uppercase">Open</div>
                                <div className="font-semibold text-white">{tooltipData.open}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground scale-[0.8] origin-left uppercase">High</div>
                                <div className="font-semibold text-white">{tooltipData.high}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground scale-[0.8] origin-left uppercase">Low</div>
                                <div className="font-semibold text-white">{tooltipData.low}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground scale-[0.8] origin-left uppercase">Close</div>
                                <div className="font-semibold text-white">{tooltipData.close}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Default View: Show last available data point or Title
                    <div className="glass-strong rounded-lg p-2 border border-white/5 bg-[#0B0E11]/50 backdrop-blur-sm opacity-50">
                        <span className="text-xs text-muted-foreground">Hover for details</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function generateMockCandleData() {
    const currentDate = new Date();
    const data = [];
    let price = 1500;
    for (let i = 0; i < 150; i++) {
        const time = new Date(currentDate.getTime() - (150 - i) * 60 * 60 * 1000) // Hourly
            .toISOString() // lightweight-charts expects UNIX timestamp or ISO string depending on version, generic is safer
            .split("T")[0]; // Actually for daily. For intraday use timestamp. 

        // Using simple logic for mock
        // Note: lightweight charts string format usually YYYY-MM-DD. For intraday use timestamp (seconds).
        // Let's use timestamps for versatility.
        const timeStamp = (Math.floor(currentDate.getTime() / 1000) - (150 - i) * 3600) as Time;

        const volatility = 5;
        const open = price + (Math.random() - 0.5) * volatility;
        const close = open + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;

        price = close;

        data.push({ time: timeStamp, open, high, low, close });
    }
    return data;
}

function generateMockAreaData() {
    const currentDate = new Date();
    const data = [];
    let price = 100;
    for (let i = 0; i < 100; i++) {
        const time = (Math.floor(currentDate.getTime() / 1000) - (100 - i) * 86400) as Time;
        const change = (Math.random() - 0.5) * 5;
        price += change;
        data.push({ time, value: price });
    }
    return data;
}
