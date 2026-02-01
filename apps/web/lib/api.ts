import { SignalData } from "@/components/SignalCard";

const API_BASE_URL = "http://localhost:8000/api/v1";

export async function fetchSignals(market: "IN" | "US" = "IN"): Promise<SignalData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/signals?market=${market}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        return data.signals;
    } catch (error) {
        console.error("Failed to fetch signals:", error);
        // Return empty array or throw based on preference. 
        // For now returning empty to avoid breaking UI on connection error
        return [];
    }
}

export interface ChartDataPoint {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export async function fetchChartData(ticker: string, range: string = "1mo"): Promise<ChartDataPoint[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/chart/${ticker}?range=${range}`);
        if (!response.ok) {
            console.warn(`Chart API error: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error("Failed to fetch chart:", error);
        return [];
    }
}


export interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
    if (!query) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
}
export interface NewsItem {
    id: string;
    title: string;
    source: string;
    published_at: string;
    url: string;
    sentiment: "positive" | "negative" | "neutral";
    tickers: string[];
}

export async function fetchNews(ticker: string): Promise<NewsItem[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/news/${ticker}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.news;
    } catch (error) {
        console.error("Failed to fetch news:", error);
        return [];
    }
}
