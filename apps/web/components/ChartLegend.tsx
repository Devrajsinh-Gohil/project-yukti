import { X, Eye, EyeOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { IndicatorConfig } from "@/lib/indicators";

interface ChartLegendProps {
    ticker: string;
    indicators: IndicatorConfig[];
    onRemoveIndicator: (id: string) => void;
    onEditIndicator?: (config: IndicatorConfig) => void;
}

export function ChartLegend({ ticker, indicators, onRemoveIndicator, onEditIndicator }: ChartLegendProps) {
    return (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
            {/* Ticker Info */}
            <div className="flex items-baseline gap-2 pointer-events-auto">
                <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">{ticker}</h2>
                <span className="text-xs text-muted-foreground font-mono">15m</span>
                <span className="text-xs text-success font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Live
                </span>
            </div>

            {/* Indicators List */}
            <div className="flex flex-col items-start gap-1 mt-2">
                {indicators.map(ind => (
                    <div key={ind.id} className="flex items-center gap-2 px-2 py-1 bg-black/40 backdrop-blur-sm border border-white/5 rounded-md pointer-events-auto hover:bg-black/60 transition-colors group">
                        <span className="text-[10px] font-medium text-primary/80 font-mono">
                            {ind.type} {Object.values(ind.params).join(', ')}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEditIndicator && onEditIndicator(ind)}
                                className="p-0.5 hover:text-white text-muted-foreground"
                                title="Settings"
                            >
                                <Settings className="w-3 h-3" />
                            </button>
                            <button className="p-0.5 hover:text-white text-muted-foreground" title="Hide">
                                <Eye className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => onRemoveIndicator(ind.id)}
                                className="p-0.5 hover:text-red-500 text-muted-foreground"
                                title="Remove"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
