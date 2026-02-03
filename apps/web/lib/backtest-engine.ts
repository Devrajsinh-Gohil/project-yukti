
import { ScriptSignal, MarketData, ChartDataPoint } from "./scripting-engine";

export interface Trade {
    id: string;
    entryTime: string | number;
    exitTime?: string | number;
    side: "LONG" | "SHORT";
    entryPrice: number;
    exitPrice?: number;
    size: number; // Number of units/shares
    pnl?: number;
    pnlPercent?: number;
    status: "OPEN" | "CLOSED";
}

export interface EquityPoint {
    time: string | number;
    value: number;
}

export interface BacktestMetrics {
    totalTrades: number;
    winRate: number; // 0-100
    netProfit: number;
    netProfitPercent: number;
    maxDrawdown: number; // Positive number representing % drop
    profitFactor: number;
    sharpeRatio: number;
    avgTrade: number;
    bestTrade: number;
    worstTrade: number;
}

export interface BacktestResult {
    trades: Trade[];
    metrics: BacktestMetrics;
    equityCurve: EquityPoint[];
    logs: string[];
}

export interface BacktestOptions {
    initialCapital: number;
    commissionPercent?: number; // e.g., 0.1 for 0.1%
    slippagePercent?: number;
}

export class BacktestEngine {

    static run(
        signals: ScriptSignal[],
        data: ChartDataPoint[],
        options: BacktestOptions = { initialCapital: 100000, commissionPercent: 0.05, slippagePercent: 0.05 }
    ): BacktestResult {
        const trades: Trade[] = [];
        let equity = options.initialCapital;
        const equityCurve: EquityPoint[] = [];
        const logs: string[] = [];

        // Sort signals by time just in case
        // Assuming data is sorted, signals should be consistent with data order usually, 
        // but let's be safe if possible. However, signals often come with 'time' as string/number mismatch.
        // For now, assume signals are in chronological order.

        let currentPosition: Trade | null = null;

        // Map data by time for quick lookup if needed, or just iterate.
        // Since signals are sparse, we iterate signals.
        // BUT we need price history for equity curve every bar (mark-to-market).
        // Let's iterate through the full data array to build the equity curve properly.

        const signalsByTime = new Map<string | number, ScriptSignal[]>();
        signals.forEach(s => {
            const list = signalsByTime.get(s.time) || [];
            list.push(s);
            signalsByTime.set(s.time, list);
        });

        equityCurve.push({ time: data[0].time, value: equity });

        for (let i = 0; i < data.length; i++) {
            const bar = data[i];
            const barTime = bar.time;
            const price = bar.close ?? 0; // Use Close price for execution/valuation

            // 1. Process Signals
            const barSignals = signalsByTime.get(barTime);
            if (barSignals && barSignals.length > 0) {
                // Simple logic: If we have a BUY signal and no position -> OPEN LONG
                // If we have a SELL signal and LONG position -> CLOSE LONG
                // (Extend logic for Shorting later if needed, assume Long-Only for MVP or Long/Short switching)

                // Let's implement reversing: Buy -> Long, Sell -> Short (or Close Long)
                // Interpretation of "SELL":
                // If Long: Close Position.
                // If Flat: Open Short? Or just Exit?
                // Let's assume standard strategy: BUY = Enter Long, SELL = Exit Long (or Enter Short?)
                // For simplicity/safety: BUY = Enter Long / Close Short. SELL = Close Long / Enter Short.
                // Let's check the signal.type.

                const sig = barSignals[barSignals.length - 1]; // Take last signal of the bar

                if (sig.type === "BUY") {
                    if (currentPosition?.side === "SHORT") {
                        this.closeTrade(currentPosition, price, barTime, logs, equity, options);
                        equity += currentPosition.pnl!;
                        currentPosition = null;
                    }

                    if (!currentPosition) {
                        // Open LONG
                        const amount = equity; // All in? Or fixed size? Let's do All-in for compounding test
                        const size = amount / price; // Simplify, fractional
                        currentPosition = {
                            id: `trade-${trades.length}`,
                            entryTime: barTime,
                            side: "LONG",
                            entryPrice: price,
                            size: size,
                            status: "OPEN"
                        };
                        logs.push(`[${barTime}] Opened LONG at ${price}`);
                    }
                } else if (sig.type === "SELL") {
                    if (currentPosition?.side === "LONG") {
                        this.closeTrade(currentPosition, price, barTime, logs, equity, options);
                        equity += currentPosition.pnl!;
                        trades.push(currentPosition);
                        currentPosition = null;
                    }

                    // Optional: Open Short? Let's stick to Long/Cash for MVP unless requested.
                    // User said "Quant Grade" so Long/Short is better.
                    // Let's do: SELL also opens SHORT if we aren't Short.

                    if (!currentPosition) {
                        // Open SHORT
                        const amount = equity;
                        const size = amount / price;
                        currentPosition = {
                            id: `trade-${trades.length}`,
                            entryTime: barTime,
                            side: "SHORT",
                            entryPrice: price,
                            size: size,
                            status: "OPEN"
                        };
                        logs.push(`[${barTime}] Opened SHORT at ${price}`);
                    }
                }
            }

            // 2. Mark to Market Equity
            let currentEquity = equity;
            if (currentPosition) {
                const priceDiff = price - currentPosition.entryPrice;
                const unrealizedPnl = currentPosition.side === "LONG"
                    ? priceDiff * currentPosition.size
                    : -priceDiff * currentPosition.size;
                currentEquity += unrealizedPnl;
            }

            equityCurve.push({ time: barTime, value: currentEquity });
        }

        // Force Close at end
        if (currentPosition) {
            const lastBar = data[data.length - 1];
            this.closeTrade(currentPosition, lastBar.close ?? 0, lastBar.time, logs, equity, options);
            equity += currentPosition.pnl!;
            trades.push(currentPosition);
        }

        const metrics = this.calculateMetrics(trades, equityCurve, options.initialCapital);

        return {
            trades: trades.reverse(), // Newest first
            metrics,
            equityCurve,
            logs
        };
    }

