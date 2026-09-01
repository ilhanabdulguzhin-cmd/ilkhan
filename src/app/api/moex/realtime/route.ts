import { NextResponse } from "next/server";

// ─── Multi-level caching ────────────────────────────────────────────────────
let cache: { data: RealtimeData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL_MS = 1000; // 1 second cache on server (only for MOEX index)

// Separate long-lived cache for CBR (currencies + key rate)
let cbrCache: { usd: number; eur: number; cny: number; keyRate: number; ts: number } | null = null;
const CBR_CACHE_TTL = 60 * 60 * 1000; // 1 hour — CBR rates don't change every second

interface RealtimeData {
  imoex: { last: number; change: number; changePrc: number; open: number; high: number; low: number };
  stocks: { ticker: string; name: string; price: number; change: number; changePrc: number }[];
  currencies: { usd: number; eur: number; cny: number };
  keyRate: number;
  timestamp: number;
}

const STOCK_META: Record<string, string> = {
  SBER: "Сбер", GAZP: "Газпром", LKOH: "Лукойл", ROSN: "Роснефть",
};

type JsonObject = Record<string, unknown>;

async function fetchWithRetry(url: string, retries = 2, timeoutMs = 4000): Promise<JsonObject> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 4000)));
    }
  }
  throw new Error(`Unable to fetch ${url}`);
}

async function fetchCbrData(): Promise<{ usd: number; eur: number; cny: number; keyRate: number }> {
  // Serve from long-lived cache if fresh
  if (cbrCache && Date.now() - cbrCache.ts < CBR_CACHE_TTL) {
    return { usd: cbrCache.usd, eur: cbrCache.eur, cny: cbrCache.cny, keyRate: cbrCache.keyRate };
  }

  let usd = cbrCache?.usd || 77.75;
  let eur = cbrCache?.eur || 88.65;
  let cny = cbrCache?.cny || 11.46;
  let keyRate = cbrCache?.keyRate || 14.25;

  try {
    const cbrData = await fetchWithRetry("https://www.cbr-xml-daily.ru/daily_json.js", 1, 3000) as { Valute?: Record<string, { Value?: number }> };
    usd = cbrData.Valute?.USD?.Value ?? usd;
    eur = cbrData.Valute?.EUR?.Value ?? eur;
    cny = cbrData.Valute?.CNY?.Value ?? cny;
  } catch {
    // Keep stale CBR values
  }

  try {
    const keyResp = await fetch("https://www.cbr.ru/statistics/", {
      signal: AbortSignal.timeout(3000),
    });
    const html = await keyResp.text();
    const match = html.match(/ключев[^.]*?([0-9]+[,\.][0-9]+)/i);
    if (match) keyRate = parseFloat(match[1].replace(",", "."));
  } catch {
    // Keep stale keyRate
  }

  cbrCache = { usd, eur, cny, keyRate, ts: Date.now() };
  return { usd, eur, cny, keyRate };
}

async function fetchRealtime(): Promise<RealtimeData> {
  // 1. IMOEX — fast fetch
  const imoexData = await fetchWithRetry(
    "https://iss.moex.com/iss/engines/stock/markets/index/securities/IMOEX.json"
  ) as { marketdata: { columns: string[]; data: number[][] } };
  const imoexCols = imoexData.marketdata.columns;
  const imoexRow = imoexData.marketdata.data[0];
  const lastVal = imoexRow[imoexCols.indexOf("LASTVALUE")] ?? 0;
  const imoex = {
    last: lastVal,
    change: imoexRow[imoexCols.indexOf("LASTCHANGE")] ?? 0,
    changePrc: imoexRow[imoexCols.indexOf("LASTCHANGEPRC")] ?? 0,
    open: imoexRow[imoexCols.indexOf("OPENVALUE")] ?? 0,
    high: imoexRow[imoexCols.indexOf("CURRENTVALUE")] ?? lastVal,
    low: imoexRow[imoexCols.indexOf("LOWVALUE")] ?? lastVal,
  };

  // 2. Top stocks — fast fetch
  const stocksData = await fetchWithRetry(
    "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&iss.only=securities,marketdata&securities.columns=SECID,PREVPRICE&marketdata.columns=LCURRENTPRICE,CHANGE,CHANGEPERCENT"
  ) as { securities?: { data: (string | number)[][] }; marketdata?: { data: number[][] } };
  const secRows = stocksData.securities?.data || [];
  const mdRows = stocksData.marketdata?.data || [];
  const stocks: RealtimeData["stocks"] = [];
  const tickers = Object.keys(STOCK_META);
  for (let i = 0; i < secRows.length; i++) {
    const ticker = String(secRows[i][0]);
    if (tickers.includes(ticker)) {
      const md = mdRows[i] || [];
      stocks.push({
        ticker,
        name: STOCK_META[ticker],
        price: md[0] ?? secRows[i][1] ?? 0,
        change: md[1] ?? 0,
        changePrc: md[2] ?? 0,
      });
    }
  }

  // 3. CBR rates + key rate — slow, cached longer (1h)
  const { usd, eur, cny, keyRate } = await fetchCbrData();

  return {
    imoex, stocks, currencies: { usd, eur, cny }, keyRate,
    timestamp: Date.now(),
  };
}

export async function GET() {
  // Serve from cache if < 1s old (avoids hammering MOEX)
  if (cache.data && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  try {
    const data = await fetchRealtime();
    cache = { data, ts: Date.now() };
    return NextResponse.json({ ...data, cached: false });
  } catch (err) {
    // Serve stale cache on error
    if (cache.data) {
      return NextResponse.json({
        ...cache.data,
        cached: true,
        stale: true,
        staleAge: Math.round((Date.now() - cache.ts) / 1000) + "s",
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch market data", details: String(err) },
      { status: 500 }
    );
  }
}
