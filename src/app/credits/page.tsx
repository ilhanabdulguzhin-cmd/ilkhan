"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { useState } from "react";
import {
  CreditCard, TrendingDown, Calculator, Target,
  Sparkles, ChevronRight, ArrowRight, AlertTriangle,
  CheckCircle2, Info, ExternalLink, Building2,
} from "lucide-react";

// ── Verified credit/debt data ─────────────────────────────────────────────────
// Sources: sravni.ru, banki.ru, brobank.ru, ЦБ РФ — апрель 2026

// Рефинансирование ипотеки апрель 2026 — источник: sravni.ru, vbr.ru
const REFI_OFFERS = [
  { bank: "Сбербанк", rate: 16.5, desc: "Рефинансирование рыночной ипотеки", url: "https://www.sravni.ru/bank/sberbank-rossii/ipoteka/refinansirovanie-ipoteki/", source: "sravni.ru" },
  { bank: "ВТБ", rate: 16.9, desc: "Рефинансирование + возможна консолидация", url: "https://www.vtb.ru/personal/ipoteka/refinansirovaniye/", source: "vtb.ru" },
  { bank: "Альфа-Банк", rate: 17.3, desc: "Быстрое одобрение, минимум документов", url: "https://alfabank.ru/mortgage/refinancing/", source: "alfabank.ru" },
  { bank: "Т-Банк", rate: 17.5, desc: "100% онлайн, без визита в офис", url: "https://www.tbank.ru/mortgage/refinancing/", source: "tbank.ru" },
  { bank: "Газпромбанк", rate: 16.3, desc: "Семейная ипотека 6% при соответствии условиям", url: "https://www.gazprombank.ru/personal/mortgage/refinancing/", source: "gazprombank.ru" },
];

// Ставки потреб. кредитов апрель 2026 — источник: banki.ru/products/credits/
const CONSUMER_LOANS = [
  { bank: "Сбербанк", rate: "от 22.9%", maxAmount: "5 млн ₽", term: "до 7 лет", url: "https://www.sberbank.ru/ru/person/credits/money/" },
  { bank: "Т-Банк", rate: "от 19.9%", maxAmount: "3 млн ₽", term: "до 5 лет", url: "https://www.tbank.ru/loans/cash/" },
  { bank: "Альфа-Банк", rate: "от 21%", maxAmount: "5 млн ₽", term: "до 7 лет", url: "https://alfabank.ru/get-money/credits/cash/" },
  { bank: "ВТБ", rate: "от 20.9%", maxAmount: "7 млн ₽", term: "до 7 лет", url: "https://www.vtb.ru/personal/kredity/nalichnymi/" },
];

const STRATEGIES = [
  {
    name: "Лавина",
    emoji: "🏔️",
    tag: "Математически выгоднее",
    tagColor: "#007AFF",
    desc: "Сначала гасите кредит с наибольшей процентной ставкой, остальным платите минимум.",
    result: "Экономит максимум на процентах",
    best: "Если хотите заплатить меньше всего",
    tip: "При долге 500 000 ₽ по 3 кредитам стратегия Лавина обычно экономит на 20–40% больше процентов чем Снежный ком.",
  },
  {
    name: "Снежный ком",
    emoji: "☃️",
    tag: "Психологически проще",
    tagColor: "#34C759",
    desc: "Сначала гасите кредит с наименьшей суммой долга, независимо от ставки.",
    result: "Быстрые победы — первый кредит закрывается скоро",
    best: "Если нужна мотивация и быстрый результат",
    tip: "Исследования поведенческих экономистов (Harvard) показывают: 73% людей придерживаются плана дольше при методе Снежного кома.",
  },
];

