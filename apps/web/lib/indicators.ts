import { SMA, EMA, BollingerBands, RSI, MACD } from "technicalindicators";
import { ChartDataPoint } from "./api";

export interface IndicatorData {
    name: string;
    type: "overlay" | "oscillator";
    data: { time: string | number; value: number }[];
    color: string;
    extraData?: any; // For bands etc
}

export function calculateIndicators(tickerData: ChartDataPoint[], activeIndicators: string[]): IndicatorData[] {
    if (!tickerData || tickerData.length < 10) return [];

    const results: IndicatorData[] = [];
    const closes = tickerData.map(d => d.close);
    // Timestamp handling: standardizing to what chart uses
    // If input time is string/number, we just map it back aligned with closes

    // Helper to map result back to time
    // technicalindicators results usually are shorter than input by period
    const mapToTime = (values: number[], period: number) => {
        return values.map((v, i) => ({
            time: tickerData[i + (tickerData.length - values.length)].time,
            value: v
        }));
    };

    activeIndicators.forEach(ind => {
        if (ind === "SMA") {
            const period = 20;
            const values = SMA.calculate({ period, values: closes });
            results.push({
                name: `SMA (${period})`,
                type: "overlay",
                data: mapToTime(values, period),
                color: "#F59E0B" // Amber
            });
        }
        else if (ind === "EMA") {
            const period = 20;
            const values = EMA.calculate({ period, values: closes });
            results.push({
                name: `EMA (${period})`,
                type: "overlay",
                data: mapToTime(values, period),
                color: "#3B82F6" // Blue
            });
        }
        else if (ind === "BollingerBands") {
            const period = 20;
            const stdDev = 2;
            const output = BollingerBands.calculate({ period, stdDev, values: closes });

            // BB returns object {middle, upper, lower}
            // We need to handle this specially in chart, or return 3 lines
            // For simplicity, let's just return middle for now or flat map?
            // Proper way: TechnicalChart should handle 'bands' type.
            // Let's return 3 separate overlays for simplicity of 'LineSeries'

            results.push({ // Upper
                name: "BB Upper", type: "overlay", color: "rgba(52, 211, 153, 0.5)",
                data: output.map((v, i) => ({ time: tickerData[i + (tickerData.length - output.length)].time, value: v.upper }))
            });
            results.push({ // Lower
                name: "BB Lower", type: "overlay", color: "rgba(52, 211, 153, 0.5)",
                data: output.map((v, i) => ({ time: tickerData[i + (tickerData.length - output.length)].time, value: v.lower }))
            });
        }
        else if (ind === "RSI") {
            const period = 14;
            const values = RSI.calculate({ period, values: closes });
            results.push({
                name: `RSI (${period})`,
                type: "oscillator",
                data: mapToTime(values, period),
                color: "#A855F7" // Purple
            });
        }
    });

    return results;
}
