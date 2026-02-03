
import { ScriptEngine } from "./lib/scripting-engine";
import { ChartDataPoint } from "./lib/api";

// Mock Data: 50 points. 
// Price moves UP, then DOWN (crossing SMA).
const generateData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    let price = 100;
    for (let i = 0; i < 50; i++) {
        // Create an uptrend then downtrend
        if (i < 30) price += 2;
        else price -= 2;

        data.push({
            time: i,
            open: price,
            high: price + 1,
            low: price - 1,
            close: price,
            volume: 1000
        });
    }
    return data;
};

const runTest = async () => {
    const data = generateData();
    console.log("Generated " + data.length + " data points.");

    const scriptCode = `
        // Simple SMA Strategy
        const period = 20;
        const sma = SMA.calculate({period, values: close});
        
        // Loop through history to find crossover signals
        for (let i = period; i < close.length; i++) {
            const prevPrice = close[i - 1];
            const prevSMA = sma[i - 1];
            const currPrice = close[i];
            const currSMA = sma[i];
        
            // Crossover Buy (Price goes UP above SMA)
            if (prevPrice <= prevSMA && currPrice > currSMA) {
                log("BUY Cross detected at index " + i);
                signal(i, "BUY", "Cross");
            }

             // Crossover Sell (Price goes DOWN below SMA)
            if (prevPrice >= prevSMA && currPrice < currSMA) {
                log("SELL Cross detected at index " + i);
                signal(i, "SELL", "Cross");
            }
        }
    `;

    console.log("Running Script Engine...");
    const result = await ScriptEngine.execute(scriptCode, data);

    console.log("Script Logs:", result.logs);
    console.log("Signals Generated:", result.signals);

    if (result.signals.length > 0) {
        console.log("SUCCESS: Signals generated.");
    } else {
        console.error("FAILURE: No signals generated.");
    }
};

runTest();
