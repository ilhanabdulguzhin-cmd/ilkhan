"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { useState } from "react";
import {
  TrendingUp, PiggyBank, Landmark, Calculator,
  Sparkles, ChevronRight, ArrowRight, CheckCircle2, Info,
  ExternalLink,
} from "lucide-react";

// ── Verified investment data (July 2026) ───────────────────────────────────────
// Sources: cbr.ru, banki.ru, finuslugi.ru, sravni.ru
// ЦБ РФ снизил ключевую ставку до 14,0% 6 июня 2026
// Источник: cbr.ru/hd_base/keyrate/

const KEY_RATES = {
  cbr: 14.0,
  inflation: 6.8,
  bestDeposit: 16,     // banki.ru: вклады до 16% после снижения КС до 14,0%
  bestSavings: 14.5,
  ofzShort: 14.5,      // ОФЗ 2–3 года · moex.com
  ofzLong: 13.0,       // ОФЗ 10+ лет
  iisDeduction: 64000, // С учётом новой шкалы НДФЛ (прогрессивная 13–15%)
};

// Топ вкладов июль 2026 — источник: banki.ru, finuslugi.ru
const TOP_DEPOSITS = [
  { bank: "Т-Банк", product: "ОнлайнТоп", rate: 16.0, period: "3 мес", min: "50 000 ₽", url: "https://www.tbank.ru/savings/deposits/" },
  { bank: "Газпромбанк", product: "Ваш выбор", rate: 15.5, period: "6 мес", min: "15 000 ₽", url: "https://www.gazprombank.ru/personal/deposits/" },
  { bank: "ВТБ", product: "Надёжный", rate: 15.0, period: "6 мес", min: "30 000 ₽", url: "https://www.vtb.ru/personal/nakopleniya/vklady/" },
  { bank: "МКБ", product: "МКБ-Доход", rate: 15.5, period: "3 мес", min: "10 000 ₽", url: "https://mkb.ru/personal/investments/deposits" },
  { bank: "ПСБ", product: "Мой доход", rate: 15.0, period: "9 мес", min: "50 000 ₽", url: "https://www.psbank.ru/Personal/Deposits" },
];

const INSTRUMENTS = [
  {
    id: "deposit",
    emoji: "🏦",
    name: "Вклад",
    rate: "до 17%",
    rateNote: "на 3–6 мес · июль 2026 · banki.ru",
    risk: "нет",
    riskColor: "#34C759",
    horizon: "1–18 мес",
    guarantee: "АСВ до 1.4 млн ₽",
    pros: ["Гарантированный доход", "Страховка государства", "Просто открыть"],
    cons: ["Деньги заморожены", "При досрочном снятии — потеря %"],
    tip: "ЦБ снизил до 14,0% (06.06) — фиксируйте 15–16% на 6–12 мес, пока ставки не упали до 12%. Июль — последний месяц. Источник: banki.ru",
    href: "/products?tab=deposits",
    tag: "Фиксируй сейчас",
    tagColor: "#34C759",
    sourceUrl: "https://www.banki.ru/products/deposits/catalogue/",
    sourceLabel: "Banki.ru",
  },
  {
    id: "savings",
    emoji: "💳",
    name: "Накопительный счёт",
    rate: "до 16%",
    rateNote: "% начисляется ежедневно",
    risk: "нет",
    riskColor: "#34C759",
    horizon: "без срока",
    guarantee: "АСВ до 1.4 млн ₽",
    pros: ["Деньги доступны в любой момент", "% каждый день", "Нет штрафа за снятие"],
    cons: ["Ставка на 1–2% ниже вклада", "Банк может снизить ставку"],
    tip: "Держите финансовую подушку (3–6 мес расходов) на накопительном — не замораживайте её на вкладе.",
    href: "/products?tab=deposits",
    tag: "Подушка безопасности",
    tagColor: "#007AFF",
    sourceUrl: "https://www.sravni.ru/vklady/nakopitelnye-scheta/",
    sourceLabel: "Сравни.ру",
  },
  {
    id: "ofz",
    emoji: "🇷🇺",
    name: "ОФЗ",
    rate: "14–15%",
    rateNote: "к погашению · июль 2026 · moex.com",
    risk: "минимальный",
    riskColor: "#007AFF",
    horizon: "1–15 лет",
    guarantee: "Минфин РФ",
    pros: ["Гарантия государства", "Можно продать до срока", "Подходит для ИИС", "Нет НДФЛ с купонов ОФЗ"],
    cons: ["Нужен брокерский счёт", "Цена растёт при снижении ставки"],
    tip: "После снижения ставки ЦБ до 14,0% (06.06) — длинные ОФЗ (10+ лет) выросли в цене. Покупать сейчас = купонный доход 13–14% + потенциал роста тела при снижении КС до 12% в 2027. Источник: moex.com",
    href: "/ai-consultant?context=ofz",
    tag: "Государство",
    tagColor: "#007AFF",
    sourceUrl: "https://www.banki.ru/investment/bonds/issuer-MFRU/",
    sourceLabel: "Banki.ru · ОФЗ",
  },
  {
    id: "iis",
    emoji: "📋",
    name: "ИИС тип 3",
    rate: "до 16% вычет + рыночный",
    rateNote: "вычет 13–16% на взносы до 400 000 ₽/год",
    risk: "рыночный",
    riskColor: "#FF9500",
    horizon: "от 5 лет",
    guarantee: "нет",
    pros: ["Вычет до 64 000 ₽/год от государства", "Нет налога с прибыли", "Кладите туда ОФЗ или вклады"],
    cons: ["Минимальный срок 5 лет", "Штраф за досрочное закрытие"],
    tip: "ИИС-3 + ОФЗ = госгарантия + вычет до 64 000 ₽/год (с учётом прогрессивной шкалы НДФЛ 2026). Вложите 400 000 ₽ → реальная доходность ~20%+ с вычетом.",
    href: "/tax-helper",
    tag: "Вычет",
    tagColor: "#AF52DE",
    sourceUrl: "https://www.nalog.gov.ru/rn77/taxation/taxes/ndfl/nalog_vichet/inv_vichet/",
    sourceLabel: "ФНС России",
  },
  {
    id: "bpif",
    emoji: "📊",
    name: "БПИФ на Мосбиржу",
    rate: "историч. 10–15%/год",
    rateNote: "долгосрочно, с волатильностью",
    risk: "средний",
    riskColor: "#FF9500",
    horizon: "от 3 лет",
    guarantee: "нет",
    pros: ["Диверсификация из одной бумаги", "Комиссии 0.3–1.5%/год", "Покупается как акция"],
    cons: ["Рыночный риск", "Короткий горизонт — возможны убытки"],
    tip: "БПИФ IMOEX (индекс Мосбиржи) — хорошая основа долгосрочного портфеля. При снижении ставки ЦБ рынок акций исторически растёт. Горизонт — 5+ лет.",
    href: "/ai-consultant?context=invest",
    tag: "Долгосрочно",
    tagColor: "#FF9500",
    sourceUrl: "https://www.moex.com/ru/index/IMOEX",
    sourceLabel: "Мосбиржа · IMOEX",
  },
];

