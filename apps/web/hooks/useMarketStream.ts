import { useEffect, useState, useRef } from "react";
import { StreamTrade } from "@/lib/api";

export function useMarketStream(active: boolean = true) {
    const [lastTrade, setLastTrade] = useState<StreamTrade | null>(null);
    const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");

    const lastUpdateRef = useRef<number>(0);

    useEffect(() => {
        if (!active) return;

        // Prevent unnecessary state updates if already connecting/connected
        setStatus(prev => {
            if (prev === "connecting" || prev === "connected") return prev;
            return "connecting";
        });

        // Connect to Python Engine SSE
        const eventSource = new EventSource("http://localhost:8000/api/v1/stream");

        eventSource.onopen = () => {
            console.log("✅ SSE Connected");
            setStatus("connected");
        };

        eventSource.onmessage = (event) => {
            try {
                const now = Date.now();
                // Throttle updates to max 10 per second (100ms) to prevent render floods
                if (now - lastUpdateRef.current < 100) {
                    return;
                }
                lastUpdateRef.current = now;

                const data = JSON.parse(event.data);

                // Validate data structure
                if (!data || typeof data.price !== 'number' || !data.symbol) {
                    // console.warn("Invalid stream data", data);
                    return;
                }

                setLastTrade(data);
            } catch (err) {
                console.error("Failed to parse SSE message", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Error", err);
            setStatus("disconnected");
            eventSource.close();
        };

        return () => {
            console.log("Closing SSE");
            eventSource.close();
        };

    }, [active]);

    return { lastTrade, status };
}
