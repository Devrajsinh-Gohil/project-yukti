import { SMA, EMA, BollingerBands, RSI, MACD, Stochastic, CCI, ATR, WilliamsR, PSAR } from "technicalindicators";
import { ChartDataPoint } from "./api";

// --- Types for Consumption by UI ---

export type SeriesType = "Line" | "Histogram" | "Area" | "Candlestick";

export interface RenderableSeries {
    type: SeriesType;
    data: { time: string | number; value: number; color?: string }[];
    options?: any; // lightweight-charts options (color, lineWidth, etc.)
    name?: string; // For legend
}

export interface IndicatorResult {
    id: string;       // Unique ID like "SMA-20"
    name: string;     // Display name "SMA (20)"
    pane: "overlay" | "separate"; // 'overlay' = main chart, 'separate' = new pane below
    series: RenderableSeries[];
}

// --- Calculation Engine ---

// --- Configuration Types ---

export interface IndicatorConfig {
    id: string;       // Unique instance ID (e.g. "SMA-123")
    type: string;     // Indicator Type (e.g. "SMA", "RSI")
    params: Record<string, any>; // { period: 14, source: "close" }
    color?: string;   // Override color
}

// --- Calculation Engine ---

export function calculateIndicators(tickerData: ChartDataPoint[], configs: IndicatorConfig[]): IndicatorResult[] {
    if (!tickerData || tickerData.length < 10) return [];

    const results: IndicatorResult[] = [];
    const closes = tickerData.map(d => d.close);
    const highs = tickerData.map(d => d.high);
    const lows = tickerData.map(d => d.low);

    // Formatting helper
    const mapTime = (val: number, index: number, offset: number) => {
        const dataIndex = index + offset;
        if (dataIndex < 0 || dataIndex >= tickerData.length) return null;
        return {
            time: tickerData[dataIndex].time,
            value: val
        };
    };

    configs.forEach(config => {
        const { type, params, id, color } = config;

        // --- OVERLAYS ---
        if (type === "SMA") {
            const period = params.period || 20;
            const output = SMA.calculate({ period, values: closes });
            const offset = tickerData.length - output.length;

            results.push({
                id: id,
                name: `SMA (${period})`,
                pane: "overlay",
                series: [{
                    type: "Line",
                    data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any,
                    options: { color: color || "#F59E0B", lineWidth: 2 }
                }]
            });
        }
        else if (type === "EMA") {
            const period = params.period || 20;
            const output = EMA.calculate({ period, values: closes });
            const offset = tickerData.length - output.length;

            results.push({
                id: id,
                name: `EMA (${period})`,
                pane: "overlay",
                series: [{
                    type: "Line",
                    data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any,
                    options: { color: color || "#3B82F6", lineWidth: 2 }
                }]
            });
        }
        else if (type === "BollingerBands") {
            const period = params.period || 20;
            const stdDev = params.stdDev || 2;
            const output = BollingerBands.calculate({ period, stdDev, values: closes });
            const offset = tickerData.length - output.length;

            results.push({
                id: id,
                name: `BB (${period}, ${stdDev})`,
                pane: "overlay",
                series: [
                    {
                        type: "Line",
                        name: "Upper",
                        data: output.map((v, i) => mapTime(v.upper, i, offset)).filter(Boolean) as any,
                        options: { color: color || "rgba(52, 211, 153, 0.5)", lineWidth: 1 }
                    },
                    {
                        type: "Line",
                        name: "Lower",
                        data: output.map((v, i) => mapTime(v.lower, i, offset)).filter(Boolean) as any,
                        options: { color: color || "rgba(52, 211, 153, 0.5)", lineWidth: 1 }
                    },
                    {
                        type: "Line",
                        name: "Basis",
                        data: output.map((v, i) => mapTime(v.middle, i, offset)).filter(Boolean) as any,
                        options: { color: color || "rgba(52, 211, 153, 0.8)", lineWidth: 1, lineStyle: 2 }
                    }
                ]
            });
        }
        else if (type === "ParabolicSAR") {
            const step = params.step || 0.02;
            const max = params.max || 0.2;
            const output = PSAR.calculate({ step, max, high: highs, low: lows });
            const offset = tickerData.length - output.length;

            results.push({
                id: id,
                name: "Parabolic SAR",
                pane: "overlay",
                series: [{
                    type: "Line",
                    data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any,
                    options: { color: color || "#8B5CF6", lineWidth: 0, crosshairMarkerVisible: true, pointMarkersVisible: true, pointMarkersRadius: 2 }
                }]
            });
        }

        // --- OSCILLATORS ---
        else if (type === "RSI") {
            const period = params.period || 14;
            const output = RSI.calculate({ period, values: closes });
            const offset = tickerData.length - output.length;

            results.push({
                id: id,
                name: `RSI (${period})`,
                pane: "separate",
                series: [{
                    type: "Line",
                    data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any,
                    options: { color: color || "#A855F7", lineWidth: 2 }
                }]
            });
        }
        else if (type === "MACD") {
            const fast = params.fast || 12;
            const slow = params.slow || 26;
            const signal = params.signal || 9;
            const output = MACD.calculate({ values: closes, fastPeriod: fast, slowPeriod: slow, signalPeriod: signal, SimpleMAOscillator: false, SimpleMASignal: false });
            const offset = tickerData.length - output.length;

            if (output.length > 0) {
                results.push({
                    id: id,
                    name: `MACD (${fast}, ${slow}, ${signal})`,
                    pane: "separate",
                    series: [
                        {
                            type: "Histogram",
                            name: "Hist",
                            data: output.map((v, i) => {
                                const pt = mapTime(v.histogram || 0, i, offset);
                                if (!pt) return null;
                                return { ...pt, color: (v.histogram || 0) >= 0 ? "#22c55e" : "#ef4444" };
                            }).filter(Boolean) as any,
                        },
                        {
                            type: "Line",
                            name: "MACD",
                            data: output.map((v, i) => mapTime(v.MACD || 0, i, offset)).filter(Boolean) as any,
                            options: { color: "#3B82F6", lineWidth: 1 }
                        },
                        {
                            type: "Line",
                            name: "Signal",
                            data: output.map((v, i) => mapTime(v.signal || 0, i, offset)).filter(Boolean) as any,
                            options: { color: "#F97316", lineWidth: 1 }
                        }
                    ]
                });
            }
        }
        else if (type === "Stochastic") {
            const period = params.period || 14;
            const signal = params.signal || 3;
            const output = Stochastic.calculate({ high: highs, low: lows, close: closes, period, signalPeriod: signal });
            const offset = tickerData.length - output.length;

            results.push({
                id: id,
                name: `Stoch (${period}, ${signal})`,
                pane: "separate",
                series: [
                    { type: "Line", name: "%K", data: output.map((v, i) => mapTime(v.k, i, offset)).filter(Boolean) as any, options: { color: "#3B82F6", lineWidth: 1 } },
                    { type: "Line", name: "%D", data: output.map((v, i) => mapTime(v.d, i, offset)).filter(Boolean) as any, options: { color: "#F97316", lineWidth: 1 } }
                ]
            });
        }
        else if (type === "CCI") {
            const period = params.period || 20;
            const output = CCI.calculate({ high: highs, low: lows, close: closes, period });
            const offset = tickerData.length - output.length;
            results.push({
                id: id,
                name: `CCI (${period})`,
                pane: "separate",
                series: [{ type: "Line", data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any, options: { color: color || "#06b6d4", lineWidth: 2 } }]
            });
        }
        else if (type === "ATR") {
            const period = params.period || 14;
            const output = ATR.calculate({ high: highs, low: lows, close: closes, period });
            const offset = tickerData.length - output.length;
            results.push({
                id: id,
                name: `ATR (${period})`,
                pane: "separate",
                series: [{ type: "Line", data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any, options: { color: color || "#ec4899", lineWidth: 2 } }]
            });
        }
        else if (type === "WilliamsR") {
            const period = params.period || 14;
            const output = WilliamsR.calculate({ high: highs, low: lows, close: closes, period });
            const offset = tickerData.length - output.length;
            results.push({
                id: id,
                name: `Williams %R (${period})`,
                pane: "separate",
                series: [{ type: "Line", data: output.map((v, i) => mapTime(v, i, offset)).filter(Boolean) as any, options: { color: color || "#eab308", lineWidth: 2 } }]
            });
        }
        else if (type === "SuperTrend") {
            const period = params.period || 10;
            const multiplier = params.multiplier || 3;
            const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });

            // Custom SuperTrend Calculation
            const superTrend: { time: string | number; value: number; direction: 1 | -1 }[] = [];
            let prevTrend = 1;
            let prevUpper = 0;
            let prevLower = 0;

            // Offset to match ATR startup
            const atrOffset = tickerData.length - atr.length;

            for (let i = 0; i < atr.length; i++) {
                const dataIndex = i + atrOffset;
                const h = highs[dataIndex];
                const l = lows[dataIndex];
                const c = closes[dataIndex];
                const currentAtr = atr[i];

                const basicUpper = (h + l) / 2 + multiplier * currentAtr;
                const basicLower = (h + l) / 2 - multiplier * currentAtr;

                let upper = basicUpper;
                let lower = basicLower;

                if (i > 0) {
                    const prevC = closes[dataIndex - 1];
                    if (basicUpper < prevUpper || prevC > prevUpper) {
                        upper = basicUpper;
                    } else {
                        upper = prevUpper;
                    }

                    if (basicLower > prevLower || prevC < prevLower) {
                        lower = basicLower;
                    } else {
                        lower = prevLower;
                    }
                }

                let trend = prevTrend;
                if (trend === 1 && c < lower) trend = -1;
                else if (trend === -1 && c > upper) trend = 1;

                prevTrend = trend;
                prevUpper = upper;
                prevLower = lower;

                superTrend.push({
                    time: tickerData[dataIndex].time,
                    value: trend === 1 ? lower : upper,
                    direction: trend as 1 | -1
                });
            }

            results.push({
                id: id,
                name: `SuperTrend (${period}, ${multiplier})`,
                pane: "overlay",
                series: [{
                    type: "Line",
                    data: superTrend.map(st => ({ time: st.time, value: st.value, color: st.direction === 1 ? "#22c55e" : "#ef4444" })),
                    options: { lineWidth: 2 }
                }]
            });
        }
    });

    return results;
}

export function calculateHeikinAshi(data: ChartDataPoint[]): ChartDataPoint[] {
    if (!data || data.length === 0) return [];

    const haData: ChartDataPoint[] = [];

    // First candle is same as standard
    // haOpen for index 0 is (O+C)/2

    // Iterating
    for (let i = 0; i < data.length; i++) {
        const d = data[i];

        // HA Close: (O + H + L + C) / 4
        const haClose = (d.open + d.high + d.low + d.close) / 4;

        // HA Open: (Prev HA Open + Prev HA Close) / 2
        let haOpen;
        if (i === 0) {
            haOpen = (d.open + d.close) / 2;
        } else {
            haOpen = (haData[i - 1].open + haData[i - 1].close) / 2;
        }

        // HA High: Max(H, HA Open, HA Close)
        const haHigh = Math.max(d.high, haOpen, haClose);

        // HA Low: Min(L, HA Open, HA Close)
        const haLow = Math.min(d.low, haOpen, haClose);

        haData.push({
            time: d.time,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
            volume: d.volume
        });
    }

    return haData;
}
