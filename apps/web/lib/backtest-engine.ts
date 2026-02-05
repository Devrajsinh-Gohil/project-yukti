
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
    sharpeRatio: number; // Annualized
    dailySharpe: number;
    annualizedReturn: number;
    avgTrade: number;
    bestTrade: number;
    worstTrade: number;
    buyAndHoldReturn: number;
}

export interface BacktestResult {
    trades: Trade[];
    metrics: BacktestMetrics;
    equityCurve: EquityPoint[];
    logs: string[];
}

export interface BacktestOptions {
    initialCapital: number;
    commissionPercent?: number; // e.g., 0.1 for 0.1% of trade value
    slippagePercent?: number; // e.g., 0.05 for 0.05% price impact
}

export class BacktestEngine {

    static run(
        signals: ScriptSignal[],
        data: ChartDataPoint[],
        options: BacktestOptions = { initialCapital: 100000, commissionPercent: 0.1, slippagePercent: 0.05 }
    ): BacktestResult {
        const trades: Trade[] = [];
        let equity = options.initialCapital;
        let cash = options.initialCapital;
        const equityCurve: EquityPoint[] = [];
        const logs: string[] = [];

        const feeRate = (options.commissionPercent || 0) / 100;
        const slippageRate = (options.slippagePercent || 0) / 100;

        let currentPosition: Trade | null = null;
        let pendingSignal: ScriptSignal | null = null; // Signal generated at Close, to be executed at Next Open

        // Map signals by time for quick lookup
        const signalsByTime = new Map<string | number, ScriptSignal[]>();
        signals.forEach(s => {
            const list = signalsByTime.get(s.time) || [];
            list.push(s);
            signalsByTime.set(s.time, list);
        });

        // Loop through data
        for (let i = 0; i < data.length; i++) {
            const bar = data[i];
            const barTime = bar.time;
            const open = bar.open ?? bar.close ?? 0;
            const close = bar.close ?? 0;

            // 1. Process Pending Signal from Previous Bar (Execute at Open)
            if (pendingSignal) {
                const isBuy = pendingSignal.type === "BUY";
                const isSell = pendingSignal.type === "SELL";

                // Execution Price with Slippage
                // Buy at Ask (Higher), Sell at Bid (Lower)
                // Ask = Open * (1 + slippage)
                // Bid = Open * (1 - slippage)
                const execPrice = isBuy
                    ? open * (1 + slippageRate)
                    : open * (1 - slippageRate);

                if (isBuy) {
                    if (currentPosition?.side === "SHORT") {
                        // Close Short
                        this.closeTrade(currentPosition, execPrice, barTime, logs, equity, feeRate);
                        equity += currentPosition.pnl!;
                        // Return margin/collateral
                        // For SHORT, we acted as if we sold borrowed asset, but in this simplified engine
                        // we deducted cash as collateral. Now we return that collateral + PnL.
                        const collateral = (currentPosition as any).collateral || (currentPosition.entryPrice * currentPosition.size);
                        cash += currentPosition.pnl! + collateral;
                        trades.push(currentPosition);
                        currentPosition = null;
                    }

                    if (!currentPosition) {
                        // Open Long or Flip
                        const maxDeductible = cash * 0.99; // Leave 1% buffer
                        const size = maxDeductible / (execPrice * (1 + feeRate));

                        if (size > 0) {
                            const cost = size * execPrice;
                            const fee = cost * feeRate;
                            cash -= (cost + fee);

                            currentPosition = {
                                id: `trade-${trades.length + 1}`,
                                entryTime: barTime,
                                side: "LONG",
                                entryPrice: execPrice,
                                size: size,
                                status: "OPEN"
                            };
                            logs.push(`[${this.formatTime(barTime)}] Executed LONG at ${execPrice.toFixed(2)} (Signal from prev bar)`);
                        }
                    }
                } else if (isSell) {
                    if (currentPosition?.side === "LONG") {
                        // Close Long
                        this.closeTrade(currentPosition, execPrice, barTime, logs, equity, feeRate);
                        equity += currentPosition.pnl!;
                        cash += (currentPosition.size * execPrice) - (currentPosition.size * execPrice * feeRate); // Return capital
                        trades.push(currentPosition);
                        currentPosition = null;
                    }

                    if (!currentPosition) {
                        // Open SHORT
                        const maxDeductible = cash * 0.99;
                        const size = maxDeductible / (execPrice * (1 + feeRate));

                        if (size > 0) {
                            // Deduct collateral + fee
                            const collateral = size * execPrice;
                            const fee = collateral * feeRate;
                            cash -= (collateral + fee);

                            currentPosition = {
                                id: `trade-${trades.length + 1}`,
                                entryTime: barTime,
                                side: "SHORT",
                                entryPrice: execPrice,
                                size: size,
                                status: "OPEN",
                                collateral: collateral // Stored for exit
                            } as any; // Cast as any to allow collateral prop if interface not updated yet
                            logs.push(`[${this.formatTime(barTime)}] Executed SHORT at ${execPrice.toFixed(2)} (Signal from prev bar)`);
                        }
                    }
                }

                pendingSignal = null; // Signal Consumed
            }

            // 2. Mark to Market (MTM) Validation
            let unrealizedPnl = 0;
            if (currentPosition) {
                // MTM using Close price
                const diff = close - currentPosition.entryPrice;
                unrealizedPnl = currentPosition.side === "LONG"
                    ? diff * currentPosition.size
                    : -diff * currentPosition.size;
            }

            // Re-calculate Equity
            const realizedPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
            const currentTotalEquity = options.initialCapital + realizedPnL + unrealizedPnl;
            equity = currentTotalEquity;

            // Liquidation Check
            if (equity <= 0) {
                equity = 0;
                logs.push(`[${this.formatTime(barTime)}] LIQUIDATION: Equity hit zero. Stopping.`);
                equityCurve.push({ time: barTime, value: 0 });
                if (currentPosition) {
                    this.closeTrade(currentPosition, close, barTime, logs, 0, feeRate);
                    trades.push(currentPosition);
                }
                break;
            }

            equityCurve.push({ time: barTime, value: equity });


            // 3. Check for NEW Signals (Generated at Close)
            const barSignals = signalsByTime.get(barTime);
            if (barSignals && barSignals.length > 0) {
                // Take the last signal of the bar as the definitive one
                const sig = barSignals[barSignals.length - 1];
                pendingSignal = sig;
            }
        }

        // Force Close at end
        if (currentPosition) {
            const lastBar = data[data.length - 1];
            // Close at Close Price (Slippage applied)
            const exitPrice = currentPosition.side === "LONG"
                ? lastBar.close! * (1 - slippageRate)
                : lastBar.close! * (1 + slippageRate);

            this.closeTrade(currentPosition, exitPrice, lastBar.time, logs, equity, feeRate);
            equity += currentPosition.pnl!;

            if (currentPosition.side === "SHORT") {
                const collateral = (currentPosition as any).collateral || (currentPosition.entryPrice * currentPosition.size);
                cash += currentPosition.pnl! + collateral;
            } else {
                // Long Logic
                cash += (currentPosition.size * exitPrice) - (currentPosition.size * exitPrice * feeRate);
            }

            trades.push(currentPosition);
        }

        const metrics = this.calculateMetrics(trades, equityCurve, options.initialCapital, data);

        return {
            trades: trades.reverse(),
            metrics,
            equityCurve,
            logs
        };
    }

