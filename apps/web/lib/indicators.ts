import { SMA, EMA, BollingerBands, RSI, MACD, Stochastic, CCI, ATR, WilliamsR, PSAR, ADX, MFI, WMA, SD } from "technicalindicators";
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

// --- Strategy Implementation ---

const mapTime = (tickerData: ChartDataPoint[], val: number, index: number, offset: number) => {
    const dataIndex = index + offset;
    if (dataIndex < 0 || dataIndex >= tickerData.length) return null;
    return {
        time: tickerData[dataIndex].time,
        value: val
    };
};

type IndicatorStrategy = (config: IndicatorConfig, data: { closes: number[], highs: number[], lows: number[], tickerData: ChartDataPoint[] }) => IndicatorResult | null;

const strategies: Record<string, IndicatorStrategy> = {
    SMA: (config, { closes, tickerData }) => {
        const period = config.params.period || 20;
        const output = SMA.calculate({ period, values: closes });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `SMA (${period})`,
            pane: "overlay",
            series: [{
                type: "Line",
                data: output.map((v: number, i: number) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any,
                options: { color: config.color || "#F59E0B", lineWidth: 2 }
            }]
        };
    },
    EMA: (config, { closes, tickerData }) => {
        const period = config.params.period || 20;
        const output = EMA.calculate({ period, values: closes });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `EMA (${period})`,
            pane: "overlay",
            series: [{
                type: "Line",
                data: output.map((v: number, i: number) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any,
                options: { color: config.color || "#3B82F6", lineWidth: 2 }
            }]
        };
    },
    BollingerBands: (config, { closes, tickerData }) => {
        const period = config.params.period || 20;
        const stdDev = config.params.stdDev || 2;
        const output = BollingerBands.calculate({ period, stdDev, values: closes });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `BB (${period}, ${stdDev})`,
            pane: "overlay",
            series: [
                {
                    type: "Line",
                    name: "Upper",
                    data: output.map((v, i) => mapTime(tickerData, v.upper, i, offset)).filter(Boolean) as any,
                    options: { color: config.color || "rgba(52, 211, 153, 0.5)", lineWidth: 1 }
                },
                {
                    type: "Line",
                    name: "Lower",
                    data: output.map((v, i) => mapTime(tickerData, v.lower, i, offset)).filter(Boolean) as any,
                    options: { color: config.color || "rgba(52, 211, 153, 0.5)", lineWidth: 1 }
                },
                {
                    type: "Line",
                    name: "Basis",
                    data: output.map((v, i) => mapTime(tickerData, v.middle, i, offset)).filter(Boolean) as any,
                    options: { color: config.color || "rgba(52, 211, 153, 0.8)", lineWidth: 1, lineStyle: 2 }
                }
            ]
        };
    },
    ParabolicSAR: (config, { highs, lows, tickerData }) => {
        const step = config.params.step || 0.02;
        const max = config.params.max || 0.2;
        const output = PSAR.calculate({ step, max, high: highs, low: lows });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: "Parabolic SAR",
            pane: "overlay",
            series: [{
                type: "Line",
                data: output.map((v, i) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any,
                options: { color: config.color || "#8B5CF6", lineWidth: 0, crosshairMarkerVisible: true, pointMarkersVisible: true, pointMarkersRadius: 2 }
            }]
        };
    },
    RSI: (config, { closes, tickerData }) => {
        const period = config.params.period || 14;
        const output = RSI.calculate({ period, values: closes });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `RSI (${period})`,
            pane: "separate",
            series: [{
                type: "Line",
                data: output.map((v, i) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any,
                options: { color: config.color || "#A855F7", lineWidth: 2 }
            }]
        };
    },
    MACD: (config, { closes, tickerData }) => {
        const fast = config.params.fast || 12;
        const slow = config.params.slow || 26;
        const signal = config.params.signal || 9;
        const output = MACD.calculate({ values: closes, fastPeriod: fast, slowPeriod: slow, signalPeriod: signal, SimpleMAOscillator: false, SimpleMASignal: false });
        const offset = tickerData.length - output.length;
        if (output.length === 0) return null;

        return {
            id: config.id,
            name: `MACD (${fast}, ${slow}, ${signal})`,
            pane: "separate",
            series: [
                {
                    type: "Histogram",
                    name: "Hist",
                    data: output.map((v, i) => {
                        const pt = mapTime(tickerData, v.histogram || 0, i, offset);
                        if (!pt) return null;
                        return { ...pt, color: (v.histogram || 0) >= 0 ? "#22c55e" : "#ef4444" };
                    }).filter(Boolean) as any,
                },
                {
                    type: "Line",
                    name: "MACD",
                    data: output.map((v, i) => mapTime(tickerData, v.MACD || 0, i, offset)).filter(Boolean) as any,
                    options: { color: "#3B82F6", lineWidth: 1 }
                },
                {
                    type: "Line",
                    name: "Signal",
                    data: output.map((v, i) => mapTime(tickerData, v.signal || 0, i, offset)).filter(Boolean) as any,
                    options: { color: "#F97316", lineWidth: 1 }
                }
            ]
        };
    },
    Stochastic: (config, { highs, lows, closes, tickerData }) => {
        const period = config.params.period || 14;
        const signal = config.params.signal || 3;
        const output = Stochastic.calculate({ high: highs, low: lows, close: closes, period, signalPeriod: signal });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `Stoch (${period}, ${signal})`,
            pane: "separate",
            series: [
                { type: "Line", name: "%K", data: output.map((v, i) => mapTime(tickerData, v.k, i, offset)).filter(Boolean) as any, options: { color: "#3B82F6", lineWidth: 1 } },
                { type: "Line", name: "%D", data: output.map((v, i) => mapTime(tickerData, v.d, i, offset)).filter(Boolean) as any, options: { color: "#F97316", lineWidth: 1 } }
            ]
        };
    },
    CCI: (config, { highs, lows, closes, tickerData }) => {
        const period = config.params.period || 20;
        const output = CCI.calculate({ high: highs, low: lows, close: closes, period });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `CCI (${period})`,
            pane: "separate",
            series: [{ type: "Line", data: output.map((v, i) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any, options: { color: config.color || "#06b6d4", lineWidth: 2 } }]
        };
    },
    ATR: (config, { highs, lows, closes, tickerData }) => {
        const period = config.params.period || 14;
        const output = ATR.calculate({ high: highs, low: lows, close: closes, period });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `ATR (${period})`,
            pane: "separate",
            series: [{ type: "Line", data: output.map((v, i) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any, options: { color: config.color || "#ec4899", lineWidth: 2 } }]
        };
    },
    WilliamsR: (config, { highs, lows, closes, tickerData }) => {
        const period = config.params.period || 14;
        const output = WilliamsR.calculate({ high: highs, low: lows, close: closes, period });
        const offset = tickerData.length - output.length;
        return {
            id: config.id,
            name: `Williams %R (${period})`,
            pane: "separate",
            series: [{ type: "Line", data: output.map((v, i) => mapTime(tickerData, v, i, offset)).filter(Boolean) as any, options: { color: config.color || "#eab308", lineWidth: 2 } }]
        };
    },
    SuperTrend: (config, { highs, lows, closes, tickerData }) => {
        const period = config.params.period || 10;
        const multiplier = config.params.multiplier || 3;
        const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });

        const atrOffset = tickerData.length - atr.length;

        return {
            id: config.id,
            name: `SuperTrend (${period}, ${multiplier})`,
            pane: "overlay",
            series: [{
                type: "Line",
                data: calculateSuperTrendPoints(highs, lows, closes, tickerData, atr, multiplier, atrOffset),
                options: { lineWidth: 2 }
            }]
        };
    }
};


