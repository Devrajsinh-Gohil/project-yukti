import { X } from "lucide-react";

interface ScriptHelpProps {
    onClose: () => void;
}

export function ScriptHelp({ onClose }: ScriptHelpProps) {
    const builtins = [
        {
            category: "Price Data",
            items: [
                { name: "open", desc: "Open price of current bar" },
                { name: "high", desc: "High price of current bar" },
                { name: "low", desc: "Low price of current bar" },
                { name: "close", desc: "Close price of current bar" },
                { name: "volume", desc: "Volume of current bar" },
                { name: "times", desc: "Timestamp of current bar" },
                { name: "bar_index", desc: "Index of current bar" },
                { name: "hl2", desc: "(high + low) / 2" },
                { name: "hlc3", desc: "(high + low + close) / 3" },
                { name: "ohlc4", desc: "(open + high + low + close) / 4" },
            ]
        },
        {
            category: "Functions",
            items: [
                { name: "plot(name, series, color)", desc: "Plot a line on the chart" },
                { name: "signal(index, type, label)", desc: "Trigger BUY/SELL signal (type: 'BUY'|'SELL')" },
                { name: "plotShape(index, style, ...)", desc: "Plot shape (circle, arrowUp, etc)" },
                { name: "bgcolor(index, color)", desc: "Set background color for bar" },
                { name: "log(msg)", desc: "Log to console" },
                { name: "input(defval, title, options)", desc: "Define strategy parameter" },
            ]
        },
        {
            category: "Indicators",
            items: [
                { name: "sma(source, length)", desc: "Simple Moving Average" },
                { name: "ema(source, length)", desc: "Exponential Moving Average" },
                { name: "rsi(source, length)", desc: "Relative Strength Index" },
                { name: "wma(source, length)", desc: "Weighted Moving Average" },
                { name: "atr(length)", desc: "Average True Range" },
                { name: "crossover(a, b)", desc: "True if A crosses over B" },
                { name: "crossunder(a, b)", desc: "True if A crosses under B" },
            ]
        },
        {
            category: "Math/Logic",
            items: [
                { name: "na(x)", desc: "Is NaN/null/undefined" },
                { name: "nz(x, rep)", desc: "Replace NaN with rep (default 0)" },
                { name: "change(x)", desc: "Current - Previous value" },
                { name: "highest(x, len)", desc: "Highest value in length" },
                { name: "lowest(x, len)", desc: "Lowest value in length" },
            ]
        }
    ];

    return (
        <div className="absolute top-12 right-4 w-80 bg-[#161b22] border border-white/10 rounded-lg shadow-xl z-50 flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0d1117] rounded-t-lg">
                <span className="font-semibold text-xs text-white">Script Reference</span>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>
            <div className="overflow-y-auto p-3 flex flex-col gap-4">
                {builtins.map((cat, i) => (
                    <div key={i}>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">{cat.category}</h4>
                        <div className="grid grid-cols-1 gap-1">
                            {cat.items.map((item, j) => (
                                <div key={j} className="flex flex-col gap-0.5 mb-1 group">
                                    <code className="text-xs text-blue-400 font-mono select-all cursor-pointer hover:underline"
                                        onClick={() => navigator.clipboard.writeText(item.name.split('(')[0])}
                                    >
                                        {item.name}
                                    </code>
                                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
