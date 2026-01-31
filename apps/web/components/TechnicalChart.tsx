"use client";

import { createChart, ColorType, IChartApi, AreaSeries, CandlestickSeries, HistogramSeries, Time, WhitespaceData } from "lightweight-charts";
import { useEffect, useRef } from "react";

interface TechnicalChartProps {
    data?: any[]; // Flexible data
    volumeData?: { time: string; value: number; color: string }[];
    predictionData?: { time: string; value: number }[];
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

export function TechnicalChart({ data, volumeData, predictionData, colors, mode = "candle" }: TechnicalChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        if (!chartContainerRef.current) return;

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

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || "transparent" },
                textColor: colors?.textColor || "#94A3B8",
                attributionLogo: false, // Attempt to disable if present in this version
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight, // Fill container
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            timeScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
                timeVisible: true,
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
        });

        if (mode === "area") {
            const areaSeries = chart.addSeries(AreaSeries, {
                lineColor: colors?.lineColor || "#D4AF37",
                topColor: colors?.areaTopColor || "rgba(212, 175, 55, 0.4)",
                bottomColor: colors?.areaBottomColor || "rgba(212, 175, 55, 0)",
            });
            // Adapt data for area if needed, assuming data has 'value' if area mode
            // If data is candle data (open/close), use close for value?
            // Let's assume caller provides correct data shape or we map it.
            const areaData = data ? data.map(d => ({
                time: d.time,
                value: d.value ?? d.close ?? 0
            })) : [];

            if (data) areaSeries.setData(areaData);
            else areaSeries.setData(generateMockAreaData());

        } else {
            // Candlestick Series
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: colors?.upColor || "#4ADE80",
                downColor: colors?.downColor || "#FB7185",
                borderVisible: false,
                wickUpColor: colors?.upColor || "#4ADE80",
                wickDownColor: colors?.downColor || "#FB7185",
            });

            const initialData = data || generateMockCandleData();
            candleSeries.setData(initialData);
        }

        // Volume Series (Overlay)
        if (volumeData) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '', // Overlay on same scale but at bottom
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.8, // Highest volume bar takes up bottom 20%
                    bottom: 0,
                },
            });
            volumeSeries.setData(volumeData);
        }

        // Prediction Line (Area for confidence or Line for path)
        if (predictionData) {
            const predSeries = chart.addSeries(AreaSeries, {
                lineColor: "#D4AF37",
                topColor: "rgba(212, 175, 55, 0.2)",
                bottomColor: "rgba(212, 175, 55, 0)",
                lineStyle: 2, // Dashed
                lineWidth: 2
            });
            predSeries.setData(predictionData);
        }

        chart.timeScale().fitContent();

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, volumeData, predictionData, colors]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
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