export function calculateIndicators(tickerData: ChartDataPoint[], configs: IndicatorConfig[]): IndicatorResult[] {
    if (!tickerData || tickerData.length < 10) return [];

    const closes = tickerData.map(d => d.close);
    const highs = tickerData.map(d => d.high);
    const lows = tickerData.map(d => d.low);
    const dataContext = { closes, highs, lows, tickerData };

    const results: IndicatorResult[] = [];

    configs.forEach(config => {
        const strategy = strategies[config.type];
        if (strategy) {
            const result = strategy(config, dataContext);
            if (result) results.push(result);
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

function calculateSuperTrendPoints(
    highs: number[],
    lows: number[],
    closes: number[],
    tickerData: ChartDataPoint[],
    atr: number[],
    multiplier: number,
    atrOffset: number
) {
    const superTrend: { time: string | number; value: number; direction: 1 | -1 }[] = [];
    let prevTrend = 1;
    let prevUpper = 0;
    let prevLower = 0;

    for (let i = 0; i < atr.length; i++) {
        const dataIndex = i + atrOffset;
        const currentAtr = atr[i];

        // Basic Bands
        const mid = (highs[dataIndex] + lows[dataIndex]) / 2;
        const basicUpper = mid + multiplier * currentAtr;
        const basicLower = mid - multiplier * currentAtr;

        // Final Bands
        let upper = basicUpper;
        let lower = basicLower;

        if (i > 0) {
            const prevC = closes[dataIndex - 1];
            ({ upper, lower } = calculateFinalBands(basicUpper, basicLower, prevUpper, prevLower, prevC));
        }

        // Trend
        const c = closes[dataIndex];
        const trend = calculateTrendState(c, upper, lower, prevTrend);

        prevTrend = trend;
        prevUpper = upper;
        prevLower = lower;

        superTrend.push({
            time: tickerData[dataIndex].time,
            value: trend === 1 ? lower : upper,
            direction: trend as 1 | -1
        });
    }

    return superTrend.map(st => ({
        time: st.time,
        value: st.value,
        color: st.direction === 1 ? "#22c55e" : "#ef4444"
    }));
}

function calculateTrendState(
    close: number,
    upper: number,
    lower: number,
    prevTrend: number
): number {
    if (prevTrend === 1 && close < lower) return -1;
    if (prevTrend === -1 && close > upper) return 1;
    return prevTrend;
}

function calculateFinalBands(
    basicUpper: number,
    basicLower: number,
    prevUpper: number,
    prevLower: number,
    prevClose: number
) {
    // Upper Band: If Basic < Prev OR PrevClose > PrevUpper, use Basic. Else keep Prev.
    // Explanation: Resistance only moves DOWN (tightens) unless price breaks it (reset).
    // Actually, usually: If Basic < Prev or PrevClose > PrevUpper -> we accept Basic?
    // Wait, the standard formula is:
    // finalUpper = (basicUpper < prevUpper || prevClose > prevUpper) ? basicUpper : prevUpper
    // finalLower = (basicLower > prevLower || prevClose < prevLower) ? basicLower : prevLower

    let upper = (basicUpper < prevUpper || prevClose > prevUpper) ? basicUpper : prevUpper;
    let lower = (basicLower > prevLower || prevClose < prevLower) ? basicLower : prevLower;

    return { upper, lower };
}

function getDateFromTime(time: string | number): Date {
    if (typeof time === 'string') return new Date(time);
    // Asume seconds if small number (less than year 3000 in ms), else ms
    if (typeof time === 'number') {
        if (time < 100000000000) return new Date(time * 1000);
        return new Date(time);
    }
    return new Date();
}

/**
 * Calculates Session VWAP (Volume Weighted Average Price)
 * Resets at the beginning of each day (based on data time).
 */
function calculateSessionVWAP(data: ChartDataPoint[]): number | null {
    if (!data || data.length === 0) return null;

    const lastPoint = data[data.length - 1];
    // if (!lastPoint.volume) return null; // Removed per user feedback: allows 0 vol on last candle if session has vol.

    const lastDate = getDateFromTime(lastPoint.time);

    // Find the start of the current session (day)
    let startIndex = 0;
    for (let i = data.length - 1; i >= 0; i--) {
        const d = getDateFromTime(data[i].time);
        if (d.getDate() !== lastDate.getDate() ||
            d.getMonth() !== lastDate.getMonth() ||
            d.getFullYear() !== lastDate.getFullYear()) {
            startIndex = i + 1;
            break;
        }
        if (i === 0) startIndex = 0;
    }

    let cumulativeTPV = 0;
    let cumulativeVol = 0;

    for (let i = startIndex; i < data.length; i++) {
        const d = data[i];
        const typicalPrice = (d.high + d.low + d.close) / 3;
        const vol = d.volume || 0;

        cumulativeTPV += typicalPrice * vol;
        cumulativeVol += vol;
    }

    if (cumulativeVol === 0) return null;
    return cumulativeTPV / cumulativeVol;
}

function calculateOBV(data: ChartDataPoint[]): number[] {
    if (!data || data.length === 0) return [];

    const obv: number[] = [0]; // Start with 0

    for (let i = 1; i < data.length; i++) {
        const curr = data[i];
        const prev = data[i - 1];
        const prevObv = obv[i - 1];

        let newObv = prevObv;
        if (curr.close > prev.close) {
            newObv = prevObv + (curr.volume || 0);
        } else if (curr.close < prev.close) {
            newObv = prevObv - (curr.volume || 0);
        }
        // If equal, no change

        obv.push(newObv);
    }
    return obv;
}


// --- Technical Summary Engine ---

export interface TechnicalSummary {
    summary: {
        bullish: number;
        bearish: number;
        neutral: number;
        verdict: string; // "Strong Buy", "Buy", "Neutral", "Sell", "Strong Sell"
        total: number;
    };
    indicators: {
        name: string;
        value: string;
        verdict: "Bullish" | "Bearish" | "Neutral";
    }[];
    movingAverages: {
        period: number;
        simple: { value: number; verdict: "Bullish" | "Bearish" | "Neutral" };
        exponential: { value: number; verdict: "Bullish" | "Bearish" | "Neutral" };
        weighted: { value: number; verdict: "Bullish" | "Bearish" | "Neutral" };
    }[];
    pivotPoints: {
        r3: number;
        r2: number;
        r1: number;
        pivot: number;
        s1: number;
        s2: number;
        s3: number;
    };
}

export function getTechnicalSummary(data: ChartDataPoint[]): TechnicalSummary | null {
    if (!data || data.length < 50) return null;

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const lastClose = closes[closes.length - 1];

    // --- 1. Quant Regime Detection (ADX) ---
    // ADX measures Trend Strength (0-100). 
    // < 25 = Weak Trend / Ranging (Mean Reversion strategies work best)
    // > 25 = Strong Trend (Trend Following strategies work best)
    const periodADX = 14;
    const adxOutput = ADX.calculate({ high: highs, low: lows, close: closes, period: periodADX }).pop();
    const adxValue = adxOutput ? adxOutput.adx : 0;
    const isTrending = adxValue > 25;
    const trendStrength = adxValue > 50 ? "Very Strong" : adxValue > 25 ? "Strong" : "Weak";

    let score = 0; // Weighted Score: +ve = Bullish, -ve = Bearish
    let totalWeights = 0;

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    const indicatorsList: { name: string; value: string; verdict: "Bullish" | "Bearish" | "Neutral" }[] = [];

    // Helper to Add Signal
    const addSignal = (name: string, value: string, signal: -1 | 0 | 1, weight: number) => {
        let verdict: "Bullish" | "Bearish" | "Neutral" = "Neutral";
        if (signal === 1) { verdict = "Bullish"; bullishCount++; }
        else if (signal === -1) { verdict = "Bearish"; bearishCount++; }
        else { neutralCount++; }

        score += signal * weight;
        totalWeights += weight;

        indicatorsList.push({ name, value, verdict });
    };

    // --- 2. Oscillators (RSI, Stoch, CCI) ---
    // In Ranging markets (Weak ADX), these are leading indicators. High Weight.
    // In Trending markets (Strong ADX), they trigger false reversals. Low Weight / Trend Context.
    const oscillatorWeight = isTrending ? 0.5 : 1.5;

    // RSI (14)
    const rsiVal = RSI.calculate({ period: 14, values: closes }).pop();
    if (rsiVal !== undefined) {
        let sig: -1 | 0 | 1 = 0;
        if (isTrending) {
            // Trend Correction Checks (e.g. Pullback in uptrend) or strict Overbought doesn't mean sell
            // Simple Logic: If Strong Trend (>25), RSI > 70 is just "Strong Momentum" unless divergence (too complex for now).
            // Let's stick to standard but lower weight.
            if (rsiVal >= 70) sig = -1;
            else if (rsiVal <= 30) sig = 1;
        } else {
            // Ranging: Standard Reversion
            if (rsiVal >= 70) sig = -1;
            else if (rsiVal <= 30) sig = 1;
        }
        addSignal(`RSI (14)`, rsiVal.toFixed(2), sig, oscillatorWeight);
    }

    // Stochastic
    const stoch = Stochastic.calculate({ high: highs, low: lows, close: closes, period: 14, signalPeriod: 3 }).pop();
    if (stoch) {
        let sig: -1 | 0 | 1 = 0;
        if (stoch.k > stoch.d && stoch.k < 80) sig = 1;
        else if (stoch.k < stoch.d && stoch.k > 20) sig = -1;

        // Filter against trend? If Trending Up, ignore Stoch Sell?
        // Quant Refinement: If Trending and signal opposes trend, weight 0.
        // We calculate trend direction via EMAs later. For now, simple weight.
        addSignal(`Stoch %K`, stoch.k.toFixed(2), sig, oscillatorWeight);
    }

    // CCI
    const cci = CCI.calculate({ high: highs, low: lows, close: closes, period: 20 }).pop();
    if (cci !== undefined) {
        let sig: -1 | 0 | 1 = 0;
        if (cci < -100) sig = 1;
        else if (cci > 100) sig = -1;
        addSignal(`CCI (20)`, cci.toFixed(2), sig, oscillatorWeight);
    }

    // --- 3. Trend Indicators (MACD, MAs) ---
    // In Trending markets, these are King. High Weight.
    // In Ranging markets, they generate whipsaws. Low Weight.
    const trendWeight = isTrending ? 2.0 : 0.5;

    // MACD
    const macd = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }).pop();
    if (macd) {
        const val = macd.MACD || 0;
        const sigLine = macd.signal || 0;
        const hist = macd.histogram || 0;

        let sig: -1 | 0 | 1 = 0;
        // MACD Quant Rule: Crossover is late. Histogram direction is faster.
        // If Hist > 0 and Rising = Strong Bull
        if (val > sigLine) sig = 1;
        else if (val < sigLine) sig = -1;

        addSignal("MACD", val.toFixed(2), sig, trendWeight);
    }

    // Moving Averages
    const maPeriods = [10, 20, 50, 100, 200];
    const movingAverages = maPeriods.map(period => {
        if (closes.length < period) return null;

        const sma = SMA.calculate({ period, values: closes }).pop() || 0;
        const ema = EMA.calculate({ period, values: closes }).pop() || 0;
        const wma = WMA.calculate({ period, values: closes }).pop() || 0;

        let smaSig: -1 | 0 | 1 = 0;
        let emaSig: -1 | 0 | 1 = 0;
        let wmaSig: -1 | 0 | 1 = 0;

        // Price > MA
        if (lastClose > sma) smaSig = 1; else smaSig = -1;
        if (lastClose > ema) emaSig = 1; else emaSig = -1;
        if (lastClose > wma) wmaSig = 1; else wmaSig = -1;

        // Update Global Counts (Votes)
        if (smaSig === 1) bullishCount++; else bearishCount++;
        if (emaSig === 1) bullishCount++; else bearishCount++;
        if (wmaSig === 1) bullishCount++; else bearishCount++;

        // Update Weighted Score
        score += smaSig * trendWeight;
        score += emaSig * trendWeight;
        score += wmaSig * trendWeight;
        totalWeights += (trendWeight * 3);

        return {
            period,
            simple: { value: sma, verdict: smaSig === 1 ? "Bullish" : "Bearish" },
            exponential: { value: ema, verdict: emaSig === 1 ? "Bullish" : "Bearish" },
            weighted: { value: wma, verdict: wmaSig === 1 ? "Bullish" : "Bearish" }
        };
    }).filter(Boolean) as any[];

    // --- Support & Resistance (Standard Pivot) ---
    const prevBar = data.length > 1 ? data[data.length - 2] : data[data.length - 1];
    const pp = (prevBar.high + prevBar.low + prevBar.close) / 3;
    const r1 = 2 * pp - prevBar.low;
    const s1 = 2 * pp - prevBar.high;
    const r2 = pp + (prevBar.high - prevBar.low);
    const s2 = pp - (prevBar.high - prevBar.low);
    const r3 = prevBar.high + 2 * (pp - prevBar.low);
    const s3 = prevBar.low - 2 * (prevBar.high - pp);

    // --- 4. Volume Indicators (VWAP, MFI) ---
    // Institutional Activity. High Weight. 
    const volumeWeight = 2.5;

    // VWAP - Institutional Benchmark
    // Custom Implementation: Session VWAP (Resets daily)
    const vwapValue = calculateSessionVWAP(data);

    if (vwapValue !== null) {
        let sig: -1 | 0 | 1 = 0;
        if (lastClose > vwapValue) sig = 1; else sig = -1;
        addSignal("VWAP", vwapValue.toFixed(2), sig, volumeWeight);
    }

    // MFI (Money Flow Index) - Volume Weighted RSI
    // Ensure we have enough data (period 14 + checks)
    if (data.length > 20) {
        // Fallback to 0 volume if undefined to prevent NaN
        const volumes = data.map(d => d.volume || 0);
        // Check if volumes are not all zero
        const hasVolume = volumes.some(v => v > 0);

        if (hasVolume) {
            const mfiInput = {
                high: highs,
                low: lows,
                close: closes,
                volume: volumes,
                period: 14
            };
            const mfiOutput = MFI.calculate(mfiInput).pop();

            if (mfiOutput !== undefined && !isNaN(mfiOutput)) {
                let sig: -1 | 0 | 1 = 0;
                if (mfiOutput > 80) sig = -1; // Overbought
                else if (mfiOutput < 20) sig = 1; // Oversold
                addSignal("MFI (14)", mfiOutput.toFixed(2), sig, isTrending ? 0.5 : 1.5);
            }
        }
    }

    // On-Balance Volume (OBV) - Trend Confirmation
    // Signal: OBV > SMA(OBV, 20) -> Accumulation
    const obvSeries = calculateOBV(data);
    if (obvSeries.length > 20) {
        // Calculate SMA(20) of OBV
        const obvSma = SMA.calculate({ period: 20, values: obvSeries }).pop();
        const currentObv = obvSeries[obvSeries.length - 1];

        if (obvSma !== undefined) {
            let sig: -1 | 0 | 1 = 0;
            // Interpret "slope" or "position vs SMA"
            if (currentObv > obvSma) sig = 1; // Accumulation
            else if (currentObv < obvSma) sig = -1; // Distribution

            // Weight: Moderate. 
            addSignal("OBV (Trend)", sig === 1 ? "Accumulation" : "Distribution", sig, 1.5);
        }
    }

    // --- 5. Volatility Indicators (StdDev, Keltner) ---
    const volWeight = 1.5;

    // Standard Deviation (20)
    // Quant Usage: Volatility Squeeze detection.
    const sdOutput = SD.calculate({ period: 20, values: closes }).pop();
    if (sdOutput) {
        // Just info for now, or use to adjust other weights?
        // Let's add it as Neutral info unless extreme.
        addSignal("StdDev (20)", sdOutput.toFixed(2), 0, 0);
    }

    // Keltner Channels (Raschke: EMA 20, ATR 10, Mult 2)
    // Usage: Breakout confirmation.
    const kcEma = EMA.calculate({ period: 20, values: closes }).pop();
    const kcAtr = ATR.calculate({ period: 10, high: highs, low: lows, close: closes }).pop();

    if (kcEma && kcAtr) {
        const kcUpper = kcEma + (2 * kcAtr);
        const kcLower = kcEma - (2 * kcAtr);

        let sig: -1 | 0 | 1 = 0;
        // Breakout Logic: Close > Upper = Strong Bullish Momentum
        if (lastClose > kcUpper) sig = 1;
        else if (lastClose < kcLower) sig = -1;

        // If Trending, this is a very strong confirmation
        const kcWeight = isTrending ? 2.5 : 1.0;
        addSignal("Keltner Channels", lastClose > kcUpper ? "Breakout Up" : lastClose < kcLower ? "Breakout Down" : "Inside", sig, kcWeight);
    }

    // --- Final Verdict Logic ---
    // Normalized Score (-1 to 1)
    const normalizedScore = totalWeights > 0 ? score / totalWeights : 0;

    let verdict = "Neutral";
    if (normalizedScore > 0.5) verdict = "Strong Buy";
    else if (normalizedScore > 0.1) verdict = "Buy";
    else if (normalizedScore < -0.5) verdict = "Strong Sell";
    else if (normalizedScore < -0.1) verdict = "Sell";

    // Add Quant Context to Indicators List for UI visibility?
    // We can sneak it in or leave UI as is. UI shows verdicts.
    // Let's append ADX info to the list for user to see the Regime
    indicatorsList.push({
        name: `ADX (${periodADX}) - ${trendStrength}`,
        value: adxValue.toFixed(2),
        verdict: isTrending ? "Neutral" : "Neutral" // Info only
    });

    return {
        summary: {
            bullish: bullishCount,
            bearish: bearishCount,
            neutral: neutralCount,
            verdict,
            total: bullishCount + bearishCount + neutralCount
        },
        indicators: indicatorsList,
        movingAverages,
        pivotPoints: { pivot: pp, r1, r2, r3, s1, s2, s3 }
    };
}
