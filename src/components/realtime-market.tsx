"use client";

import { useRealtimeMarket, useDailyFinance } from "@/hooks/use-realtime-market";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, ExternalLink, BarChart4, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { useEffect, useState } from "react";

// ─── Custom chart tooltip ───────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#E5E5EA] rounded-xl shadow-xl px-3 py-2.5">
      <div className="text-[10px] text-[#8E8E93] mb-1">{label}</div>
      <div className="text-sm font-black text-[#303030]">{Number(v).toFixed(2)}</div>
    </div>
  );
}

// ─── Real-time ticker for hero section ──────────────────────────────────────

export function RealtimeHeroTicker() {
  const market = useRealtimeMarket(1000);

  const items = [
    { label: "IMOEX", value: market.imoex.last.toFixed(0), sub: `${market.imoex.changePrc > 0 ? "+" : ""}${market.imoex.changePrc.toFixed(2)}%`, color: market.imoex.changePrc >= 0 ? "#34C759" : "#FF3B30", link: "https://iss.moex.com/iss/statistics/engines/stock/markets/index/securities/IMOEX.html" },
    { label: "USD", value: `${market.currencies.usd.toFixed(2)} ₽`, sub: "ЦБ РФ", color: "#FF9500", link: "https://cbr.ru/currency_base/daily/" },
    { label: "EUR", value: `${market.currencies.eur.toFixed(2)} ₽`, sub: "ЦБ РФ", color: "#FF9500", link: "https://cbr.ru/currency_base/daily/" },
    { label: "Ставка", value: `${market.keyRate.toFixed(2)}%`, sub: "Ключевая ЦБ", color: "#007AFF", link: "https://www.cbr.ru/dkp/" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((item) => (
        <a key={item.label} href={item.link} target="_blank" rel="noopener noreferrer"
          className="p-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] transition-colors">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-white/50">{item.label}</div>
            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
          </div>
          <div className="text-base sm:text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
          <div className="text-[9px]" style={{ color: item.color }}>{item.sub}</div>
        </a>
      ))}
    </div>
  );
}

// ─── Real-time IMOEX chart (accumulates data points) ────────────────────────
// Продвинутая версия: Interactive Tooltip · Reference Lines · Multi-Gradient

const CHART_WINDOW = 40; // keep last 40 data points (~40 sec)

