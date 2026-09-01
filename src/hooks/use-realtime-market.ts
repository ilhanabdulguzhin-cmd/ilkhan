"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RealtimeMarketData {
  imoex: { last: number; change: number; changePrc: number; open: number; high: number; low: number };
  stocks: { ticker: string; name: string; price: number; change: number; changePrc: number }[];
  currencies: { usd: number; eur: number; cny: number };
  keyRate: number;
  timestamp: number;
  cached: boolean;
  stale?: boolean;
}

export interface DailyFinanceData {
  date: string;
  keyRate: number;
  bestDepositRate: number;
  topDeposits: { bank: string; rate: string; term: string; url: string }[];
  currencyRates: { usd: number; eur: number; cny: number; date: string };
  cashbackOffers: { bank: string; card: string; cashback: string; url: string }[];
  mortgageRate: string;
  inflation: number;
  newsHeadlines: { title: string; source: string; url: string }[];
  timestamp: number;
}

export interface ConnectionStatus {
  market: "connected" | "reconnecting" | "error";
  daily: "loaded" | "loading" | "error";
  rates: "live" | "cached" | "error";
  lastUpdate: number;
}

const DEFAULT_MARKET: RealtimeMarketData = {
  imoex: { last: 2385, change: 0, changePrc: 0, open: 2385, high: 2385, low: 2385 },
  stocks: [],
  currencies: { usd: 77.75, eur: 88.65, cny: 11.46 },
  keyRate: 14.25,
  timestamp: Date.now(),
  cached: false,
};

// ─── Real-time market (polling with auto-reconnect) ─────────────────────────
// Every 1s: IMOEX, top stocks
// Every 1h: CBR currencies, key rate (via server cache)
// Auto-retry with exponential backoff on failure

export function useRealtimeMarket(intervalMs = 1000): RealtimeMarketData {
  const [data, setData] = useState<RealtimeMarketData>(DEFAULT_MARKET);
  const prevRef = useRef<RealtimeMarketData>(DEFAULT_MARKET);
  const failCountRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/moex/realtime", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RealtimeMarketData = await res.json();
      if (mountedRef.current) {
        prevRef.current = json;
        setData(json);
        failCountRef.current = 0;
      }
    } catch {
      if (mountedRef.current) {
        // Keep previous data, but increase backoff
        failCountRef.current++;
        setData((prev) => ({ ...prev, stale: true }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const scheduleNext = () => {
      const backoff = failCountRef.current > 0
        ? Math.min(intervalMs * Math.pow(1.5, failCountRef.current - 1), 30000)
        : intervalMs;
      return setTimeout(async () => {
        await fetchData();
        if (mountedRef.current) nextTimeout = scheduleNext();
      }, backoff);
    };

    // Immediate first fetch
    fetchData();
    let nextTimeout = scheduleNext();

    return () => {
      mountedRef.current = false;
      clearTimeout(nextTimeout);
    };
  }, [intervalMs, fetchData]);

  return data;
}

// ─── Daily finance (24h cache on server, auto-refresh) ──────────────────────
// + Background refresh of live currency rates every 5 min

export function useDailyFinance(): {
  data: DailyFinanceData | null;
  loading: boolean;
  liveCurrencies: { usd: number; eur: number; cny: number; date: string } | null;
  status: ConnectionStatus;
} {
  const [state, setState] = useState<{ data: DailyFinanceData | null; loading: boolean }>({
    data: null, loading: true,
  });
  const [liveCurrencies, setLiveCurrencies] = useState<{ usd: number; eur: number; cny: number; date: string } | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    market: "connected", daily: "loading", rates: "cached", lastUpdate: Date.now(),
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // 1. Fetch daily finance data (static, 24h caching)
    (async () => {
      try {
        const res = await fetch("/api/finance/daily", { cache: "no-store" });
        if (res.ok) {
          const json: DailyFinanceData = await res.json();
          setState({ data: json, loading: false });
          if (json.currencyRates) setLiveCurrencies(json.currencyRates);
          setStatus(prev => ({ ...prev, daily: "loaded", lastUpdate: Date.now() }));
        }
      } catch {
        setState(prev => ({ ...prev, loading: false }));
        setStatus(prev => ({ ...prev, daily: "error" }));
      }
    })();

    // 2. Periodically refresh live currency rates (every 5 min)
    const refreshCurrencies = async () => {
      try {
        const res = await fetch("/api/finance/live-rates", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setLiveCurrencies({ usd: json.usd, eur: json.eur, cny: json.cny, date: json.date });
          setStatus(prev => ({ ...prev, rates: "live", lastUpdate: Date.now() }));
        }
      } catch {
        setStatus(prev => ({ ...prev, rates: "cached" }));
      }
    };

    // Refresh currencies 5s after page load, then every 5 minutes
    const initialTimer = setTimeout(refreshCurrencies, 5000);
    const interval = setInterval(refreshCurrencies, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return { ...state, liveCurrencies, status };
}

// ─── Health check hook ──────────────────────────────────────────────────────
// Periodically checks /api/health to ensure system is alive

export function useSystemHealth() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [uptime, setUptime] = useState<string>("");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setHealthy(true);
          setUptime(json.uptime);
        } else throw new Error();
      } catch {
        setHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  return { healthy, uptime };
}