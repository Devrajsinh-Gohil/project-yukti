/* eslint-disable no-new-func */
importScripts("/regenerator-runtime.js", "/technicalindicators.js");

self.onmessage = function (e) {
    const { scriptCode, contextData, parameters } = e.data;

    if (!scriptCode || !contextData) {
        // Handle error: scriptCode or contextData missing
        self.postMessage({ error: "Missing scriptCode or contextData" });
        return;
    }

    // technicalindicators is loaded as global 'technicalindicators' or 'TI' depending on build.
    // The browser build usually exposes a global variable.
    // Let's assume the user context expects "SMA", "RSI" etc. 
    // We need to map the global library to these names if they aren't directly exposed.

    // Reconstruct the context for the runner
    const logs = [];
    const signals = [];
    const plots = new Map();
    const shapes = [];
    const bgColors = [];

    const log = (...args) => {
        logs.push(args.map(a => JSON.stringify(a)).join(" "));
    };

    const plotArray = (name, values, options) => {
        if (!Array.isArray(values) || values.length === 0) return;

        // Auto-extract number from object (handles library results like {macd, signal, histogram})
        const getVal = (v) => {
            if (typeof v === 'number') return v;
            if (typeof v === 'object' && v !== null) {
                return v.value ?? v.close ?? v.price ?? v.histogram ?? v.signal ?? v.macd ?? Object.values(v)[0];
            }
            return null;
        };

        const plotData = values.map((v, i) => ({
            time: contextData.times[i],
            value: getVal(v),
            color: options?.color
        })).filter(d => typeof d.value === 'number' && !isNaN(d.value));

        plots.set(name, {
            name,
            type: options?.type || "line",
            data: plotData,
            color: options?.color
        });
    };

    const signal = (index, type, label) => {
        if (index < 0 || index >= contextData.times.length) return;
        signals.push({
            time: contextData.times[index],
            type,
            price: contextData.close[index],
            label
        });
    };

    const plotShape = (val, title, style = "circle", location = "aboveBar", color = "blue", size = "small", offset = 0, text = "", textColor = "white") => {
        // val is typically a boolean condition or numeric. If standard Pine Script boolean series:
        // We can't iterate efficiently if passed as series, so usually this is called inside a loop or passed as (series, ...)
        // Let's assume this is called Imperatively per bar index like signal(i, ...) OR user passes an Index.
        // Actually, matching standard Pine Script 'plotShape' takes a SERIES.
        // But our engine runs imperative loops mostly (e.g. for loop).
        // Let's support: plotShape(index, style, ...) similar to signal.

        // Wait, current script example uses: `signal(i, ...)`
        // Let's standardize: `plotShape(index, style, ...)`

        const index = val; // First arg treated as index for now to keep it simple imperative
        if (typeof index !== 'number' || index < 0 || index >= contextData.times.length) return;

        shapes.push({
            id: `shape-${shapes.length}`,
            time: contextData.times[index],
            type: style,
            position: location,
            color: color,
            size: size,
            text: text,
            textColor: textColor
        });
    };

    const bgcolor = (index, color) => {
        if (typeof index !== 'number' || index < 0 || index >= contextData.times.length) return;
        if (!color) return; // Null/undefined means no color

        bgColors.push({
            time: contextData.times[index],
            color: color
        });
    };

    // --- Quant Built-ins & Helpers ---

    // 1. Price Series
    const open = contextData.open;
    const high = contextData.high;
    const low = contextData.low;
    const close = contextData.close;
    const volume = contextData.volume;
    const times = contextData.times;
    const length = close.length;
    const bar_index = Array.from({ length }, (_, i) => i);

    const hl2 = high.map((h, i) => (h + low[i]) / 2);
    const hlc3 = high.map((h, i) => (h + low[i] + close[i]) / 3);
    const ohlc4 = high.map((h, i) => (open[i] + h + low[i] + close[i]) / 4);

    // 2. Math & Logic helpers
    const na = (v) => v === undefined || v === null || isNaN(v);
    const nz = (v, replacement = 0) => na(v) ? replacement : v;

    // Get value at index with bounds check
    const val = (series, idx) => {
        if (idx < 0) return NaN;
        if (idx >= series.length) return NaN; // Or last?
        return series[idx];
    };

    const change = (series) => {
        // Returns array? Or accessed inside loop?
        // Pine Script 'change(close)' implies a series result.
        // If we want to support `change(close)[i]`, it must be an array.
        // Let's return mapped array.
        return series.map((v, i) => i === 0 ? NaN : v - series[i - 1]);
    };

    const tr = high.map((h, i) => {
        if (i === 0) return h - low[i];
        const prevC = close[i - 1];
        return Math.max(h - low[i], Math.abs(h - prevC), Math.abs(low[i] - prevC));
    });

    // Helper for Lookback Functions
    // highest(high, 10) returns series
    const highest = (series, len) => {
        return series.map((_, i) => {
            if (i < len - 1) return NaN;
            let maxVal = -Infinity;
            for (let j = 0; j < len; j++) maxVal = Math.max(maxVal, series[i - j]);
            return maxVal;
        });
    };

    const lowest = (series, len) => {
        return series.map((_, i) => {
            if (i < len - 1) return NaN;
            let minVal = Infinity;
            for (let j = 0; j < len; j++) minVal = Math.min(minVal, series[i - j]);
            return minVal;
        });
    };

    const rising = (series, len) => {
        // True if current > prev for len bars? 
        // Pine: true if current x values are greater than any previous x.
        // Usually: strictly increasing.
        return series.map((_, i) => {
            if (i < len) return false;
            for (let j = 0; j < len; j++) {
                if (series[i - j] <= series[i - j - 1]) return false;
            }
            return true;
        });
    };

    const falling = (series, len) => {
        return series.map((_, i) => {
            if (i < len) return false;
            for (let j = 0; j < len; j++) {
                if (series[i - j] >= series[i - j - 1]) return false;
            }
            return true;
        });
    };

    const crossover = (seriesA, seriesB) => {
        // Treat constant as series
        const isNumA = typeof seriesA === 'number';
        const isNumB = typeof seriesB === 'number';

        // Return series of booleans
        // Use max length to ensure we cover the longest series
        const len = Math.max(isNumA ? 0 : seriesA.length, isNumB ? 0 : seriesB.length);
        const res = new Array(len).fill(false);

        for (let i = 1; i < len; i++) {
            const hasPrevA = isNumA || (i - 1) < seriesA.length;
            const hasCurrA = isNumA || i < seriesA.length;
            const hasPrevB = isNumB || (i - 1) < seriesB.length;
            const hasCurrB = isNumB || i < seriesB.length;

            if (hasPrevA && hasCurrA && hasPrevB && hasCurrB) {
                const valA = isNumA ? seriesA : seriesA[i];
                const prevA = isNumA ? seriesA : seriesA[i - 1];
                const valB = isNumB ? seriesB : seriesB[i];
                const prevB = isNumB ? seriesB : seriesB[i - 1];

                if (prevA <= prevB && valA > valB) res[i] = true;
            }
        }
        return res;
    };

    const crossunder = (seriesA, seriesB) => {
        return crossover(seriesB, seriesA);
    };


    // 3. Indicator Aliases (Pine-like)
    // sma(close, 14)
    const sma = (series, period) => handleIndicator("SMA", { values: series, period });
    const ema = (series, period) => handleIndicator("EMA", { values: series, period });
    const rsi = (series, period) => handleIndicator("RSI", { values: series, period });
    const wma = (series, period) => handleIndicator("WMA", { values: series, period });
    const atr = (period) => handleIndicator("ATR", { high, low, close, period });

    // SuperTrend requires special handling if library signature differs
    // library: period, multiplier.
    // Pine: supertrend(factor, period) -> [supertrend, direction]
    // Our library might return object?
    const supertrend = (period = 10, multiplier = 3) => {
        // @ts-ignore
        const lib = self.window || self.technicalindicators || self;
        if (lib && lib.SuperTrend) {
            return lib.SuperTrend.calculate({ period, multiplier, high, low, close });
            // Returns array of { value, trend }? Or just values?
            // Usually object. Let's return raw for now or map?
            // Pine returns [st, dir]. 
        }
        return [];
    };

    // Helper to automatically generate signals from boolean series (Vectorized support)
    const autoSignal = (buySeries, sellSeries) => {
        if (!Array.isArray(buySeries)) return;
        const len = buySeries.length;
        for (let i = 0; i < len; i++) {
            if (buySeries[i]) signal(i, "BUY", "BUY @ " + close[i].toFixed(2));
            else if (sellSeries && sellSeries[i]) signal(i, "SELL", "SELL @ " + close[i].toFixed(2));
        }
    };

    // --- Inputs ---
    // Defined before sandboxContext so it allows scripts to call input() and get defaults/params
    const input = (defval, title, options = {}) => {
        // If parameter passed from UI/Optimizer, use it.
        // Title is the unique key.
        if (parameters && parameters[title] !== undefined) {
            const val = parseFloat(parameters[title]);
            return isNaN(val) ? defval : val;
        }
        return defval;
    };

    const sandboxContext = {
        // Data Series
        open, high, low, close, volume, times,
        hl2, hlc3, ohlc4, bar_index,

        // Math/Logic
        nz, na, change, tr,
        highest, lowest, rising, falling,
        crossover, crossunder,
        autoSignal, // New helper

        // Indicators (Aliases)
        sma, ema, rsi, wma, atr, supertrend,

        // Utils
        log,
        plot: plotArray,
        signal,
        plotShape,
        bgcolor,
        input,

        // Raw Indicators (Keep for advanced usage)
        SMA: { calculate: (input) => handleIndicator("SMA", input) },
        EMA: { calculate: (input) => handleIndicator("EMA", input) },
        RSI: { calculate: (input) => handleIndicator("RSI", input) },
        MACD: { calculate: (input) => handleIndicator("MACD", input) },
        BollingerBands: { calculate: (input) => handleIndicator("BollingerBands", input) },
        Stochastic: { calculate: (input) => handleIndicator("Stochastic", input) },
        CCI: { calculate: (input) => handleIndicator("CCI", input) },
        ATR: { calculate: (input) => handleIndicator("ATR", input) },
    };

    // Helper to interact with global library
    function handleIndicator(name, input) {
        // @ts-ignore
        // Library attaches to self.window or self
        const lib = self.window || self.technicalindicators || self;
        if (!lib || !lib[name]) {
            throw new Error(`Indicator library not ready or ${name} not found`);
        }
        const res = lib[name].calculate(input);
        if (input.period && Array.isArray(res)) {
            const padding = Array(input.period - 1).fill(null);
            return [...padding, ...res];
        }
        return res;
    }

    try {
        const runner = new Function('sandbox',
            `with(sandbox) {
                try {
                    ${scriptCode}
                } catch(e) {
                    throw e;
                }
            }`
        );

        runner(sandboxContext);

        self.postMessage({
            type: "success",
            results: {
                signals,
                plots: Array.from(plots.values()),
                shapes,
                bgColors,
                logs
            }
        });

    } catch (err) {
        self.postMessage({
            type: "error",
            error: err.message,
            logs
        });
    }
};