// ── Deposit calculator ─────────────────────────────────────────────────────────
function CalcDeposit() {
  const [amount, setAmount] = useState("500000");
  const [rate, setRate] = useState("16.5");
  const [months, setMonths] = useState("12");

  const p = parseFloat(amount) || 0;
  const r = parseFloat(rate) / 100;
  const m = parseInt(months) || 0;
  const income = Math.round(p * r * (m / 12));
  const total = p + income;
  // Налоговый вычет: проценты выше (КС+5%)*сумма не облагаются — при КС 14,5% порог ~(20%)*сумма
  const taxFreeLimit = Math.round(p * 0.20 * (m / 12));
  const taxable = Math.max(0, income - taxFreeLimit);
  const tax = taxable > 0 ? Math.round(taxable * 0.13) : 0;

  return (
    <Card className="border-[#E5E5EA]">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#3629B7]" />
          <p className="text-sm font-bold text-[#303030]">Калькулятор вклада</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Сумма, ₽", value: amount, set: setAmount },
            { label: "Ставка, %", value: rate, set: setRate },
            { label: "Срок, мес.", value: months, set: setMonths },
          ].map((f, i) => (
            <div key={i}>
              <label className="text-xs text-[#8E8E93] mb-1 block">{f.label}</label>
              <input type="number" value={f.value} onChange={(e) => f.set(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] text-sm font-semibold focus:outline-none focus:border-[#3629B7]/40" />
            </div>
          ))}
        </div>
        {p > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/15 text-center">
                <p className="text-lg font-bold text-[#34C759]">+{income.toLocaleString("ru-RU")} ₽</p>
                <p className="text-[10px] text-[#8E8E93]">Доход за период</p>
              </div>
              <div className="p-3 rounded-xl bg-[#3629B7]/8 border border-[#3629B7]/15 text-center">
                <p className="text-lg font-bold text-[#3629B7]">{total.toLocaleString("ru-RU")} ₽</p>
                <p className="text-[10px] text-[#8E8E93]">Итого</p>
              </div>
            </div>
            {tax > 0 && (
              <p className="text-[11px] text-[#FF9500] text-center">
                * Налог ~{tax.toLocaleString("ru-RU")} ₽ (13% сверх необлагаемого порога при КС 14,0%)
              </p>
            )}
            <p className="text-[10px] text-[#C7C7CC] text-center">Расчёт приблизительный без учёта капитализации</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvestPage() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<"overview" | "tools" | "deposits" | "calc">("overview");

  const income = userData?.profile?.monthlyIncome || 0;
  const savings = userData?.profile?.monthlySavings || 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#303030]">Инвестиции</h1>
              <p className="text-xs text-[#8E8E93]">Вклады · ОФЗ · ИИС · БПИФ</p>
            </div>
          </div>
          <Link href="/ai-consultant?context=invest" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007AFF]/10 text-[#007AFF] text-xs font-semibold border border-[#007AFF]/20">
            <Sparkles className="w-3.5 h-3.5" /> Стратегия
          </Link>
        </div>

        {/* Live rates banner — источник: ЦБ РФ, Banki.ru, июль 2026 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Ставка ЦБ", value: `${KEY_RATES.cbr}%`, note: "июль 2026 · cbr.ru", color: "#FF9500", url: "https://www.cbr.ru/hd_base/keyrate/" },
            { label: "Лучший вклад", value: `${KEY_RATES.bestDeposit}%`, note: "3 мес · banki.ru", color: "#34C759", url: "https://www.banki.ru/products/deposits/catalogue/" },
            { label: "ОФЗ 2–3 года", value: `${KEY_RATES.ofzShort}%`, note: "к погашению · moex.com", color: "#007AFF", url: "https://www.banki.ru/investment/bonds/issuer-MFRU/" },
            { label: "Инфляция", value: `${KEY_RATES.inflation}%`, note: "г/г, март 2026 · rosstat.gov.ru", color: "#FF3B30", url: "https://rosstat.gov.ru/statistics/price" },
          ].map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-white border border-[#E5E5EA] text-center hover:border-[#007AFF]/30 transition-colors group">
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] font-medium text-[#303030]">{s.label}</p>
              <p className="text-[10px] text-[#8E8E93] group-hover:text-[#007AFF] transition-colors">{s.note}</p>
            </a>
          ))}
        </div>

        {/* ЦБ снижает — контекстовый баннер */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/15">
          <TrendingUp className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#303030]">ЦБ снижает ставку до 14% — окно для вкладов почти закрылось</p>
            <p className="text-xs text-[#8E8E93] leading-relaxed mt-0.5">
              С пика 21% (октябрь 2024) ставка снизилась до 14,0% (6 июня 2026). Следующее заседание — 25 июля.{" "}
              <a href="https://www.cbr.ru/dkp/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF] underline">ЦБ РФ</a>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-2xl">
          {[
            { id: "overview", label: "Главное", icon: PiggyBank },
            { id: "tools", label: "Инструменты", icon: TrendingUp },
            { id: "deposits", label: "Топ вкладов", icon: Landmark },
            { id: "calc", label: "Калькулятор", icon: Calculator },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-[#303030] shadow-sm" : "text-[#8E8E93]"}`}>
              <t.icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── ГЛАВНОЕ ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Personalized tip */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055d4] text-white">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold mb-1">Совет Кэшика · июль 2026</p>
                  <p className="text-xs text-white/85 leading-relaxed">
                    {savings > 0 && income > 0
                      ? `Вы откладываете ${savings.toLocaleString("ru-RU")} ₽/мес. При ставке ${KEY_RATES.bestDeposit}% на 12 мес — доход ${Math.round(savings * 12 * (KEY_RATES.bestDeposit / 100)).toLocaleString("ru-RU")} ₽/год. Июль — последний месяц для фиксации высокой ставки.`
                      : `Ставка ЦБ 14,0% (6 июня 2026). Топ вклады дают до 16%. Фиксируйте ставку сейчас — прогноз на конец 2026: 11–12%.`
                    }
                  </p>
                  <Link href="/ai-consultant?context=invest" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-white/90 border border-white/30 px-2.5 py-1 rounded-lg">
                    Составить стратегию <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Key actions */}
            <div className="space-y-2">
              {[
                { icon: Landmark, color: "#34C759", title: `Открыть вклад до 16%`, desc: "Зафиксируйте 15–16% на 6–12 мес — июль последний месяц высоких ставок · banki.ru", href: "/products?tab=deposits" },
                { icon: TrendingUp, color: "#007AFF", title: "Купить ОФЗ через ИИС-3", desc: `Гособлигации 13–14,5% + вычет до ${KEY_RATES.iisDeduction.toLocaleString("ru-RU")} ₽/год`, href: "/tax-helper" },
                { icon: PiggyBank, color: "#AF52DE", title: "Налоговый вычет ИИС-3", desc: "Вложите 400 000 ₽ → получите до 64 000 ₽ от государства · nalog.gov.ru", href: "/tax-helper" },
              ].map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E5E5EA] hover:border-[#007AFF]/30 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#303030]">{item.title}</p>
                    <p className="text-[11px] text-[#8E8E93]">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] group-hover:text-[#007AFF] shrink-0 transition-colors" />
                </Link>
              ))}
            </div>

            {/* Strategy reminder */}
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                <strong className="text-[#303030]">Стратегия июля 2026 (КС 14%):</strong> 1) зафиксировать вклады 15–16% на 6–12 мес 2) купить длинные ОФЗ (при дальнейшем снижении КС цена ОФЗ растёт) 3) ИИС-3 + ОФЗ для налогового вычета до 64 000 ₽ 4) БПИФ на IMOEX для долгосрочного роста.
                {" "}<a href="https://www.cbr.ru/dkp/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">ЦБ РФ · ДКП</a>
              </p>
            </div>
          </div>
        )}

        {/* ── ИНСТРУМЕНТЫ ── */}
        {tab === "tools" && (
          <div className="space-y-3">
            {INSTRUMENTS.map((p) => (
              <Card key={p.id} className="border-[#E5E5EA]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl leading-none mt-0.5">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-[#303030]">{p.name}</span>
                        {p.tag && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: p.tagColor }}>{p.tag}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-[#303030]">{p.rate}</span>
                        <span className="text-[11px] text-[#8E8E93]">{p.rateNote}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 rounded-xl bg-[#F5F5F7]">
                      <p className="text-[11px] font-semibold" style={{ color: p.riskColor }}>{p.risk}</p>
                      <p className="text-[9px] text-[#8E8E93]">риск</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F5F5F7]">
                      <p className="text-[11px] font-semibold text-[#303030]">{p.horizon}</p>
                      <p className="text-[9px] text-[#8E8E93]">горизонт</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F5F5F7]">
                      <p className="text-[10px] font-semibold text-[#303030] leading-tight">{p.guarantee}</p>
                      <p className="text-[9px] text-[#8E8E93]">гарантия</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      {p.pros.slice(0, 2).map((pro, i) => (
                        <div key={i} className="flex items-start gap-1 mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-[#34C759] shrink-0 mt-0.5" />
                          <span className="text-[10px] text-[#303030]">{pro}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      {p.cons.slice(0, 2).map((con, i) => (
                        <div key={i} className="flex items-start gap-1 mb-0.5">
                          <Info className="w-3 h-3 text-[#8E8E93] shrink-0 mt-0.5" />
                          <span className="text-[10px] text-[#8E8E93]">{con}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#007AFF]/8 border border-[#007AFF]/15 mb-3">
                    <Sparkles className="w-3 h-3 text-[#007AFF] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#007AFF] leading-relaxed">{p.tip}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link href={p.href} className="flex items-center gap-1 text-xs font-semibold text-[#007AFF]">
                      Подробнее <ArrowRight className="w-3 h-3" />
                    </Link>
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-[#8E8E93] hover:text-[#007AFF]">
                      <ExternalLink className="w-3 h-3" /> {p.sourceLabel}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── ТОП ВКЛАДОВ ── */}
        {tab === "deposits" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#007AFF]/8 border border-[#007AFF]/15">
              <Info className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Актуальные ставки на июль 2026. Источники:{" "}
                <a href="https://www.banki.ru/products/deposits/catalogue/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">banki.ru</a>,{" "}
                <a href="https://finuslugi.ru/navigator/nakopit-i-sohranit" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">finuslugi.ru</a>
              </p>
            </div>
            <div className="space-y-2">
              {TOP_DEPOSITS.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E5E5EA] hover:border-[#007AFF]/30 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[#007AFF]">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#303030]">{d.bank}</p>
                    <p className="text-[11px] text-[#8E8E93]">{d.product} · {d.period} · от {d.min}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-[#34C759]">{d.rate}%</p>
                    <ExternalLink className="w-3 h-3 text-[#C7C7CC] group-hover:text-[#007AFF] ml-auto mt-0.5 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
            <Link href="/ai-consultant?context=invest" className="flex items-center justify-between p-4 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/15">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#34C759]" />
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Подобрать вклад под мою цель</p>
                  <p className="text-xs text-[#8E8E93]">Кэшик сравнит условия под ваш профиль</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#34C759]" />
            </Link>
          </div>
        )}

        {/* ── КАЛЬКУЛЯТОР ── */}
        {tab === "calc" && (
          <div className="space-y-4">
            <CalcDeposit />
            <Link href="/products?tab=deposits" className="flex items-center justify-between p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] hover:border-[#007AFF]/30 transition-colors">
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-[#007AFF]" />
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Сравнить реальные вклады</p>
                  <p className="text-xs text-[#8E8E93]">Т-Банк, Газпромбанк, ВТБ, ПСБ — актуальные ставки</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
