import {
    SMA, EMA, BollingerBands, RSI, MACD, Stochastic, CCI, ATR, WilliamsR, PSAR,
    ADX, AwesomeOscillator
} from "technicalindicators";
import { ChartDataPoint } from "./api";

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

export interface ScriptPlot {
    name: string;
    type: "line" | "histogram";
    data: { time: string | number; value: number; color?: string }[];
    color?: string;
}

export interface ScriptResult {
    signals: ScriptSignal[];
    plots: ScriptPlot[];
    logs: string[];
    error?: string;
}

export interface MarketData {
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
    times: (string | number)[];
    fullData: ChartDataPoint[];
}

// --- Engine ---

export class ScriptEngine {

    private static prepareData(data: ChartDataPoint[]): MarketData {
        return {
            opens: data.map(d => d.open ?? 0),
            highs: data.map(d => d.high ?? 0),
            lows: data.map(d => d.low ?? 0),
            closes: data.map(d => d.close ?? 0),
            volumes: data.map(d => d.volume ?? 0),
            times: data.map(d => d.time),
            fullData: data,
        };
    }

    /**
     * Executes a user script against the provided market data using a Web Worker.
     * Enforces a timeout to prevent infinite loops.
     */
    static async execute(scriptCode: string, data: ChartDataPoint[]): Promise<ScriptResult> {
        const market = this.prepareData(data);

        return new Promise((resolve) => {
            const worker = new Worker('/script-worker.js');
            let isResolved = false;

            const timeoutId = setTimeout(() => {
                if (isResolved) return;
                worker.terminate();
                resolve({
                    signals: [],
                    plots: [],
                    logs: ["Error: Script execution timed out (>1000ms). Possible infinite loop."],
                    error: "Script execution timed out."
                });
                isResolved = true;
            }, 1000); // 1 Second Timeout

            worker.onmessage = (e) => {
                if (isResolved) return;
                clearTimeout(timeoutId);
                const { type, results, error, logs } = e.data;

                if (type === 'success') {
                    resolve(results);
                } else {
                    resolve({
                        signals: [],
                        plots: [],
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
            // We strip functions/complex objects, just data
            worker.postMessage({
                scriptCode,
                contextData: {
                    open: market.opens,
                    high: market.highs,
                    low: market.lows,
                    close: market.closes,
                    volume: market.volumes,
                    times: market.times
                }
            });
        });
    }
}
