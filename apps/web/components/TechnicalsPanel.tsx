import { useMemo, useState } from "react";
import { ChartDataPoint } from "@/lib/api";
import { getTechnicalSummary, TechnicalSummary } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface TechnicalsPanelProps {
    data: ChartDataPoint[];
}

export function TechnicalsPanel({ data }: TechnicalsPanelProps) {
    const summary = useMemo(() => getTechnicalSummary(data), [data]);

    // State for collapsible sections
    const [sections, setSections] = useState({
        summary: true,
        indicators: true,
        sr: true,
        ma: true
    });

    const toggleSection = (key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!summary) return (
        <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground h-full">
            <span className="text-sm">Insufficient data for technical analysis.</span>
            <span className="text-xs mt-1 opacity-50">Need at least 50 candles.</span>
        </div>
    );

    const { summary: s, indicators, movingAverages, pivotPoints } = summary;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            {/* Summary Section */}
            <Section
                title="Summary"
                isOpen={sections.summary}
                onToggle={() => toggleSection('summary')}
            >
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-muted-foreground mb-2">Based on current period data</div>
                    <div className={cn(
                        "text-2xl font-bold mb-4",
                        s.verdict.includes("Buy") ? "text-emerald-500" :
                            s.verdict.includes("Sell") ? "text-red-500" : "text-amber-500"
                    )}>
                        {s.verdict}
                    </div>

                    {/* Gauge Bar */}
                    <div className="flex items-center gap-1 h-2 mb-2 w-full">
                        {Array.from({ length: s.bearish }).map((_, i) => (
                            <div key={`bear-${i}`} className="flex-1 h-full bg-red-500/80 rounded-sm" />
                        ))}
                        {Array.from({ length: s.neutral }).map((_, i) => (
                            <div key={`neu-${i}`} className="flex-1 h-full bg-gray-500/50 rounded-sm" />
                        ))}
                        {Array.from({ length: s.bullish }).map((_, i) => (
                            <div key={`bull-${i}`} className="flex-1 h-full bg-emerald-500/80 rounded-sm" />
                        ))}
                    </div>

                    <div className="flex justify-between text-xs font-medium mt-3">
                        <div className="text-center">
                            <div className="text-red-500">{s.bearish}</div>
                            <div className="text-muted-foreground text-[10px] uppercase">Bearish</div>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-400">{s.neutral}</div>
                            <div className="text-muted-foreground text-[10px] uppercase">Neutral</div>
                        </div>
                        <div className="text-center">
                            <div className="text-emerald-500">{s.bullish}</div>
                            <div className="text-muted-foreground text-[10px] uppercase">Bullish</div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Indicators Section */}
            <Section
                title="Indicators"
                isOpen={sections.indicators}
                onToggle={() => toggleSection('indicators')}
            >
                <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-white/5 text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">Indicator</th>
                                <th className="px-3 py-2 text-right font-medium">Value</th>
                                <th className="px-3 py-2 text-right font-medium">Verdict</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {indicators.map((ind, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-3 py-2 text-gray-300 font-medium">{ind.name}</td>
                                    <td className="px-3 py-2 text-right text-gray-400 font-mono">{ind.value}</td>
                                    <td className={cn("px-3 py-2 text-right font-medium", verdictColor(ind.verdict))}>
                                        {ind.verdict}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* Support and Resistance Section */}
            <Section
                title="Support & Resistance"
                isOpen={sections.sr}
                onToggle={() => toggleSection('sr')}
            >
                <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5 p-3 space-y-2">
                    <SRRow label="R3" value={pivotPoints.r3} />
                    <SRRow label="R2" value={pivotPoints.r2} />
                    <SRRow label="R1" value={pivotPoints.r1} />

                    <div className="relative py-2 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-white/10" /></div>
                        <span className="relative bg-[#0B0E11] px-2 text-[10px] text-gray-400 font-mono border border-white/10 rounded-full">
                            PIVOT {pivotPoints.pivot.toFixed(2)}
                        </span>
                    </div>

                    <SRRow label="S1" value={pivotPoints.s1} />
                    <SRRow label="S2" value={pivotPoints.s2} />
                    <SRRow label="S3" value={pivotPoints.s3} />
                </div>
            </Section>

            {/* Moving Averages Section */}
            <Section
                title="Moving Averages"
                isOpen={sections.ma}
                onToggle={() => toggleSection('ma')}
            >
                <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-white/5 text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">Period</th>
                                <th className="px-3 py-2 text-right font-medium">SMA</th>
                                <th className="px-3 py-2 text-right font-medium">EMA</th>
                                <th className="px-3 py-2 text-right font-medium">WMA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {movingAverages.map((ma, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-3 py-2 text-gray-300 font-medium">{ma.period}D</td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={cn("font-mono", verdictColor(ma.simple.verdict))}>
                                                {ma.simple.value.toFixed(2)}
                                            </span>
                                            {/* <span className="text-[10px] opacity-70 text-gray-500">{ma.simple.verdict}</span> */}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={cn("font-mono", verdictColor(ma.exponential.verdict))}>
                                                {ma.exponential.value.toFixed(2)}
                                            </span>
                                            {/* <span className="text-[10px] opacity-70 text-gray-500">{ma.exponential.verdict}</span> */}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={cn("font-mono", verdictColor(ma.weighted.verdict))}>
                                                {ma.weighted.value.toFixed(2)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
}

// --- Subcomponents ---

function Section({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <button
                onClick={onToggle}
                className="flex items-center justify-between w-full text-sm font-semibold text-gray-200 hover:text-white transition-colors group"
            >
                <span className="flex items-center gap-1.5">
                    {title}
                    <Info className="w-3 h-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

function SRRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">{label}</span>
            <span className="font-mono text-gray-200">{value.toFixed(2)}</span>
        </div>
    );
}

function verdictColor(verdict: string) {
    switch (verdict) {
        case "Bullish": return "text-emerald-500";
        case "Bearish": return "text-red-500";
        default: return "text-amber-500"; // Neutral
    }
}
