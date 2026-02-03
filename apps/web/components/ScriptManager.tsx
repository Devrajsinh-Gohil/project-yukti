"use client";

import { Plus, Trash2, FileCode, CheckSquare, Square } from "lucide-react";
import { Script } from "@/lib/scripting-engine";

interface ScriptManagerProps {
    scripts: Script[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
}

export function ScriptManager({ scripts, selectedId, onSelect, onCreate, onDelete, onToggle }: ScriptManagerProps) {
    return (
        <div className="flex flex-col h-full bg-[#050505] border-r border-white/10 w-64 min-w-[250px]">
            <div className="p-3 border-b border-white/10 flex items-center justify-between text-white">
                <span className="text-sm font-semibold tracking-wide">My Scripts</span>
                <button
                    onClick={onCreate}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors text-blue-400"
                    title="New Script"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {scripts.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-xs">
                        No scripts created yet.
                        <br />
                        Click + to start.
                    </div>
                )}

                {scripts.map(script => (
                    <div
                        key={script.id}
                        className={`
                            group flex items-center justify-between p-2 rounded cursor-pointer border border-transparent transition-all
                            ${selectedId === script.id ? "bg-[#14181D] border-white/10" : "hover:bg-[#14181D]/50"}
                        `}
                        onClick={() => onSelect(script.id)}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggle(script.id); }}
                                className={`shrink-0 transition-colors ${script.enabled ? "text-green-400" : "text-slate-600 hover:text-slate-400"}`}
                            >
                                {script.enabled ? <CheckSquare size={14} /> : <Square size={14} />}
                            </button>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`text-xs font-medium truncate ${selectedId === script.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                                    {script.name}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this script?")) onDelete(script.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
