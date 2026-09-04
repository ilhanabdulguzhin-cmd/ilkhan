import { NextResponse } from "next/server";

// Daily cache (24h TTL)
let cache: { data: DailyData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DailyData {
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

async function fetchCbrRates(): Promise<{ usd: number; eur: number; cny: number; date: string }> {
  const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", {
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  return {
    usd: data.Valute?.USD?.Value ?? 0,
    eur: data.Valute?.EUR?.Value ?? 0,
    cny: data.Valute?.CNY?.Value ?? 0,
    date: data.Date || "",
  };
}

async function fetchFromCache(): Promise<DailyData | null> {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }
  return null;
}

async function buildDailyData(cached: DailyData | null): Promise<DailyData> {
  const rates = await fetchCbrRates();

  // Не выдумываем ставки, вклады, ипотеку и новости. Без подтверждённого
  // официального источника поле остаётся пустым, а UI должен показать статус
  // «данные не проверены», а не превращать старый текст в совет.
  const keyRate = 0;
  const topDeposits: DailyData["topDeposits"] = [];
  const bestDepositRate = 0;
  const cashbackOffers: DailyData["cashbackOffers"] = [];
  const newsHeadlines = rates.usd || rates.eur ? [
    { title: `Проверено сегодня: курс ЦБ — $${rates.usd.toFixed(2)} ₽, €${rates.eur.toFixed(2)} ₽`, source: "cbr.ru", url: "https://www.cbr.ru/currency_base/daily/" },
  ] : [];

  return {
    date: new Date().toISOString().split("T")[0],
    keyRate,
    bestDepositRate,
    topDeposits,
    currencyRates: rates,
    cashbackOffers,
    mortgageRate: "",
    inflation: 0,
    newsHeadlines,
    timestamp: Date.now(),
  };
}

export async function GET() {
  // Check cache first
  const cached = await fetchFromCache();
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const data = await buildDailyData(cached);
    cache = { data, ts: Date.now() };
    return NextResponse.json({ ...data, cached: false });
  } catch (err) {
    if (cache.data) {
      return NextResponse.json({ ...cache.data, cached: true, stale: true });
    }
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