const RIGHTS = [
  {
    title: "Досрочное погашение — без штрафов",
    law: "ФЗ-353, ст. 11",
    desc: "Любой потребительский кредит можно погасить досрочно полностью или частично без штрафов и комиссий. Уведомить банк нужно за 30 дней (или меньше — если договор позволяет).",
    color: "#34C759",
    url: "https://cbr.ru/consumer_protection/zashchita-prav-zaemshchikov/",
  },
  {
    title: "Возврат страховки по кредиту",
    law: "Указание ЦБ №5460-У",
    desc: "В течение 14 дней («период охлаждения») можно отказаться от страховки и получить обратно 100% суммы. После — частичный возврат пропорционально сроку.",
    color: "#007AFF",
    url: "https://cbr.ru/consumer_protection/insurance/",
  },
  {
    title: "Кредитные каникулы",
    law: "ФЗ-353, ст. 6.1-1",
    desc: "При потере работы, болезни или ЧС — до 6 месяцев паузы по ипотеке или потреб. кредиту. Долг не прощается, но штрафов нет. Кредитная история не портится.",
    color: "#FF9500",
    url: "https://cbr.ru/consumer_protection/zashchita-prav-zaemshchikov/kreditnye-kanikuly/",
  },
  {
    title: "Ограничение коллекторов",
    law: "ФЗ-230",
    desc: "Коллекторы не вправе: звонить чаще 2 раз/нед, беспокоить с 22 до 8 (буд.) и с 20 до 9 (вых.), угрожать, контактировать с родственниками без согласия.",
    color: "#FF3B30",
    url: "https://fssp.gov.ru/",
  },
  {
    title: "Банкротство физлица",
    law: "ФЗ-127, гл. X",
    desc: "При долге свыше 500 000 ₽ и невозможности платить — можно инициировать банкротство. Процедура 6–12 мес. Имущество частично реализуется. Ипотечное жильё — под риском.",
    color: "#AF52DE",
    url: "https://fedresurs.ru/bankruptcy",
  },
  {
    title: "Ограничение ПСК (полной стоимости кредита)",
    law: "ФЗ-353, ст. 6",
    desc: "ЦБ РФ ограничивает максимальную ПСК: не выше 292% годовых для МФО. Банки — не выше ~40–50% для потреб. кредитов. Всё что выше — незаконно.",
    color: "#3629B7",
    url: "https://cbr.ru/consumer_protection/lending_markets/psk/",
  },
];