export function RealtimeMOEXChart() {
  const market = useRealtimeMarket(1000);
  const [history, setHistory] = useState<{ t: string; v: number }[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setHistory((prev) => {
      const now = new Date();
      const label = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      const next = [...prev, { t: label, v: market.imoex.last }];
      return next.length > CHART_WINDOW ? next.slice(-CHART_WINDOW) : next;
    });
  }, [market.imoex.last]);

  const changeColor = market.imoex.changePrc >= 0 ? "#34C759" : "#FF3B30";
  const gradientId = `imoexGrad_${changeColor.replace("#", "")}`;
  const glowGradientId = `imoexGlow_${changeColor.replace("#", "")}`;
  const avgValue = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.v, 0) / history.length * 100) / 100
    : market.imoex.last;
  const minVal = history.length > 0 ? Math.min(...history.map(h => h.v)) : market.imoex.last;
  const maxVal = history.length > 0 ? Math.max(...history.map(h => h.v)) : market.imoex.last;

  return (
    <div className="lg:col-span-2 p-6 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] relative overflow-hidden group">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at 25% 50%, ${changeColor} 0%, transparent 70%)` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8E8E93]" />
              <span className="text-sm font-bold text-[#303030]">IMOEX — Индекс Мосбиржи</span>
              <span className="animate-pulse w-2 h-2 rounded-full bg-[#34C759]" title="Real-time" />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-2xl font-black text-[#303030]">{market.imoex.last.toFixed(2)}</span>
              <span className="text-sm font-bold px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: changeColor }}>
                {market.imoex.changePrc > 0 ? "+" : ""}{market.imoex.changePrc.toFixed(2)}%
              </span>
              <a href="https://iss.moex.com/iss/statistics/engines/stock/markets/index/securities/IMOEX.html" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[#007AFF] flex items-center gap-0.5 hover:underline">
                <ExternalLink className="w-3 h-3" /> moex.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 text-[#8E8E93] animate-spin" style={{ animationDuration: "2s" }} />
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#8E8E93]">
              <span>H: {maxVal.toFixed(0)}</span>
              <span>L: {minVal.toFixed(0)}</span>
              <span>Avg: {avgValue.toFixed(0)}</span>
            </div>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}
              onMouseMove={(e) => {
                if (e.activeTooltipIndex !== undefined) setHoveredIndex(e.activeTooltipIndex);
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={changeColor} stopOpacity={0.35}/>
                  <stop offset="50%" stopColor={changeColor} stopOpacity={0.12}/>
                  <stop offset="100%" stopColor={changeColor} stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id={glowGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={changeColor} stopOpacity={0.6}/>
                  <stop offset="100%" stopColor={changeColor} stopOpacity={0}/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <XAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8E8E93" }} dataKey="t"
                interval="preserveStartEnd" />
              <YAxis axisLine={false} tick={false} domain={["auto", "auto"]} />
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" strokeOpacity={0.4} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: changeColor, strokeDasharray: "3 3", strokeOpacity: 0.4 }} />
              <ReferenceLine y={avgValue} stroke="#8E8E93" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: "avg", position: "insideBottomRight", fill: "#8E8E93", fontSize: 9 }} />
              <Area
                type="monotoneX"
                dataKey="v"
                stroke={changeColor}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: "#fff",
                  strokeWidth: 2,
                  fill: changeColor,
                  filter: "url(#glow)",
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-4 text-[10px] text-[#8E8E93]">
          <span>Обновление каждую секунду · iss.moex.com</span>
          <span>Открытие: {market.imoex.open.toFixed(0)} | H: {market.imoex.high.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Real-time stock prices ────────────────────────────────────────────────

export function RealtimeStockPrices() {
  const market = useRealtimeMarket(1000);

  return (
    <div className="rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] overflow-hidden">
      <div className="px-6 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#303030]">Топ акций Мосбиржи</span>
          <span className="animate-pulse w-2 h-2 rounded-full bg-[#34C759]" />
        </div>
        <a href="https://smart-lab.ru/q/" target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#007AFF] flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> smart-lab.ru
        </a>
      </div>
      <div className="divide-y divide-[#E5E5EA]">
        {market.stocks.length === 0 ? (
          // Fallback static data if API hasn't responded yet
          [
            { ticker: "SBER", name: "Сбер", price: 308.2, changePrc: 0 },
            { ticker: "GAZP", name: "Газпром", price: 102.9, changePrc: 0.78 },
            { ticker: "LKOH", name: "Лукойл", price: 4632, changePrc: 1.51 },
            { ticker: "ROSN", name: "Роснефть", price: 336.2, changePrc: 0.58 },
          ].map((s) => (
            <a key={s.ticker}
              href={`https://www.moex.com/ru/issue.aspx?board=TQBR&code=${s.ticker}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 px-6 py-3 hover:bg-white/80 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-xs font-bold text-[#8E8E93]">
                {s.ticker.substring(0, 2)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#303030]">{s.ticker} · {s.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#303030]">{s.price.toLocaleString("ru-RU")} ₽</div>
                <div className={`text-xs font-semibold ${s.changePrc >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                  {s.changePrc >= 0 ? "+" : ""}{s.changePrc.toFixed(2)}%
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#C7C7CC]" />
            </a>
          ))
        ) : (
          market.stocks.map((s) => {
            const up = s.changePrc >= 0;
            return (
              <a key={s.ticker}
                href={`https://www.moex.com/ru/issue.aspx?board=TQBR&code=${s.ticker}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 px-6 py-3 hover:bg-white/80 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-xs font-bold text-[#8E8E93]">
                  {s.ticker.substring(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#303030]">{s.ticker} · {s.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#303030]">
                    {Number(s.price).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ₽</div>
                  <div className={`text-xs font-semibold ${up ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                    {up ? "+" : ""}{s.changePrc.toFixed(2)}%
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#C7C7CC]" />
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Daily finance snapshot ─────────────────────────────────────────────────

export function DailyFinanceBadge() {
  const { data, loading } = useDailyFinance();
  if (loading || !data) return null;

  return (
    <div className="flex items-center gap-2 text-[10px] text-[#8E8E93] bg-[#F5F5F7] px-3 py-1.5 rounded-full">
      <RefreshCw className="w-3 h-3" />
      Обновлено {data.date}
    </div>
  );
}

// ─── Current rates line for daily section ───────────────────────────────────

export function DailyRatesGrid() {
  const { data, loading } = useDailyFinance();
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white border border-[#E5E5EA] animate-pulse">
            <div className="h-3 w-16 bg-[#E5E5EA] rounded mb-2" />
            <div className="h-5 w-12 bg-[#E5E5EA] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Ключевая ставка", value: `${data.keyRate.toFixed(2)}%`, sub: "ЦБ РФ (cbr.ru)", color: "#FF9500" },
    { label: "Лучший вклад", value: `${data.bestDepositRate.toFixed(1)}%`, sub: "banki.ru", color: "#34C759" },
    { label: "Ипотека", value: data.mortgageRate, sub: "семейная / рыночная", color: "#007AFF" },
    { label: "Инфляция", value: `${data.inflation}%`, sub: "rosstat.gov.ru", color: "#AF52DE" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="p-4 rounded-2xl bg-white border border-[#E5E5EA]">
          <div className="text-[10px] text-[#8E8E93] mb-1">{item.label}</div>
          <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
          <div className="text-[9px] text-[#C7C7CC] mt-0.5">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Daily cashback offers ───────────────────────────────────────────────────

export function DailyCashbackOffers() {
  const { data, loading } = useDailyFinance();
  if (loading || !data) return null;

  return (
    <div className="rounded-2xl bg-white border border-[#E5E5EA] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E5E5EA] flex items-center justify-between">
        <span className="text-xs font-bold text-[#303030] uppercase tracking-wide">🔥 Кэшбэк — сегодня</span>
        <span className="text-[10px] text-[#8E8E93]">Данные: banki.ru · {data.date}</span>
      </div>
      <div className="divide-y divide-[#F5F5F7]">
        {data.cashbackOffers.map((offer, i) => (
          <a key={i} href={offer.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F5F7] transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center text-[10px] font-bold text-[#3629B7]">
              {offer.bank.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#303030]">{offer.card}</div>
              <div className="text-[10px] text-[#8E8E93]">{offer.bank}</div>
            </div>
            <span className="text-xs font-bold text-[#34C759] shrink-0">{offer.cashback}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Daily top deposits ─────────────────────────────────────────────────────

export function DailyTopDeposits() {
  const { data, loading } = useDailyFinance();
  if (loading || !data) return null;

  return (
    <div className="rounded-2xl bg-white border border-[#E5E5EA] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E5E5EA] flex items-center justify-between">
        <span className="text-xs font-bold text-[#303030] uppercase tracking-wide">🏦 Топ-вклады — сегодня</span>
        <span className="text-[10px] text-[#8E8E93]">banki.ru · {data.date}</span>
      </div>
      <div className="divide-y divide-[#F5F5F7]">
        {data.topDeposits.map((dep, i) => (
          <a key={i} href={dep.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F5F7] transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center text-[10px] font-bold text-[#007AFF]">
              {dep.bank.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#303030]">{dep.bank}</div>
              <div className="text-[10px] text-[#8E8E93]">{dep.term}</div>
            </div>
            <span className="text-xs font-bold text-[#007AFF] shrink-0">{dep.rate}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── News ticker (daily headlines) ──────────────────────────────────────────

export function DailyNewsTicker() {
  const { data, loading } = useDailyFinance();
  if (loading || !data) return null;

  return (
    <div className="rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] p-4">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-3.5 h-3.5 text-[#3629B7]" />
        <span className="text-xs font-bold text-[#303030] uppercase tracking-wide">Новости дня · {data.date}</span>
      </div>
      <div className="space-y-2">
        {data.newsHeadlines.map((n, i) => (
          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#3629B7]/20 transition-colors">
            <span className="text-[10px] font-bold text-[#8E8E93] w-4 shrink-0">{(i + 1).toString().padStart(2, "0")}</span>
            <span className="text-xs text-[#303030] flex-1 leading-tight">{n.title}</span>
            <span className="text-[9px] text-[#8E8E93] shrink-0">{n.source}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
