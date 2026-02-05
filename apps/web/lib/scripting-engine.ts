import {
    SMA, EMA, BollingerBands, RSI, MACD, Stochastic, CCI, ATR, WilliamsR, PSAR,
    ADX, AwesomeOscillator
} from "technicalindicators";
import { ChartDataPoint } from "./api";
export { type ChartDataPoint };

// --- Types ---

export interface Script {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
}

export interface ScriptSignal {
    time: string | number;
    type: "BUY" | "SELL";
    price: number;
    label?: string;
}

export interface ScriptShape {
    id: string;
    time: string | number;
    type: "arrowUp" | "arrowDown" | "circle" | "square" | "diamond" | "label" | "cross" | "x";
    color?: string;
    text?: string;
    textColor?: string;
    position?: "aboveBar" | "belowBar" | "auto";
    size?: "auto" | "tiny" | "small" | "normal" | "large" | "huge";
}

export interface ScriptBgColor {
    time: string | number;
    color: string;
}

export interface ScriptPlot {
    name: string;
    type: "line" | "histogram";
    data: { time: string | number; value: number; color?: string }[];
    color?: string;
}

export interface ScriptResult {
    signals: ScriptSignal[];
    plots: ScriptPlot[];
    shapes?: ScriptShape[];
    bgColors?: ScriptBgColor[];
    logs: string[];
    error?: string;
}

export interface ScriptParameter {
    defval: number;
    title: string;
    min?: number;
    max?: number;
    step?: number;
}

export interface MarketData {
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
    times: (string | number)[];
    fullData: ChartDataPoint[];
    mtf?: Record<string, {
        opens: number[];
        highs: number[];
        lows: number[];
        closes: number[];
        volumes: number[];
        times: (string | number)[];
    }>;
}

// --- Engine ---

export class ScriptEngine {

    private static prepareData(data: ChartDataPoint[], mtfData: Record<string, ChartDataPoint[]> = {}): MarketData {
        const format = (d: ChartDataPoint[]) => ({
            opens: d.map(x => x.open ?? 0),
            highs: d.map(x => x.high ?? 0),
            lows: d.map(x => x.low ?? 0),
            closes: d.map(x => x.close ?? 0),
            volumes: d.map(x => x.volume ?? 0),
            times: d.map(x => x.time),
        });

        const main = format(data);
        const mtf: Record<string, any> = {};

        for (const [res, points] of Object.entries(mtfData)) {
            mtf[res] = format(points);
        }

        return {
            ...main,
            fullData: data,
            mtf
        };
    }

    // Helper to find input parameters
    // Syntax: input(14, "RSI Length", { min: 5, max: 20 })
    static scanInputs(code: string): ScriptParameter[] {
        const inputs: ScriptParameter[] = [];
        const regex = /input\(\s*(-?[\d\.]+)\s*,\s*["']([^"']+)["'](?:\s*,\s*(\{[\s\S]*?\})\s*)?\)/g;

        let match;
        while ((match = regex.exec(code)) !== null) {
            const defval = parseFloat(match[1]);
            const title = match[2];
            const optionsStr = match[3];

            let min, max, step;

            if (optionsStr) {
                const minMatch = optionsStr.match(/min\s*:\s*([\d\.]+)/);
                if (minMatch) min = parseFloat(minMatch[1]);

                const maxMatch = optionsStr.match(/max\s*:\s*([\d\.]+)/);
                if (maxMatch) max = parseFloat(maxMatch[1]);

                const stepMatch = optionsStr.match(/step\s*:\s*([\d\.]+)/);
                if (stepMatch) step = parseFloat(stepMatch[1]);
            }

            inputs.push({ defval, title, min, max, step });
        }
        return inputs;
    }

    static scanDependencies(code: string): string[] {
        const resolutions = new Set<string>();
        // Match request.security(symbol, "RESOLUTION", ...)
        // We capture the resolution (2nd arg)
        const regex = /request\.security\(\s*[^,]+,\s*["']([^"']+)["']/g;
        let match;
        while ((match = regex.exec(code)) !== null) {
            resolutions.add(match[1]);
        }
        return Array.from(resolutions);
    }

    /**
     * Executes a user script against the provided market data using a Web Worker.
     */
    static async execute(
        scriptCode: string,
        data: ChartDataPoint[],
        mtfData: Record<string, ChartDataPoint[]> = {},
        parameters: Record<string, number> = {}
    ): Promise<ScriptResult> {
        const market = this.prepareData(data, mtfData);

        return new Promise((resolve) => {
            const worker = new Worker('/script-worker.js');
            let isResolved = false;

            const timeoutId = setTimeout(() => {
                if (isResolved) return;
                worker.terminate();
                resolve({
                    signals: [],
                    plots: [],
                    logs: ["Error: Script execution timed out (>5000ms)."],
                    error: "Script execution timed out."
                });
                isResolved = true;
            }, 5000);

            worker.onmessage = (event) => {
                if (isResolved) return;
                clearTimeout(timeoutId);
                const { type, results, error, logs } = event.data;

                if (type === 'success') {
                    resolve(results);
                } else {
                    resolve({
                        signals: [],
                        plots: [],
                        shapes: [],
                        bgColors: [],
                        logs: logs || [`Error: ${error}`],
                        error: error
                    });
                }
                worker.terminate();
                isResolved = true;
            };

            worker.onerror = (err) => {
                if (isResolved) return;
                clearTimeout(timeoutId);
                resolve({
                    signals: [],
                    plots: [],
                    logs: [`Error: Worker Error - ${err.message}`],
                    error: err.message
                });
                worker.terminate();
                isResolved = true;
            };

            // Send data to worker
            worker.postMessage({
                scriptCode,
                parameters,
                contextData: {
                    open: market.opens,
                    high: market.highs,
                    low: market.lows,
                    close: market.closes,
                    volume: market.volumes,
                    times: market.times,
                    mtf: market.mtf
                }
            });
        });
    }
}