// ── Refinance calculator ───────────────────────────────────────────────────────
function RefCalc() {
  const [amount, setAmount] = useState("2000000");
  const [rOld, setROld] = useState("22");
  const [rNew, setRNew] = useState("16.5");
  const [years, setYears] = useState("10");

  const p = parseFloat(amount) || 0;
  const r1 = parseFloat(rOld) / 100 / 12;
  const r2 = parseFloat(rNew) / 100 / 12;
  const n = parseInt(years) * 12 || 0;

  const pay = (r: number) => n > 0 && r > 0 ? Math.round(p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const m1 = pay(r1);
  const m2 = pay(r2);
  const diff = m1 - m2;
  const totalSave = diff * n;
  const breakEven = diff > 0 ? Math.ceil(25000 / diff) : 0; // примерные расходы на переоформление ~25 000 ₽

  return (
    <Card className="border-[#E5E5EA]">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#FF9500]" />
          <p className="text-sm font-bold text-[#303030]">Выгода от рефинансирования</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Остаток долга, ₽", value: amount, set: setAmount },
            { label: "Текущая ставка, %", value: rOld, set: setROld },
            { label: "Новая ставка, %", value: rNew, set: setRNew },
            { label: "Срок, лет", value: years, set: setYears },
          ].map((f, i) => (
            <div key={i}>
              <label className="text-xs text-[#8E8E93] mb-1 block">{f.label}</label>
              <input type="number" value={f.value} onChange={(e) => f.set(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] text-sm font-semibold focus:outline-none focus:border-[#FF9500]/40" />
            </div>
          ))}
        </div>
        {m1 > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-3 rounded-xl bg-[#FF3B30]/8 text-center">
                <p className="text-sm font-bold text-[#FF3B30]">{m1.toLocaleString("ru-RU")} ₽</p>
                <p className="text-[9px] text-[#8E8E93]">Сейчас/мес</p>
              </div>
              <div className="p-3 rounded-xl bg-[#34C759]/8 text-center">
                <p className="text-sm font-bold text-[#34C759]">{m2.toLocaleString("ru-RU")} ₽</p>
                <p className="text-[9px] text-[#8E8E93]">После/мес</p>
              </div>
              <div className="p-3 rounded-xl bg-[#3629B7]/8 text-center">
                <p className="text-sm font-bold text-[#3629B7]">{totalSave > 0 ? `${Math.round(totalSave/1000)}к ₽` : "—"}</p>
                <p className="text-[9px] text-[#8E8E93]">Экономия всего</p>
              </div>
            </div>
            {breakEven > 0 && diff > 500 && (
              <p className="text-[11px] text-[#8E8E93] text-center mb-2">
                Расходы на переоформление (~25 000 ₽) окупятся за <strong>{breakEven} мес</strong>
              </p>
            )}
            <div className={`p-3 rounded-xl flex items-center gap-2 ${diff > 1000 ? "bg-[#34C759]/8 border border-[#34C759]/20" : "bg-[#FF9500]/8 border border-[#FF9500]/20"}`}>
              {diff > 1000 ? <CheckCircle2 className="w-4 h-4 text-[#34C759]" /> : <Info className="w-4 h-4 text-[#FF9500]" />}
              <p className="text-xs font-semibold" style={{ color: diff > 1000 ? "#34C759" : "#FF9500" }}>
                {diff > 1000
                  ? `Рефинансирование выгодно — экономия ${diff.toLocaleString("ru-RU")} ₽/мес`
                  : "Небольшая разница — учтите расходы на переоформление ~15–30к ₽"}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CreditsPage() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<"overview" | "strategy" | "rights" | "calc">("overview");

  const income = userData?.profile?.monthlyIncome || 0;
  const creditPayment = userData?.profile?.monthlyCredit || 0;
  const creditDebt = userData?.profile?.creditDebt || 0;
  const dti = income > 0 && creditPayment > 0 ? Math.round((creditPayment / income) * 100) : 0;

  const dtiColor = dti > 50 ? "#FF3B30" : dti > 30 ? "#FF9500" : "#34C759";
  const dtiLabel = dti > 50 ? "Критическая нагрузка" : dti > 30 ? "Повышенная нагрузка" : "Нормальный уровень";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF9500]/15 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#FF9500]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#303030]">Кредиты и долги</h1>
              <p className="text-xs text-[#8E8E93]">Стратегии · рефинансирование · ваши права</p>
            </div>
          </div>
          <Link href="/ai-consultant?context=debt" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF9500]/10 text-[#FF9500] text-xs font-semibold border border-[#FF9500]/20">
            <Sparkles className="w-3.5 h-3.5" /> Кэшик
          </Link>
        </div>

        {/* DTI indicator */}
        {dti > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#E5E5EA]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold" style={{ backgroundColor: `${dtiColor}15`, color: dtiColor }}>
              {dti}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#303030]">Долговая нагрузка · {dtiLabel}</p>
              <p className="text-xs text-[#8E8E93] mt-0.5 leading-relaxed">
                {dti > 50 ? "Более 50% дохода уходит на кредиты. Нужен срочный план погашения или рефинансирование." :
                 dti > 30 ? "30–50% — повышенный уровень. Банки откажут в новых кредитах. Не берите новые займы." :
                 "До 30% — комфортный уровень по стандартам ЦБ РФ."}
              </p>
              {creditDebt > 0 && <p className="text-xs text-[#8E8E93] mt-0.5">Общий долг: <strong>{creditDebt.toLocaleString("ru-RU")} ₽</strong></p>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-2xl">
          {[
            { id: "overview", label: "Обзор", icon: CreditCard },
            { id: "strategy", label: "Стратегия", icon: Target },
            { id: "rights", label: "Права", icon: Info },
            { id: "calc", label: "Калькулятор", icon: Calculator },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-[#303030] shadow-sm" : "text-[#8E8E93]"}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── ОБЗОР ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF9500] to-[#d97800] text-white">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold mb-1">Совет Кэшика по долгам</p>
                  <p className="text-xs text-white/85 leading-relaxed">
                    {dti > 40
                      ? `Нагрузка ${dti}% — критически высокая. Первый шаг: список всех кредитов с суммой и ставкой. Применяйте стратегию «Лавина» — сначала кредит с наибольшей ставкой.`
                      : creditDebt > 0
                      ? `Долг ${creditDebt.toLocaleString("ru-RU")} ₽. Стратегия «Лавина» сэкономит больше всего на процентах. Любой доп. платёж сверх минимума сокращает срок.`
                      : "Укажите данные о кредитах в профиле, чтобы Кэшик составил персональный план."}
                  </p>
                  <Link href="/ai-consultant?context=debt" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-white/90 border border-white/30 px-2.5 py-1 rounded-lg">
                    Составить план <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Refinancing offers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-[#303030]">Рефинансирование ипотеки · апрель 2026</p>
                <a href="https://www.sravni.ru/ipoteka/refinansirovanie-ipoteki/" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-[#007AFF] flex items-center gap-0.5">
                  sravni.ru <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-2">
                {REFI_OFFERS.map((o, i) => (
                  <a key={i} href={o.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#FF9500]/30 transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#FF9500]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#303030]">{o.bank}</p>
                      <p className="text-[11px] text-[#8E8E93]">{o.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#FF9500]">{o.rate}%</p>
                      <ExternalLink className="w-3 h-3 text-[#C7C7CC] ml-auto mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-[#C7C7CC] mt-1.5 text-center">Ставки от — итоговая ставка зависит от профиля заёмщика</p>
            </div>

            {/* Consumer loans */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-[#303030]">Потребительские кредиты</p>
                <a href="https://www.banki.ru/products/credits/" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-[#007AFF] flex items-center gap-0.5">
                  banki.ru <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-2">
                {CONSUMER_LOANS.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#FF9500]/20 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-[#303030]">{l.bank}</p>
                      <p className="text-[11px] text-[#8E8E93]">{l.maxAmount} · {l.term}</p>
                    </div>
                    <p className="text-sm font-bold text-[#FF3B30]">{l.rate}</p>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {[
                { onClick: () => setTab("strategy"), icon: Target, color: "#3629B7", title: "Стратегии погашения", desc: "Лавина vs снежный ком — что выгоднее" },
                { onClick: () => setTab("rights"), icon: Info, color: "#34C759", title: "Ваши права заёмщика", desc: "Досрочное погашение, возврат страховки, каникулы" },
                { onClick: () => setTab("calc"), icon: Calculator, color: "#FF9500", title: "Калькулятор рефинансирования", desc: "Считает выгоду за секунды" },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E5E5EA] hover:border-[#FF9500]/30 hover:shadow-sm transition-all text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#303030]">{item.title}</p>
                    <p className="text-[11px] text-[#8E8E93]">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                </button>
              ))}
            </div>

            <Link href="/debt-optimizer" className="flex items-center justify-between p-4 rounded-2xl bg-[#FF9500]/8 border border-[#FF9500]/20 hover:bg-[#FF9500]/12 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-[#FF9500]" />
                <div>
                  <p className="text-sm font-bold text-[#303030]">Оптимизатор долгов</p>
                  <p className="text-xs text-[#8E8E93]">Полный анализ и приоритеты по кредитам</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FF9500]" />
            </Link>
          </div>
        )}

        {/* ── СТРАТЕГИЯ ── */}
        {tab === "strategy" && (
          <div className="space-y-4">
            <p className="text-sm text-[#8E8E93]">Выберите метод в зависимости от вашей ситуации. Математически оба правильны, но дают разный психологический эффект.</p>
            {STRATEGIES.map((s, i) => (
              <Card key={i} className="border-[#E5E5EA]">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{s.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-[#303030]">Стратегия «{s.name}»</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: s.tagColor }}>{s.tag}</span>
                      </div>
                      <p className="text-xs text-[#8E8E93] leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#34C759]/8">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                      <span className="text-xs text-[#303030]">{s.result}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F5F5F7]">
                      <Info className="w-3.5 h-3.5 text-[#8E8E93]" />
                      <span className="text-xs text-[#8E8E93]">{s.best}</span>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#3629B7]/8">
                      <Sparkles className="w-3.5 h-3.5 text-[#3629B7] shrink-0 mt-0.5" />
                      <span className="text-xs text-[#3629B7]">{s.tip}</span>
                    </div>
                  </div>
                  <Link href={`/ai-consultant?context=debt&strategy=${s.name.toLowerCase()}`} className="text-xs font-semibold text-[#3629B7] flex items-center gap-1">
                    Составить план по этой стратегии <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>
            ))}

            <div className="p-4 rounded-2xl bg-[#3629B7]/8 border border-[#3629B7]/15">
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                <strong className="text-[#303030]">Правило апрель 2026:</strong> Если ставка кредита выше 14,5% (ключевая ставка ЦБ) — гасить досрочно выгоднее, чем класть деньги на вклад под 16–17%. Исключение — если вклад под 17%+ и кредит под 15% и ниже.
              </p>
            </div>
          </div>
        )}

        {/* ── ПРАВА ── */}
        {tab === "rights" && (
          <div className="space-y-3">
            <p className="text-sm text-[#8E8E93]">Права гарантированы законом. Банк обязан их соблюдать — если нет, жалоба в ЦБ РФ (cbr.ru/reception).</p>
            {RIGHTS.map((r, i) => (
              <Card key={i} className="border-[#E5E5EA]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-[#303030]">{r.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#8E8E93] shrink-0 font-mono">{r.law}</span>
                  </div>
                  <p className="text-xs text-[#8E8E93] leading-relaxed mb-3">{r.desc}</p>
                  <div className="flex items-center justify-between">
                    <Link href={`/ai-consultant?context=borrower-rights`} className="text-xs font-semibold flex items-center gap-1" style={{ color: r.color }}>
                      Подробнее у Кэшика <ArrowRight className="w-3 h-3" />
                    </Link>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-[#8E8E93] hover:text-[#007AFF]">
                      <ExternalLink className="w-3 h-3" /> Источник
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── КАЛЬКУЛЯТОР ── */}
        {tab === "calc" && (
          <div className="space-y-4">
            <RefCalc />
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                <strong className="text-[#303030]">Когда рефинансировать:</strong> разница ставок ≥2%, осталось ≥1 года выплат, расходы на переоформление (~15–30к ₽) окупятся за 6–12 мес.
                {" "}<a href="https://brobank.ru/ipoteka-open-refinans/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">brobank.ru</a>
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#303030] mb-2">Сравнить ставки рефинансирования</p>
              {REFI_OFFERS.slice(0, 3).map((o, i) => (
                <a key={i} href={o.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#FF9500]/30 transition-colors mb-2">
                  <p className="text-sm font-semibold text-[#303030]">{o.bank}</p>
                  <p className="text-sm font-bold text-[#FF9500]">{o.rate}%</p>
                </a>
              ))}
              <a href="https://www.sravni.ru/ipoteka/refinansirovanie-ipoteki/" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#FF9500]/8 text-[#FF9500] text-xs font-semibold">
                Все предложения на Сравни.ру <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