    private static closeTrade(trade: Trade, price: number, time: string | number, logs: string[], currentEquity: number, options: BacktestOptions) {
        trade.exitTime = time;
        trade.exitPrice = price;
        trade.status = "CLOSED";

        const priceDiff = price - trade.entryPrice;
        let rawPnl = trade.side === "LONG" ? priceDiff * trade.size : -priceDiff * trade.size;

        // Apply Costs
        // Commission (Round trip? Let's apply on Exit for simplicity or split)
        // size * price * commission
        const entryVal = trade.size * trade.entryPrice;
        const exitVal = trade.size * price;
        const commConfig = (options.commissionPercent || 0) / 100;
        const commission = (entryVal * commConfig) + (exitVal * commConfig);

        trade.pnl = rawPnl - commission;
        trade.pnlPercent = (trade.pnl / currentEquity) * 100;

        logs.push(`[${time}] Closed ${trade.side} at ${price}. PnL: ${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    }

    private static calculateMetrics(trades: Trade[], equityCurve: EquityPoint[], initialCapital: number): BacktestMetrics {
        const totalTrades = trades.length;
        if (totalTrades === 0) {
            return {
                totalTrades: 0, winRate: 0, netProfit: 0, netProfitPercent: 0,
                maxDrawdown: 0, profitFactor: 0, sharpeRatio: 0,
                avgTrade: 0, bestTrade: 0, worstTrade: 0
            };
        }

        const winners = trades.filter(t => (t.pnl || 0) > 0);
        const losers = trades.filter(t => (t.pnl || 0) <= 0);
        const winRate = (winners.length / totalTrades) * 100;

        const totalProfit = winners.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLoss = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0));

        const netProfit = totalProfit - totalLoss;
        const netProfitPercent = (netProfit / initialCapital) * 100;
        const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

        // Max Drawdown
        let peak = -Infinity;
        let maxDd = 0;
        for (const pt of equityCurve) {
            if (pt.value > peak) peak = pt.value;
            const dd = (peak - pt.value) / peak;
            if (dd > maxDd) maxDd = dd;
        }

        // Sharpe Ratio (Simplified Daily Returns approximation)
        // Calculate daily returns from equity curve
        const returns = [];
        for (let i = 1; i < equityCurve.length; i++) {
            const prev = equityCurve[i - 1].value;
            const curr = equityCurve[i].value;
            returns.push((curr - prev) / prev);
        }

        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        // Annualize usually * sqrt(252). Assuming data is daily? 
        // If minutes, this is tricky. Let's just output period Sharpe for now.
        // Or assume generic "Sharpe" = Mean / StdDev
        const sharpeRatio = stdDev === 0 ? 0 : meanReturn / stdDev;

        const bestTrade = Math.max(...trades.map(t => t.pnlPercent || 0));
        const worstTrade = Math.min(...trades.map(t => t.pnlPercent || 0));
        const avgTrade = trades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / totalTrades;

        return {
            totalTrades,
            winRate,
            netProfit,
            netProfitPercent,
            maxDrawdown: maxDd * 100, // %
            profitFactor,
            sharpeRatio,
            avgTrade,
            bestTrade,
            worstTrade
        };
    }
}
