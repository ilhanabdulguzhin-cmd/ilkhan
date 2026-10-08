"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
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
  { name: "Резерв на 6 месяцев", saved: 120000, target: 360000, tone: "bg-[#3629B7]" },
  { name: "Переезд", saved: 85000, target: 180000, tone: "bg-[#34C759]" },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "whatif" | "plan" | "learn">("overview");
  const [withoutIncome, setWithoutIncome] = useState(3);
  const [optionalExpenses, setOptionalExpenses] = useState(20000);
  const [saved, setSaved] = useState(false);

  const available = accounts.reduce((sum, account) => sum + account.amount, 0);
  const monthlyFixed = 60000;
  const monthlyDebt = 10662;
  const reserveMonths = Math.floor(available / (monthlyFixed + monthlyDebt + optionalExpenses));
  const scenarioResult = useMemo(() => available - (monthlyFixed + monthlyDebt + optionalExpenses) * withoutIncome, [available, monthlyFixed, monthlyDebt, optionalExpenses, withoutIncome]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[#8E8E93]">Среда, 8 октября</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#303030] md:text-3xl">Ваши деньги и планы</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8E8E93]">Поймите, что у вас есть сейчас, какие обязательства впереди и хватит ли денег на выбранный план.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3629B7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2a1f8f]"><Plus className="h-4 w-4" />Добавить данные</button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#E5E5EA] bg-white p-1">
        {[{ id: "overview", label: "Обзор" }, { id: "whatif", label: "Что если" }, { id: "plan", label: "Мой план" }, { id: "learn", label: "Разобраться" }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-[#3629B7] text-white" : "text-[#8E8E93] hover:bg-[#F5F5F7]"`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "overview" && <Overview available={available} reserveMonths={reserveMonths} saved={saved} setSaved={setSaved} />}
      {activeTab === "whatif" && <WhatIf withoutIncome={withoutIncome} setWithoutIncome={setWithoutIncome} optionalExpenses={optionalExpenses} setOptionalExpenses={setOptionalExpenses} result={scenarioResult} saved={saved} setSaved={setSaved} />}
      {activeTab === "plan" && <Plan />}
      {activeTab === "learn" && <Learn />}
    </div>
  );
}

function Overview({ available, reserveMonths, saved, setSaved }: { available: number; reserveMonths: number; saved: boolean; setSaved: (value: boolean) => void }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Wallet} label="Доступно сейчас" value={money.format(available)} hint="Подтверждённые деньги без продажи активов" tone="purple" />
      <Metric icon={PiggyBank} label="Сбережения с ограничениями" value={money.format(50000)} hint="Доступность зависит от условий" tone="green" />
      <Metric icon={TrendingUp} label="Стоимость инвестиций" value={money.format(200000)} hint="Цена портфеля на 6 октября" tone="blue" />
      <Metric icon={CreditCard} label="Остаток долгов" value={money.format(120000)} hint="Платёж в этом месяце: 10 662 ₽" tone="orange" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <section className="rounded-2xl border border-[#E5E5EA] bg-white p-5 md:p-6">
        <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#303030]">Источники денег</h2><p className="mt-1 text-sm text-[#8E8E93]">Последнее обновление показано рядом с суммой.</p></div><button className="rounded-lg p-2 text-[#8E8E93] hover:bg-[#F5F5F7]" aria-label="Обновить"><RefreshCw className="h-4 w-4" /></button></div>
        <div className="mt-5 divide-y divide-[#F0F0F2]">{accounts.map((account) => <div key={account.name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#F0EEFF] p-2.5 text-[#3629B7]"><Landmark className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-[#303030]">{account.name}</p><p className="text-xs text-[#8E8E93]">{account.source} · обновлено {account.updated}</p></div></div><p className="text-sm font-bold text-[#303030]">{money.format(account.amount)}</p></div>)}</div>
        <Link href="/integrations" className="mt-5 flex items-center justify-between rounded-xl bg-[#F5F5F7] px-4 py-3 text-sm font-semibold text-[#3629B7]">Добавить ещё источник <ChevronRight className="h-4 w-4" /></Link>
      </section>
      <section className="rounded-2xl border border-[#E5E5EA] bg-[#3629B7] p-5 text-white md:p-6"><div className="flex items-center gap-2 text-white/70"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Запас без зарплаты</span></div><p className="mt-5 text-4xl font-bold">{reserveMonths} мес.</p><p className="mt-2 text-sm leading-relaxed text-white/70">При обязательных расходах 70 662 ₽ в месяц. Это ориентир, а не обещание.</p><Link href="#what-if" onClick={(event) => { event.preventDefault(); }} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-white/80">Проверить сценарий <ArrowRight className="h-4 w-4" /></Link></section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><SectionTitle icon={ReceiptText} title="Ближайшие обязательства" action="Показать всё" /><div className="mt-4 space-y-3"><Row label="Кредитный платёж" detail="15 октября" value="10 662 ₽" /><Row label="Обязательные расходы" detail="до конца месяца" value="60 000 ₽" /></div></section>
      <section className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><SectionTitle icon={Target} title="Деньги без назначения" action="Назначить" /><p className="mt-4 text-2xl font-bold text-[#303030]">{money.format(available)}</p><p className="mt-1 text-sm text-[#8E8E93]">Вы ещё не назначили этим деньгам цель.</p><button onClick={() => setSaved(!saved)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#E5E5EA] px-3 py-2 text-sm font-semibold text-[#3629B7]">{saved ? "План сохранён" : "Сохранить распределение"}</button></section>
    </div>
    <div className="flex items-center gap-2 rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 text-xs text-[#8E8E93]"><CircleHelp className="h-4 w-4 shrink-0 text-[#3629B7]" /> Данные неполные: добавьте вклад и инвестиции вручную, чтобы расчёт был точнее.</div>
  </>;
}

function WhatIf({ withoutIncome, setWithoutIncome, optionalExpenses, setOptionalExpenses, result, saved, setSaved }: { withoutIncome: number; setWithoutIncome: (n: number) => void; optionalExpenses: number; setOptionalExpenses: (n: number) => void; result: number; saved: boolean; setSaved: (b: boolean) => void }) {
  return <section id="what-if" className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-wider text-[#3629B7]">Сценарий</p><h2 className="mt-2 text-2xl font-bold text-[#303030]">Что будет, если…</h2><p className="mt-2 text-sm leading-relaxed text-[#8E8E93]">Измените доходы или расходы и посмотрите, как это повлияет на доступные деньги.</p><label className="mt-7 block text-sm font-semibold text-[#303030]">Зарплаты не будет</label><div className="mt-2 flex items-center gap-3"><input type="range" min="1" max="12" value={withoutIncome} onChange={(e) => setWithoutIncome(Number(e.target.value))} className="w-full accent-[#3629B7]" /><span className="w-16 rounded-lg bg-[#F5F5F7] px-2 py-2 text-center text-sm font-bold">{withoutIncome} мес.</span></div><label className="mt-6 block text-sm font-semibold text-[#303030]">Необязательные расходы</label><div className="mt-2 flex items-center gap-3"><input type="range" min="0" max="50000" step="5000" value={optionalExpenses} onChange={(e) => setOptionalExpenses(Number(e.target.value))} className="w-full accent-[#3629B7]" /><span className="w-24 rounded-lg bg-[#F5F5F7] px-2 py-2 text-center text-sm font-bold">{money.format(optionalExpenses)}</span></div><button onClick={() => setSaved(!saved)} className="mt-8 w-full rounded-xl bg-[#3629B7] px-4 py-3 text-sm font-semibold text-white">{saved ? "Сценарий сохранён" : "Сохранить сценарий"}</button></div><div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#8E8E93]">После выбранного периода</p><p className={`mt-2 text-4xl font-bold ${result < 0 ? "text-[#FF3B30]" : "text-[#34C759]"}`}>{money.format(Math.max(0, result))}</p></div><CalendarDays className="h-8 w-8 text-[#3629B7]" /></div><div className="mt-8 rounded-xl bg-[#F5F5F7] p-4"><p className="text-sm font-semibold text-[#303030]">{result < 0 ? "На выбранный план не хватает денег" : "Обязательные платежи покрываются"}</p><p className="mt-1 text-sm leading-relaxed text-[#8E8E93]">Расчёт помесячный. Он показывает направление и не определяет точный день нехватки.</p></div><div className="mt-6 space-y-3"><Row label="На начало плана" detail="доступные счета" value={money.format(200000)} /><Row label="Потерянный доход" detail={`${withoutIncome} месяца`} value={`−${money.format(120000 * withoutIncome)}`} /><Row label="Расходы за период" detail="обязательные и выбранные" value={`−${money.format((60000 + 10662 + optionalExpenses) * withoutIncome)}`} /></div><button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#3629B7]">Показать расчёт <ArrowRight className="h-4 w-4" /></button></div></section>;
}

function Plan() { return <div className="grid gap-4 lg:grid-cols-2">{goals.map((goal) => <section key={goal.name} className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><div className="flex justify-between"><div><p className="text-lg font-bold text-[#303030]">{goal.name}</p><p className="mt-1 text-sm text-[#8E8E93]">{money.format(goal.saved)} из {money.format(goal.target)}</p></div><Target className="h-5 w-5 text-[#3629B7]" /></div><div className="mt-5 h-2 rounded-full bg-[#F0F0F2]"><div className={`${goal.tone} h-2 rounded-full`} style={{ width: `${Math.min(100, goal.saved / goal.target * 100)}%` }} /></div><p className="mt-3 text-xs text-[#8E8E93]">Осталось {money.format(goal.target - goal.saved)}</p></section>)}</div>; }
function Learn() { return <div className="grid gap-4 md:grid-cols-3">{[{ title: "Как собрать резерв", text: "Сначала отделите обязательные расходы от желаемых и посчитайте запас по месяцам." }, { title: "Что такое доступные деньги", text: "Это подтверждённые суммы, которыми можно воспользоваться без продажи активов." }, { title: "Как читать ставку", text: "Сравнивайте результат за одинаковый срок и проверяйте условия снятия." }].map((item) => <article key={item.title} className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><div className="mb-4 inline-flex rounded-xl bg-[#F0EEFF] p-2.5 text-[#3629B7]"><CircleHelp className="h-5 w-5" /></div><h2 className="text-lg font-bold text-[#303030]">{item.title}</h2><p className="mt-2 text-sm leading-relaxed text-[#8E8E93]">{item.text}</p><button className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#3629B7]">Разобраться <ArrowRight className="h-4 w-4" /></button></article>)}</div>; }
function Metric({ icon: Icon, label, value, hint, tone }: { icon: typeof Wallet; label: string; value: string; hint: string; tone: string }) { const tones: Record<string, string> = { purple: "bg-[#F0EEFF] text-[#3629B7]", green: "bg-[#EAF8EE] text-[#238B45]", blue: "bg-[#EAF4FF] text-[#1670C5]", orange: "bg-[#FFF3E5] text-[#C76B00]" }; return <div className="rounded-2xl border border-[#E5E5EA] bg-white p-4"><div className="flex items-center gap-2"><div className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></div><span className="text-xs font-medium text-[#8E8E93]">{label}</span></div><p className="mt-4 text-2xl font-bold tracking-tight text-[#303030]">{value}</p><p className="mt-1 text-xs leading-relaxed text-[#8E8E93]">{hint}</p></div>; }
function SectionTitle({ icon: Icon, title, action }: { icon: typeof Wallet; title: string; action: string }) { return <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#3629B7]" /><h2 className="text-base font-bold text-[#303030]">{title}</h2></div><button className="text-xs font-semibold text-[#3629B7]">{action}</button></div>; }
function Row({ label, detail, value }: { label: string; detail: string; value: string }) { return <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-[#303030]">{label}</p><p className="text-xs text-[#8E8E93]">{detail}</p></div><p className="text-sm font-semibold text-[#303030]">{value}</p></div>; }
