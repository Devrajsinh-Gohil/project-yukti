import {
    MousePointer2,
    Minus,
    TrendingUp,
    Type,
    Crosshair,
    Palette,
    Smile,
    Ruler,
    Unlock,
    Trash2,
    PenTool,
    Square,
    Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DrawingToolbar({ activeTool, onToolSelect }: { activeTool: string; onToolSelect: (t: string) => void }) {
    const tools = [
        { id: "cursor", icon: MousePointer2, label: "Cursor" },
        { id: "crosshair", icon: Crosshair, label: "Crosshair" },
        { separator: true },
        { id: "trendline", icon: TrendingUp, label: "Trend Line" },
        { id: "fib", icon: PenTool, label: "Fib Retracement" },
        { id: "rect", icon: Square, label: "Rectangle" },
        { id: "circle", icon: Circle, label: "Circle" },
        { id: "brush", icon: Palette, label: "Brush" },
        { id: "text", icon: Type, label: "Text" },
        { separator: true },
        { id: "measure", icon: Ruler, label: "Measure" },
        { id: "delete", icon: Trash2, label: "Remove Drawings" },
    ];

    return (
        <div className="w-12 border-r border-white/5 bg-[#0B0E11] flex flex-col items-center py-4 gap-1 z-20">
            {tools.map((t, i) => (
                t.separator ? (
                    <div key={i} className="w-6 h-px bg-white/10 my-1" />
                ) : (
                    <button
                        key={i}
                        onClick={() => t.id && onToolSelect(t.id)}
                        className={cn(
                            "w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 text-muted-foreground hover:text-white transition-colors",
                            activeTool === t.id ? "text-primary bg-primary/10" : ""
                        )}
                        title={t.label}
                    >
                        {t.icon && <t.icon className="w-4 h-4" />}
                    </button>
                )
            ))}
        </div>
    );
}
