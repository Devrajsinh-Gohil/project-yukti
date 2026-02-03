"use client";

import { useState, useEffect } from "react";
import { Play, Save, AlertCircle, TerminalSquare, TrendingUp } from "lucide-react";
import { Script } from "@/lib/scripting-engine";
import { BacktestResult } from "@/lib/backtest-engine";
import { BacktestPanel } from "./BacktestPanel";

interface ScriptEditorProps {
    script: Script;
    onSave: (script: Script) => void;
    onRun: (code: string) => void;
    onBacktest: (code: string) => void;
    logs: string[];
    error?: string;
    isRunning?: boolean;
    backtestResult?: BacktestResult | null;
}

export function ScriptEditor({ script, onSave, onRun, onBacktest, logs, error, isRunning, backtestResult }: ScriptEditorProps) {
    const [name, setName] = useState(script.name);
    const [code, setCode] = useState(script.code);
    const [isDirty, setIsDirty] = useState(false);
    const [showBacktest, setShowBacktest] = useState(false);

    useEffect(() => {
        setName(script.name);
        setCode(script.code);
        setIsDirty(false);
        setShowBacktest(false);
    }, [script.id]); // Reset when checking a different script

    // Auto-show backtest when result arrives
    useEffect(() => {
        if (backtestResult) {
            setShowBacktest(true);
        }
    }, [backtestResult]);

    const handleSave = () => {
        onSave({ ...script, name, code });
        setIsDirty(false);
    };

    const handleRun = () => {
        onRun(code);
    };

    const handleBacktest = () => {
        onBacktest(code);
    };

    if (showBacktest && backtestResult) {
        return <BacktestPanel result={backtestResult} onClose={() => setShowBacktest(false)} />;
    }

    return (
        <div className="flex flex-col h-full bg-[#0B0E11] border-l border-white/10 text-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#14181D]">
                <div className="flex items-center gap-2 flex-1">
                    <TerminalSquare size={16} className="text-blue-500" />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                        className="bg-transparent border-none outline-none text-sm font-medium text-white placeholder-slate-500 w-full"
                        placeholder="Script Name"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBacktest}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded transition-colors"
                        title="Run Backtest"
                    >
                        <TrendingUp size={14} /> Backtest
                    </button>
                    <button
                        onClick={handleRun}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded transition-colors"
                        title="Run Script (Cmd+Enter)"
                    >
                        <Play size={14} /> Run
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDirty ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white/5 text-slate-500"}`}
                    >
                        <Save size={14} /> Save
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative group">
                <textarea
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setIsDirty(true); }}
                    className="w-full h-full bg-[#0B0E11] text-xs font-mono p-4 text-slate-300 resize-none outline-none leading-relaxed selection:bg-blue-500/30"
                    spellCheck="false"
                    placeholder="// Write your strategy here...
// Available variables: open, high, low, close, volume (arrays)
// Available functions: SMA, RSI, MACD, etc.
// Use: plot('My Line', dataArray)
// Use: signal(index, 'BUY')"
                    onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            handleRun();
                        }
                    }}
                />
            </div>

            {/* Console / Output */}
            <div className="h-48 border-t border-white/10 flex flex-col bg-[#050505]">
                <div className="px-3 py-1 bg-[#14181D] border-b border-white/10 text-[10px] font-mono text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>Console Output</span>
                    {isRunning && <span className="text-yellow-400 flex items-center gap-1 animate-pulse">Running...</span>}
                    {error && <span className="text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Runtime Error</span>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1">
                    {error && (
                        <div className="text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                            {error}
                        </div>
                    )}
                    {logs.length === 0 && !error && (
                        <div className="text-slate-600 italic">No output...</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="text-slate-400 border-b border-white/5 pb-0.5 last:border-0 hover:text-slate-200">
                            <span className="text-slate-600 select-none mr-2">[{i + 1}]</span>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
