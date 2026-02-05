"use client";

import { useState, useEffect } from "react";
import { Play, Save, AlertCircle, TerminalSquare, TrendingUp, Settings, HelpCircle, FileCode } from "lucide-react";
import { ScriptHelp } from "./ScriptHelp";
import { Script } from "@/lib/scripting-engine";
import { BacktestResult } from "@/lib/backtest-engine";
import { BacktestPanel } from "./BacktestPanel";
import { OptimizerPanel } from "./OptimizerPanel";
import { ChartDataPoint } from "@/lib/api";
import Editor from "@monaco-editor/react";

interface ScriptEditorProps {
    script: Script;
    onSave: (script: Script) => void;
    onRun: (code: string) => void;
    onBacktest: (code: string) => void;
    logs: string[];
    error?: string;
    isRunning?: boolean;
    backtestResult?: BacktestResult | null;
    chartData?: ChartDataPoint[];
}

export function ScriptEditor({ script, onSave, onRun, onBacktest, logs, error, isRunning, backtestResult, chartData = [] }: ScriptEditorProps) {
    const [name, setName] = useState(script.name);
    const [code, setCode] = useState(script.code);
    const [isDirty, setIsDirty] = useState(false);
    const [showBacktest, setShowBacktest] = useState(false);
    const [showOptimizer, setShowOptimizer] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        setName(script.name);
        setCode(script.code);
        setIsDirty(false);
        setShowBacktest(false);
        setShowOptimizer(false);
        setShowHelp(false);
    }, [script.id]); // Reset when checking a different script

    // Auto-show backtest when result arrives
    useEffect(() => {
        if (backtestResult) {
            setShowBacktest(true);
            setShowOptimizer(false); // Hide optimizer if backtest result comes in
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

    const handleApplyParams = (params: Record<string, number>) => {
        let newCode = code;
        // Utility to escape regex characters in title
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        Object.entries(params).forEach(([title, val]) => {
            // Regex to find input with this title, handling quotes and optional whitespace
            // Group 1: input prefix e.g. "input("
            // Group 2: The number value e.g. "14" or "-5"
            // Group 3: Comma and whitespace e.g. ", "
            // Group 4: Open Quote e.g. '"'
            // Group 5: The Title (escaped)
            // \4: Matches the same quote character as Group 4
            const regex = new RegExp(`(input\\s*\\(\\s*)(-?[\\d\\.]+)(\\s*,\\s*)(["'])(${escapeRegExp(title)})\\4`, 'g');

            newCode = newCode.replace(regex, `$1${val}$3$4$5$4`);
        });
        setCode(newCode);
        setIsDirty(true);
    };

    if (showBacktest && backtestResult) {
        return <BacktestPanel result={backtestResult} onClose={() => setShowBacktest(false)} />;
    }

    if (showOptimizer) {
        return (
            <div className="flex flex-col h-full bg-[#0B0E11] border-l border-white/10">
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#14181D]">
                    <span className="text-xs font-semibold text-white flex items-center gap-2">
                        <Settings size={14} /> Strategy Optimizer
                    </span>
                    <button
                        onClick={() => setShowOptimizer(false)}
                        className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <OptimizerPanel
                        scriptCode={code}
                        chartData={chartData}
                        onApplyParams={(p) => { handleApplyParams(p); setShowOptimizer(false); }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0B0E11] border-l border-white/10 text-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#14181D]">
                <div className="flex items-center gap-2 flex-1 max-w-[200px] border-r border-white/5 pr-4 mr-4">
                    <TerminalSquare size={16} className="text-blue-500" />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                        className="bg-transparent border-none outline-none text-sm font-medium text-white placeholder-slate-500 w-full"
                        placeholder="Script Name"
                    />
                </div>

                <div className="flex items-center justify-between flex-1">
                    {/* Editor Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDirty ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white/5 text-slate-500"}`}
                            title="Save Script (Cmd+S)"
                        >
                            <Save size={14} /> Save
                        </button>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${showHelp ? "bg-white/10 text-blue-400" : "bg-white/5 text-slate-500 hover:bg-white/10"}`}
                            title="Script Reference"
                        >
                            <HelpCircle size={14} /> Ref
                        </button>
                    </div>

                    {/* Execution Actions */}
                    <div className="flex items-center gap-1 border-l border-white/5 pl-4">
                        <button
                            onClick={() => { setShowOptimizer(!showOptimizer); setShowBacktest(false); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${showOptimizer ? "bg-purple-600/20 text-purple-400" : "bg-white/5 text-slate-500 hover:bg-white/10"}`}
                            title="Optimize Strategy"
                        >
                            <Settings size={14} /> Optimize
                        </button>
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
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative group overflow-hidden">
                {showHelp && <ScriptHelp onClose={() => setShowHelp(false)} />}
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    value={code}
                    theme="vs-dark"
                    onChange={(value) => {
                        if (value !== undefined) {
                            setCode(value);
                            setIsDirty(true);
                        }
                    }}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        fontFamily: "'JetBrains Mono', monospace",
                        renderLineHighlight: 'all',
                    }}
                    onMount={(editor, monaco) => {
                        // Add Keybinding for Run (Cmd+Enter)
                        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                            handleRun();
                        });
                        // Add Keybinding for Save (Cmd+S)
                        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                            handleSave();
                        });
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

