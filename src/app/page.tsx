"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { UserData } from "@/lib/user-store";
import {
  ArrowRight,
  CalendarDays,
  CircleHelp,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const accounts = [
  { name: "Основной счёт", source: "Тинькофф", amount: 150000, updated: "сегодня" },
  { name: "Накопительный счёт", source: "Сбер", amount: 50000, updated: "6 октября" },
];
const goals = [
  { name: "Резерв на 6 месяцев", saved: 120000, target: 360000, color: "bg-[#3629B7]" },
  { name: "Переезд", saved: 85000, target: 180000, color: "bg-[#34C759]" },
];

type Tab = "overview" | "whatif" | "tools" | "plan" | "learn";

type FinancialSnapshot = {
  available: number;
  savings: number;
  investments: number;
  debt: number;
  fixedExpenses: number;
  income: number;
  accounts: UserData["accounts"];
};

function getFinancialSnapshot(data: UserData | null): FinancialSnapshot {
  const accounts = data?.accounts ?? [];
  const available = accounts.filter((account) => account.type !== "broker").reduce((sum, account) => sum + account.balance, 0) || 200000;
  const investments = accounts.filter((account) => account.type === "broker").reduce((sum, account) => sum + account.balance, 0) || 200000;
  const debt = data?.debts?.reduce((sum, item) => sum + item.balance, 0) || 120000;
  const fixedExpenses = (data?.profile?.monthlyRent ?? 0) + (data?.profile?.monthlyFood ?? 0) + (data?.profile?.monthlyTransport ?? 0) + (data?.profile?.monthlyUtilities ?? 0) + (data?.profile?.monthlyCredit ?? 0) || 70662;
  return { available, savings: accounts.filter((account) => account.type === "bank").reduce((sum, account) => sum + account.balance, 0) || 50000, investments, debt, fixedExpenses, income: data?.profile?.monthlyIncome ?? 0, accounts };
}

export default function DashboardPage() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [months, setMonths] = useState(3);
  const [optional, setOptional] = useState(20000);
  const [saved, setSaved] = useState(false);
  const snapshot = userData ?? null;
  const derived = useMemo(() => getFinancialSnapshot(snapshot), [snapshot]);
  const available = derived.available;
  const monthly = derived.fixedExpenses + optional;
  const result = useMemo(() => available - monthly * months, [available, monthly, months]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Обзор" }, { id: "whatif", label: "Что если" },
    { id: "tools", label: "Инструменты" }, { id: "plan", label: "Мой план" }, { id: "learn", label: "Разобраться" },
  ];

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm text-[#8E8E93]">Среда, 8 октября</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#303030] md:text-3xl">Ваши деньги и планы</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8E8E93]">Разберитесь, что у вас есть, какие обязательства впереди и хватит ли денег на выбранный план.</p></div>
      <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3629B7] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Добавить данные</button>
    </header>
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[#E5E5EA] bg-white p-1" aria-label="Разделы">
      {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === item.id ? "bg-[#3629B7] text-white" : "text-[#8E8E93] hover:bg-[#F5F5F7]"}`}>{item.label}</button>)}
    </nav>
    {tab === "overview" && <Overview snapshot={derived} />}
    {tab === "whatif" && <WhatIf months={months} setMonths={setMonths} optional={optional} setOptional={setOptional} result={result} saved={saved} setSaved={setSaved} />}
    {tab === "tools" && <Tools />}
    {tab === "plan" && <Plan />}
    {tab === "learn" && <Learn />}
  </div>;
}

function Overview({ snapshot }: { snapshot: FinancialSnapshot }) {
  const reserve = Math.floor(snapshot.available / snapshot.fixedExpenses);
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Wallet} label="Доступно сейчас" value={money.format(snapshot.available)} hint="Деньги без продажи активов" /><Metric icon={PiggyBank} label="Сбережения" value={money.format(snapshot.savings)} hint="Банковские счета и накопления" /><Metric icon={TrendingUp} label="Стоимость инвестиций" value={money.format(snapshot.investments)} hint="Текущая стоимость портфеля" /><Metric icon={CreditCard} label="Остаток долгов" value={money.format(snapshot.debt)} hint="Все обязательства вместе" /></div>
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"><section className="rounded-2xl border border-[#E5E5EA] bg-white p-5 md:p-6"><h2 className="text-lg font-bold text-[#303030]">Источники денег</h2><p className="mt-1 text-sm text-[#8E8E93]">Последнее обновление показано рядом с суммой.</p><div className="mt-5 divide-y divide-[#F0F0F2]">{(snapshot.accounts.length ? snapshot.accounts : [{ id: "fallback", name: "Основной счёт", type: "bank" as const, balance: snapshot.available, currency: "RUB", addedAt: new Date().toISOString() }]).map((account) => <div key={account.id} className="flex items-center justify-between gap-4 py-4 first:pt-0"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#F0EEFF] p-2.5 text-[#3629B7]"><Landmark className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-[#303030]">{account.name}</p><p className="text-xs text-[#8E8E93]">{account.type === "broker" ? "Брокерский счёт" : "Банковский счёт"} · ваши данные</p></div></div><p className="text-sm font-bold text-[#303030]">{money.format(account.balance)}</p></div>)}</div><button className="mt-5 w-full rounded-xl bg-[#F5F5F7] px-4 py-3 text-left text-sm font-semibold text-[#3629B7]">Добавить ещё источник <ArrowRight className="ml-2 inline h-4 w-4" /></button></section><section className="rounded-2xl bg-[#3629B7] p-5 text-white md:p-6"><div className="flex items-center gap-2 text-white/70"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Запас без зарплаты</span></div><p className="mt-5 text-4xl font-bold">{reserve} мес.</p><p className="mt-2 text-sm leading-relaxed text-white/70">Ориентир при обязательных расходах 70 662 ₽ в месяц.</p><button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Проверить сценарий <ArrowRight className="h-4 w-4" /></button></section></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><SectionTitle icon={ReceiptText} title="Ближайшие обязательства" /><div className="mt-4 space-y-3"><Row label="Кредитный платёж" detail="15 октября" value="10 662 ₽" /><Row label="Обязательные расходы" detail="до конца месяца" value="60 000 ₽" /></div></section><section className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><SectionTitle icon={Target} title="Деньги без назначения" /><p className="mt-4 text-2xl font-bold text-[#303030]">{money.format(snapshot.available)}</p><p className="mt-1 text-sm text-[#8E8E93]">Вы ещё не назначили этим деньгам цель.</p></section></div>
    <div className="flex items-center gap-2 rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 text-xs text-[#8E8E93]"><CircleHelp className="h-4 w-4 text-[#3629B7]" />Данные неполные: добавьте вклад и инвестиции, чтобы расчёт был точнее.</div>
  </>;
}

function WhatIf({ months, setMonths, optional, setOptional, result, saved, setSaved }: { months: number; setMonths: (value: number) => void; optional: number; setOptional: (value: number) => void; result: number; saved: boolean; setSaved: (value: boolean) => void }) {
  return <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-wider text-[#3629B7]">Сценарий</p><h2 className="mt-2 text-2xl font-bold text-[#303030]">Что будет, если зарплаты не будет?</h2><p className="mt-2 text-sm leading-relaxed text-[#8E8E93]">Измените условия и посмотрите, когда появится нехватка.</p><label className="mt-7 block text-sm font-semibold">Сколько месяцев без дохода</label><div className="mt-2 flex items-center gap-3"><input aria-label="Месяцы без дохода" type="range" min="1" max="12" value={months} onChange={(event) => setMonths(Number(event.target.value))} className="w-full accent-[#3629B7]" /><span className="w-16 rounded-lg bg-[#F5F5F7] px-2 py-2 text-center text-sm font-bold">{months} мес.</span></div><label className="mt-6 block text-sm font-semibold">Необязательные расходы в месяц</label><div className="mt-2 flex items-center gap-3"><input aria-label="Необязательные расходы" type="range" min="0" max="50000" step="5000" value={optional} onChange={(event) => setOptional(Number(event.target.value))} className="w-full accent-[#3629B7]" /><span className="w-24 rounded-lg bg-[#F5F5F7] px-2 py-2 text-center text-sm font-bold">{money.format(optional)}</span></div><button onClick={() => setSaved(!saved)} className="mt-8 w-full rounded-xl bg-[#3629B7] px-4 py-3 text-sm font-semibold text-white">{saved ? "Сценарий сохранён" : "Сохранить сценарий"}</button></div><div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#8E8E93]">Остаток после периода</p><p className={`mt-2 text-4xl font-bold ${result < 0 ? "text-[#FF3B30]" : "text-[#34C759]"}`}>{money.format(Math.max(0, result))}</p></div><CalendarDays className="h-8 w-8 text-[#3629B7]" /></div><div className="mt-8 rounded-xl bg-[#F5F5F7] p-4"><p className="text-sm font-semibold text-[#303030]">{result < 0 ? `На выбранный план не хватает ${money.format(Math.abs(result))}.` : "Обязательные платежи покрываются."}</p><p className="mt-2 text-sm leading-relaxed text-[#8E8E93]">Расчёт помесячный. Он показывает ориентир, а не точный день движения денег.</p></div></div></section>;
}

function Tools() { const tools = [{ title: "Проверить запас без зарплаты", text: "Уберите доход на несколько месяцев и увидите, когда появится нехватка." }, { title: "Накопить к нужной дате", text: "Укажите сумму и срок — расчёт покажет нужный ежемесячный взнос." }, { title: "Сравнить условия", text: "Сопоставьте предложения на одинаковую сумму и срок." }]; return <div className="grid gap-4 md:grid-cols-3">{tools.map((tool) => <article key={tool.title} className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><Target className="h-5 w-5 text-[#3629B7]" /><h2 className="mt-4 text-lg font-bold text-[#303030]">{tool.title}</h2><p className="mt-2 text-sm leading-relaxed text-[#8E8E93]">{tool.text}</p><button className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#3629B7]">Начать <ArrowRight className="h-4 w-4" /></button></article>)}</div>; }
function Plan() { return <div className="grid gap-4 lg:grid-cols-2">{goals.map((goal) => <section key={goal.name} className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><div className="flex justify-between"><div><p className="text-lg font-bold text-[#303030]">{goal.name}</p><p className="mt-1 text-sm text-[#8E8E93]">{money.format(goal.saved)} из {money.format(goal.target)}</p></div><Target className="h-5 w-5 text-[#3629B7]" /></div><div className="mt-5 h-2 rounded-full bg-[#F0F0F2]"><div className={`${goal.color} h-2 rounded-full`} style={{ width: `${Math.min(100, goal.saved / goal.target * 100)}%` }} /></div><p className="mt-3 text-xs text-[#8E8E93]">Осталось {money.format(goal.target - goal.saved)}</p></section>)}</div>; }
function Learn() { const cards = [{ title: "Как собрать резерв", text: "Отделите обязательные расходы от желаемых и посчитайте запас по месяцам." }, { title: "Что такое доступные деньги", text: "Это подтверждённые суммы, которыми можно воспользоваться без продажи активов." }, { title: "Как читать ставку", text: "Сравнивайте результат за одинаковый срок и проверяйте условия снятия." }]; return <div className="grid gap-4 md:grid-cols-3">{cards.map((card) => <article key={card.title} className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><CircleHelp className="h-5 w-5 text-[#3629B7]" /><h2 className="mt-4 text-lg font-bold text-[#303030]">{card.title}</h2><p className="mt-2 text-sm leading-relaxed text-[#8E8E93]">{card.text}</p></article>)}</div>; }
function Metric({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) { return <div className="rounded-2xl border border-[#E5E5EA] bg-white p-4"><div className="flex items-center gap-2"><div className="rounded-lg bg-[#F0EEFF] p-2 text-[#3629B7]"><Icon className="h-4 w-4" /></div><span className="text-xs font-medium text-[#8E8E93]">{label}</span></div><p className="mt-4 text-2xl font-bold tracking-tight text-[#303030]">{value}</p><p className="mt-1 text-xs leading-relaxed text-[#8E8E93]">{hint}</p></div>; }
function SectionTitle({ icon: Icon, title }: { icon: typeof Wallet; title: string }) { return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#3629B7]" /><h2 className="text-base font-bold text-[#303030]">{title}</h2></div>; }
function Row({ label, detail, value }: { label: string; detail: string; value: string }) { return <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-[#303030]">{label}</p><p className="text-xs text-[#8E8E93]">{detail}</p></div><p className="text-sm font-semibold text-[#303030]">{value}</p></div>; }
