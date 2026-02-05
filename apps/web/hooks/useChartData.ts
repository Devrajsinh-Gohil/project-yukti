import { useState, useEffect } from "react";
import { fetchChartData, ChartDataPoint, StreamTrade } from "@/lib/api";

export const AP_INTERVALS = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '1D', value: '1d' },
    { label: '1W', value: '1wk' },
    { label: '1M', value: '1mo' },
];

export const RANGE_CONFIG: Record<string, { valid: string[], default: string }> = {
    '1D': { valid: ['1m', '2m', '5m', '15m', '30m', '1h'], default: '5m' },
    '5D': { valid: ['5m', '15m', '30m', '1h'], default: '15m' },
    '1M': { valid: ['15m', '30m', '1h', '1d'], default: '1h' },
    '3M': { valid: ['1h', '1d', '1wk'], default: '1d' },
    '6M': { valid: ['1h', '1d', '1wk'], default: '1d' },
    'YTD': { valid: ['1d', '1wk', '1mo'], default: '1d' },
    '1Y': { valid: ['1d', '1wk', '1mo'], default: '1d' },
    '5Y': { valid: ['1wk', '1mo'], default: '1wk' },
    'ALL': { valid: ['1mo', '3mo'], default: '1mo' }
};

interface UseChartDataProps {
    ticker: string;
    interval: string;
    range: string;
    lastTrade: StreamTrade | null;
}

export function useChartData({ ticker, interval, range, lastTrade }: UseChartDataProps) {
    const [data, setData] = useState<ChartDataPoint[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [liveCandle, setLiveCandle] = useState<ChartDataPoint | undefined>(undefined);

    // Initial Data Load
    useEffect(() => {
        const controller = new AbortController();
        const loadData = async () => {
            // Reset state when params change
            setLoading(true);
            setLiveCandle(undefined);
            setData(null);

            try {
                const fetchedData = await fetchChartData(ticker, range, interval, controller.signal);
                if (!controller.signal.aborted) {
                    setData(fetchedData);
                    setLoading(false);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Failed to load chart data", err);
                    if (!controller.signal.aborted) setLoading(false);
                }
            }
        };
        loadData();
        return () => { controller.abort(); };
    }, [ticker, range, interval]);

    // Live Data Aggregation
    useEffect(() => {
        if (!lastTrade || !data || data.length === 0) return;

        // Normalization: BTC-USD (Page) vs BTCUSDT (Stream)
        const pageSymbol = ticker.replace("-", "").replace("USD", "").toUpperCase();
        const streamSymbol = lastTrade.symbol.toUpperCase();

        if (streamSymbol.startsWith(pageSymbol)) {
            const lastCandle = data[data.length - 1];
            const tradeTime = lastTrade.timestamp ? new Date(lastTrade.timestamp).getTime() : Date.now();

            const getIntervalSeconds = (int: string) => {
                if (int.endsWith('m') && !int.endsWith('mo')) return parseInt(int) * 60;
                if (int.endsWith('h')) return parseInt(int) * 3600;
                if (int.endsWith('d')) return parseInt(int) * 86400;
                if (int.endsWith('wk')) return parseInt(int) * 86400 * 7;
                if (int.endsWith('mo')) return parseInt(int) * 86400 * 30;
                return 60; // Default 1m
            };

            const intervalSec = getIntervalSeconds(interval);
            const lastCandleTime = typeof lastCandle.time === 'string'
                ? new Date(lastCandle.time).getTime() / 1000
                : lastCandle.time;

            const tradeTimeSec = Math.floor(tradeTime / 1000);

            // Check if trade belongs to a NEW candle (next interval)
            const isNewCandle = (tradeTimeSec - (lastCandleTime as number)) >= intervalSec;

            if (isNewCandle) {
                // Finalize PREVIOUS candle
                if (liveCandle) {
                    // Note: We mutate state here slightly differently. 
                    // Usually we append to data.
                    // But in this hook, we return `data` + `liveCandle`.
                    // Actually, if a candle closes, it should move from liveCandle to data.
                    setData(prev => prev ? [...prev, liveCandle] : [liveCandle]);
                }

                // Create NEW candle
                const newCandle: ChartDataPoint = {
                    time: (lastCandleTime as number) + intervalSec,
                    open: lastTrade.price,
                    high: lastTrade.price,
                    low: lastTrade.price,
                    close: lastTrade.price,
                    volume: lastTrade.size
                };
                setLiveCandle(newCandle);
            } else {
                // Update CURRENT candle
                // Use liveCandle as base if exists, else lastCandle
                // Wait, if !liveCandle, does it mean we are updating the HISTORICAL last candle?
                // Usually `fetchChartData` returns CLOSED candles minus the simplified last one.
                // The stream fills the gap.

                const baseLow = liveCandle ? liveCandle.low : lastCandle.low;
                const baseHigh = liveCandle ? liveCandle.high : lastCandle.high;
                const baseOpen = liveCandle ? liveCandle.open : lastCandle.open;
                const currentVol = liveCandle ? (liveCandle.volume || 0) : (lastCandle.volume || 0);

                const updated: ChartDataPoint = {
                    time: liveCandle ? liveCandle.time : lastCandle.time, // Use live time or last candle time
                    open: baseOpen,
                    close: lastTrade.price,
                    high: Math.max(baseHigh, lastTrade.price),
                    low: Math.min(baseLow, lastTrade.price),
                    volume: currentVol + lastTrade.size
                };
                setLiveCandle(updated);
            }
        }
    }, [lastTrade, ticker, interval]);

    return { data, loading, liveCandle };
}
