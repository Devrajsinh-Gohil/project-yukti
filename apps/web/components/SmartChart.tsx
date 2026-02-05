import { useMemo, useEffect } from "react";
import { TechnicalChart } from "./TechnicalChart";
import { useChartData } from "@/hooks/useChartData";
import { StreamTrade, ChartDataPoint } from "@/lib/api";
import { calculateIndicators, calculateHeikinAshi, IndicatorConfig } from "@/lib/indicators";
import { SyncProps } from "./ChartGrid";
import { Loader2 } from "lucide-react";
import { ScriptResult } from "@/lib/scripting-engine";

interface SmartChartProps {
    id: string;
    ticker: string;
    interval: string;
    range: string;
    mode: "candle" | "area" | "line" | "heikin";
    indicators: IndicatorConfig[];
    lastTrade: StreamTrade | null;
    activeTool: string;
    onDrawingComplete?: () => void;
    scriptResults: ScriptResult[];
    syncProps: SyncProps;
    colors: { backgroundColor: string, textColor: string };
    onDataLoad?: (data: ChartDataPoint[]) => void;
    isActive: boolean;
}

export function SmartChart({
    id,
    ticker,
    interval,
    range,
    mode,
    indicators,
    lastTrade,
    activeTool,
    onDrawingComplete,
    scriptResults,
    syncProps,
    colors,
    onDataLoad,
    isActive
}: SmartChartProps) {
    const { data, loading, liveCandle } = useChartData({ ticker, interval, range, lastTrade });

    useEffect(() => {
        if (data && onDataLoad && isActive) {
            onDataLoad(data);
        }
    }, [data, onDataLoad, isActive]);

    const chartDataToRender = useMemo(() => {
        if (!data) return [];
        if (mode === 'heikin') {
            return calculateHeikinAshi(data);
        }
        return data;
    }, [data, mode]);

    const indicatorsData = useMemo(() => {
        if (!data || indicators.length === 0) return [];
        return calculateIndicators(data, indicators);
    }, [data, indicators]);

    return (
        <div className="w-full h-full relative min-w-0 overflow-hidden">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            <TechnicalChart
                id={id}
                data={chartDataToRender}
                liveDataPoint={liveCandle} // Pass live candle for real-time update
                indicators={indicatorsData}
                activeTool={activeTool}
                mode={mode}
                colors={colors}
                onDrawingComplete={onDrawingComplete}
                scriptResults={scriptResults}
                onCrosshairMove={syncProps.onCrosshairMove}
                syncCrosshair={typeof syncProps.syncCrosshair.time === 'number' ? syncProps.syncCrosshair : undefined}
            />
        </div>
    );
}
