"use client";

import { ReactNode, useState, useCallback, useRef } from "react";
import { Panel as ResizablePanel, Group as ResizablePanelGroup, Separator as ResizableHandle } from "react-resizable-panels";
import { MouseEventParams } from "lightweight-charts";
import { cn } from "@/lib/utils";

export type ChartLayoutType = 'single' | 'vertical' | 'horizontal' | 'quad';

interface ChartGridProps {
    layout: ChartLayoutType;
    charts: string[]; // IDs of charts to render
    activeChartId: string | null;
    onActivateChart: (id: string) => void;
    renderChart: (id: string, syncProps: SyncProps) => ReactNode;
}

export interface SyncProps {
    onCrosshairMove: (param: MouseEventParams) => void;
    syncCrosshair: { x: number | null, y: number | null, time: number | null };
}

export function ChartGrid({
    layout,
    charts,
    activeChartId,
    onActivateChart,
    renderChart
}: ChartGridProps) {
    const [syncState, setSyncState] = useState<{ x: number | null, y: number | null, time: number | null, sourceId: string | null }>({
        x: null, y: null, time: null, sourceId: null
    });

    const handleCrosshairMove = useCallback((id: string, param: MouseEventParams) => {
        if (!param.time) {
            setSyncState({ x: null, y: null, time: null, sourceId: null });
            return;
        }
        setSyncState({
            x: param.point?.x ?? null,
            y: param.point?.y ?? null,
            time: param.time as number,
            sourceId: id
        });
    }, []);

    const getSyncProps = (id: string): SyncProps => ({
        onCrosshairMove: (p) => handleCrosshairMove(id, p),
        syncCrosshair: (syncState.sourceId && syncState.sourceId !== id) ? syncState : { x: null, y: null, time: null }
    });

    const renderPanel = (index: number) => {
        const id = charts[index];
        if (!id) return <div className="w-full h-full bg-[#050505]" />;

        return (
            <div
                className={cn(
                    "w-full h-full relative border transition-colors duration-200",
                    activeChartId === id ? "border-primary/50" : "border-transparent"
                )}
                onClick={() => onActivateChart(id)}
            >
                {renderChart(id, getSyncProps(id))}
            </div>
        );
    };

    if (layout === 'single') {
        return (
            <div className="w-full h-full">
                {renderPanel(0)}
            </div>
        );
    }

    if (layout === 'vertical') {
        // 2 charts vertical split (Left/Right)
        return (
            <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize={50} minSize={10}>
                    {renderPanel(0)}
                </ResizablePanel>
                <ResizableHandle className="w-1 bg-white/5 hover:bg-primary/50 transition-colors" />
                <ResizablePanel defaultSize={50} minSize={10}>
                    {renderPanel(1)}
                </ResizablePanel>
            </ResizablePanelGroup>
        );
    }

    if (layout === 'horizontal') {
        // 2 charts horizontal split (Top/Bottom)
        return (
            <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize={50} minSize={10}>
                    {renderPanel(0)}
                </ResizablePanel>
                <ResizableHandle className="h-1 bg-white/5 hover:bg-primary/50 transition-colors" />
                <ResizablePanel defaultSize={50} minSize={10}>
                    {renderPanel(1)}
                </ResizablePanel>
            </ResizablePanelGroup>
        );
    }

    if (layout === 'quad') {
        return (
            <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize={50} minSize={10}>
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize={50} minSize={10}>
                            {renderPanel(0)}
                        </ResizablePanel>
                        <ResizableHandle className="w-1 bg-white/5 hover:bg-primary/50 transition-colors" />
                        <ResizablePanel defaultSize={50} minSize={10}>
                            {renderPanel(1)}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle className="h-1 bg-white/5 hover:bg-primary/50 transition-colors" />
                <ResizablePanel defaultSize={50} minSize={10}>
                    <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel defaultSize={50} minSize={10}>
                            {renderPanel(2)}
                        </ResizablePanel>
                        <ResizableHandle className="w-1 bg-white/5 hover:bg-primary/50 transition-colors" />
                        <ResizablePanel defaultSize={50} minSize={10}>
                            {renderPanel(3)}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        );
    }

    return null;
}
