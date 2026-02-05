
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
        const period = 20;
        const sma = SMA.calculate({period, values: close});
        for (let i = period; i < close.length; i++) {
            if (close[i] < sma[i]) {
                plotShape(i, "", "arrowDown", "belowBar", "red", "small", 0, "Down");
                bgcolor(i, "rgba(255, 0, 0, 0.1)");
            }
        }
    `;

    console.log("Running Script Engine...");
    const result = await ScriptEngine.execute(scriptCode, data);

    console.log("Script Logs:", result.logs);
    console.log("Shapes Generated:", result.shapes);
    console.log("BgColors Generated:", result.bgColors);

    if (result.shapes && result.shapes.length > 0 && result.bgColors && result.bgColors.length > 0) {
        console.log("SUCCESS: Visual Debugging elements generated.");
    } else {
        console.error("FAILURE: No shapes or bgColors generated.");
    }
};

runTest();
