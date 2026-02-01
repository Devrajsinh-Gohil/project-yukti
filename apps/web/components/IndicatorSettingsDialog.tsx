"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IndicatorConfig } from "@/lib/indicators";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IndicatorSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: IndicatorConfig | null;
    onSave: (config: IndicatorConfig) => void;
}

export function IndicatorSettingsDialog({ open, onOpenChange, config, onSave }: IndicatorSettingsDialogProps) {
    const [localConfig, setLocalConfig] = useState<IndicatorConfig | null>(null);

    useEffect(() => {
        if (config) {
            setLocalConfig(JSON.parse(JSON.stringify(config)));
        }
    }, [config]);

    const handleParamChange = (key: string, value: string) => {
        if (!localConfig) return;
        setLocalConfig({
            ...localConfig,
            params: { ...localConfig.params, [key]: Number(value) }
        });
    };

    const handleSave = () => {
        if (localConfig) {
            onSave(localConfig);
            onOpenChange(false);
        }
    };

    return (
        <AnimatePresence>
            {open && localConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => onOpenChange(false)}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full max-w-sm bg-[#0B0E11] border border-white/10 rounded-lg shadow-xl overflow-hidden relative z-10"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                            <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                <Settings className="w-4 h-4 text-primary" />
                                {localConfig.type} Settings
                            </h3>
                            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {Object.entries(localConfig.params).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">{key}</label>
                                    <input
                                        type="number"
                                        value={value}
                                        onChange={(e) => handleParamChange(key, e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none"
                                    />
                                </div>
                            ))}

                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Style</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={localConfig.color || "#3B82F6"}
                                        onChange={(e) => setLocalConfig({ ...localConfig, color: e.target.value })}
                                        className="w-full h-8 bg-black/20 border border-white/10 rounded overflow-hidden cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5 flex items-center justify-end gap-2 bg-white/5">
                            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="bg-transparent hover:bg-white/5">Cancel</Button>
                            <Button size="sm" onClick={handleSave}>Save Changes</Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
