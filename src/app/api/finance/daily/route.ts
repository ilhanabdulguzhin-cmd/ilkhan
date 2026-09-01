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

  // Key rate — fetch from CBR
  let keyRate = 14.25;
  try {
    const resp = await fetch("https://www.cbr.ru/statistics/", {
      signal: AbortSignal.timeout(5000),
    });
    const html = await resp.text();
    const match = html.match(/ключев[^.]*?([0-9]+[,\.][0-9]+)/i);
    if (match) keyRate = parseFloat(match[1].replace(",", "."));
  } catch {}

  // Best deposit rates (static for now - banki.ru is hard to parse server-side)
  // In production these would be scraped from banki.ru / finuslugi.ru
  const topDeposits = [
    { bank: "Т-Банк", rate: "16%", term: "3 мес", url: "https://www.tbank.ru/deposit/" },
    { bank: "Газпромбанк", rate: "15,5%", term: "6 мес", url: "https://www.gazprombank.ru/personal/deposits/" },
    { bank: "МКБ", rate: "15,5%", term: "3 мес", url: "https://mkb.ru/deposits" },
    { bank: "ВТБ", rate: "15%", term: "6 мес", url: "https://www.vtb.ru/personal/vklady/" },
    { bank: "Сбер", rate: "14,8%", term: "6 мес", url: "https://www.sberbank.ru/person/contributions/" },
  ];
  const bestDepositRate = Math.max(...topDeposits.map(d => parseFloat(d.rate.replace(",", "."))));

  const cashbackOffers = [
    { bank: "Т-Банк", card: "T-Bank Black", cashback: "до 30%", url: "https://www.tbank.ru/cards/" },
    { bank: "Альфа-Банк", card: "Alfa CashBack", cashback: "10% АЗС, 5% кафе", url: "https://alfabank.ru/everyday/cards/cashback/" },
    { bank: "Газпромбанк", card: "Умная карта", cashback: "5% категория", url: "https://www.gazprombank.ru/personal/cards/debetovye/" },
    { bank: "Ozon", card: "Ozon Карта", cashback: "7% Ozon, 3% супермаркеты", url: "https://www.ozon.ru/bank/" },
    { bank: "Яндекс Пэй", card: "Яндекс Пэй", cashback: "5% у партнёров", url: "https://pay.yandex.ru/" },
  ];

  const newsHeadlines = [
    { title: `Ключевая ставка ЦБ ${keyRate}% — след. заседание 25 июля`, source: "cbr.ru", url: "https://www.cbr.ru/dkp/" },
    { title: `Лучшие вклады: до ${bestDepositRate}% на 3-6 мес`, source: "banki.ru", url: "https://www.banki.ru/products/deposits/" },
    { title: "Семейная ипотека 6%: расширена на вторичку", source: "domrfbank.ru", url: "https://domrfbank.ru/mortgage/" },
    { title: "Новая схема мошенников: «Центр мониторинга ЦБ»", source: "cbr.ru", url: "https://www.cbr.ru/security/" },
    { title: `Курс ЦБ: $${rates.usd} ₽, €${rates.eur} ₽`, source: "cbr.ru", url: "https://cbr.ru/currency_base/daily/" },
  ];

  return {
    date: new Date().toISOString().split("T")[0],
    keyRate,
    bestDepositRate,
    topDeposits,
    currencyRates: rates,
    cashbackOffers,
    mortgageRate: "6% (семейная) / 17% (рыночная)",
    inflation: 6.8,
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