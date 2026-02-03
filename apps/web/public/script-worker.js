/* eslint-disable no-new-func */
importScripts("/technicalindicators.js");

self.onmessage = function (e) {
    const { scriptCode, contextData } = e.data;

    // technicalindicators is loaded as global 'technicalindicators' or 'TI' depending on build.
    // The browser build usually exposes a global variable.
    // Let's assume the user context expects "SMA", "RSI" etc. 
    // We need to map the global library to these names if they aren't directly exposed.

    // Reconstruct the context for the runner
    const logs = [];
    const signals = [];
    const plots = new Map();

    const log = (...args) => {
        logs.push(args.map(a => JSON.stringify(a)).join(" "));
    };

    const plotArray = (name, values, options) => {
        if (!Array.isArray(values) || values.length === 0) return;
        const plotData = values.map((v, i) => ({
            time: contextData.times[i],
            value: v,
            color: options?.color
        })).filter(d => d.value !== undefined && d.value !== null);

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

    const sandboxContext = {
        // Data
        open: contextData.open,
        high: contextData.high,
        low: contextData.low,
        close: contextData.close,
        volume: contextData.volume,
        times: contextData.times,

        // Utils
        log,
        plot: plotArray,
        signal,

        // Indicators (using the imported library)
        // Note: CDN import might put it under 'technicalindicators'
        SMA: { calculate: (input) => handleIndicator("SMA", input) },
        EMA: { calculate: (input) => handleIndicator("EMA", input) },
        RSI: { calculate: (input) => handleIndicator("RSI", input) },
        MACD: { calculate: (input) => handleIndicator("MACD", input) },
        BollingerBands: { calculate: (input) => handleIndicator("BollingerBands", input) },

        // Helper
        crossover: (seriesA, seriesB) => {
            const crosses = [];
            for (let i = 1; i < seriesA.length; i++) {
                if (seriesA[i - 1] <= seriesB[i - 1] && seriesA[i] > seriesB[i]) crosses.push(i);
            }
            return crosses;
        },
    };

    // Helper to interact with global library
    function handleIndicator(name, input) {
        // @ts-ignore
        const lib = self.technicalindicators;
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
        const runner = new Function(
            ...Object.keys(sandboxContext),
            `
            try {
                ${scriptCode}
            } catch(e) {
                throw e;
            }
            `
        );

        runner(...Object.values(sandboxContext));

        self.postMessage({
            type: "success",
            results: {
                signals,
                plots: Array.from(plots.values()),
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