    private static closeTrade(
        trade: Trade,
        price: number,
        time: string | number,
        logs: string[],
        currentEquity: number,
        feeRate: number
    ) {
        trade.exitTime = time;
        trade.exitPrice = price;
        trade.status = "CLOSED";

        const priceDiff = price - trade.entryPrice;
        const rawPnl = trade.side === "LONG" ? priceDiff * trade.size : -priceDiff * trade.size;

        const exitVal = trade.size * price;
        const entryVal = trade.size * trade.entryPrice;

        const entryFee = entryVal * feeRate;
        const exitFee = exitVal * feeRate;
        const totalFee = entryFee + exitFee;

        trade.pnl = rawPnl - totalFee;
        trade.pnlPercent = (trade.pnl / entryVal) * 100;

        logs.push(`[${this.formatTime(time)}] Closed ${trade.side} at ${price.toFixed(2)}. Net PnL: ${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    }

    private static calculateMetrics(
        trades: Trade[],
        equityCurve: EquityPoint[],
        initialCapital: number,
        fullData: ChartDataPoint[]
    ): BacktestMetrics {
        const totalTrades = trades.length;
        if (totalTrades === 0) {
            const startPrice = fullData[0]?.close || 1;
            const endPrice = fullData[fullData.length - 1]?.close || 1;
            const bhReturn = ((endPrice - startPrice) / startPrice) * 100;

            return {
                totalTrades: 0, winRate: 0, netProfit: 0, netProfitPercent: 0,
                maxDrawdown: 0, profitFactor: 0, sharpeRatio: 0, dailySharpe: 0,
                annualizedReturn: 0, avgTrade: 0, bestTrade: 0, worstTrade: 0,
                buyAndHoldReturn: bhReturn
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

        // Sharpe Ratio
        let returns = [];
        for (let i = 1; i < equityCurve.length; i++) {
            const prev = equityCurve[i - 1].value;
            const curr = equityCurve[i].value;
            returns.push((curr - prev) / prev);
        }

        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        const startTime = new Date(fullData[0].time).getTime();
        const endTime = new Date(fullData[fullData.length - 1].time).getTime();
        const totalTimeMs = endTime - startTime;
        // Avoid division by zero if single bar or no time diff
        const avgBarTimeMs = totalTimeMs > 0 ? totalTimeMs / fullData.length : Infinity;

        // Ms in year = 31536000000
        const barsPerYear = avgBarTimeMs !== Infinity ? 31536000000 / avgBarTimeMs : 0;

        const dailySharpe = stdDev === 0 ? 0 : meanReturn / stdDev;
        // Check if barsPerYear is valid
        const annualizedSharpe = (barsPerYear > 0) ? dailySharpe * Math.sqrt(barsPerYear) : 0;

        const annualizationFactor = fullData.length > 0 ? barsPerYear / fullData.length : 0;
        const endEq = equityCurve[equityCurve.length - 1].value;

        let annualizedReturn = 0;
        if (endEq > 0 && initialCapital > 0 && annualizationFactor > 0) {
            annualizedReturn = (Math.pow((endEq / initialCapital), annualizationFactor) - 1) * 100;
        }

        // Final safety for Infinity
        if (!isFinite(annualizedReturn)) annualizedReturn = 0;

        const bestTrade = Math.max(...trades.map(t => t.pnlPercent || 0));
        const worstTrade = Math.min(...trades.map(t => t.pnlPercent || 0));
        const avgTrade = trades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / totalTrades;

        const startPrice = fullData[0].open || fullData[0].close || 1;
        const endPrice = fullData[fullData.length - 1].close || 1;
        const buyAndHoldReturn = ((endPrice - startPrice) / startPrice) * 100;

        return {
            totalTrades,
            winRate,
            netProfit,
            netProfitPercent,
            maxDrawdown: maxDd * 100,
            profitFactor,
            sharpeRatio: annualizedSharpe,
            dailySharpe,
            annualizedReturn,
            avgTrade,
            bestTrade,
            worstTrade,
            buyAndHoldReturn
        };
    }

    private static formatTime(t: string | number): string {
        const d = new Date(t);
        return d.toLocaleString();
    }
}
