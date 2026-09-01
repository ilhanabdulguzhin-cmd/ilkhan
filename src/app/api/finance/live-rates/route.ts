import { NextResponse } from "next/server";

let cache: { data: LiveRates | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface LiveRates {
  usd: number;
  eur: number;
  cny: number;
  date: string;
  timestamp: number;
  source: string;
}

export async function GET() {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  try {
    const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const rates: LiveRates = {
      usd: data.Valute?.USD?.Value ?? cache.data?.usd ?? 77.75,
      eur: data.Valute?.EUR?.Value ?? cache.data?.eur ?? 88.65,
      cny: data.Valute?.CNY?.Value ?? cache.data?.cny ?? 11.46,
      date: data.Date || new Date().toISOString(),
      timestamp: Date.now(),
      source: "Банк России / cbr-xml-daily.ru",
    };
    cache = { data: rates, ts: Date.now() };
    return NextResponse.json({ ...rates, cached: false });
  } catch {
    if (cache.data) {
      return NextResponse.json({ ...cache.data, cached: true, stale: true });
    }
    return NextResponse.json(
      { error: "Источник курсов временно недоступен", source: "Банк России / cbr-xml-daily.ru", cached: false },
    );
  }
}
