"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Plus, Save, SlidersHorizontal } from "lucide-react";

const rubles = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

type Plan = { name: string; salary: number; flexible: number; oneOff: number };

type ScenarioPreset = Plan & { description: string };

const PRESETS: ScenarioPreset[] = [
  { name: "Потеря дохода на 3 месяца", salary: 120000, flexible: 20000, oneOff: 0, description: "Проверить, переживёт ли бюджет временную паузу в доходах." },
  { name: "Крупная покупка", salary: 120000, flexible: 20000, oneOff: 150000, description: "Понять, когда покупка не создаст кассовый разрыв." },
  { name: "Переезд", salary: 120000, flexible: 20000, oneOff: 250000, description: "Учесть залог, переезд и первые расходы на новом месте." },
];

function calculate(plan: Plan, months: number) {
  let balance = 200000;
  const rows = [];
  for (let month = 1; month <= months; month += 1) {
    const income = month >= 2 && month <= 4 ? 0 : plan.salary;
    const expenses = 60000 + plan.flexible + (month === 2 ? plan.oneOff : 0);
    const mandatory = 60000;
    const end = balance + income - expenses;
    rows.push({ month, income, expenses, mandatory, end, shortage: end < 0 ? Math.abs(end) : 0 });
    if (end < 0) break;
    balance = end;
  }
  return rows;
}

export default function WhatIfPage() {
  const [plan, setPlan] = useState<Plan>({ name: "Без зарплаты на 3 месяца", salary: 120000, flexible: 20000, oneOff: 0 });
  const [months, setMonths] = useState(12);
  const [saved, setSaved] = useState(false);
  const rows = useMemo(() => calculate(plan, months), [plan, months]);
  const firstShortage = rows.find((row) => row.shortage > 0);
  const lowestBalance = rows.length ? Math.min(...rows.map((row) => row.end)) : 0;
  const monthlyBurn = 60000 + plan.flexible;
  const runway = monthlyBurn > 0 ? Math.max(0, Math.floor(200000 / monthlyBurn)) : months;
  const selectedPreset = PRESETS.find((preset) => preset.name === plan.name);

  const update = (key: keyof Plan, value: string) => setPlan((current) => ({ ...current, [key]: key === "name" ? value : Math.max(0, Number(value) || 0) }));

  return (
    <AppShell>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-[#3629B7]">Сценарии</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#303030]">Что будет, если…</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#8E8E93]">Проверьте решение до того, как потратить деньги. Меняйте один параметр — сразу увидите запас и момент, когда понадобится план Б.</p>
          </div>
          <Button variant="outline" onClick={() => { setPlan({ name: "Новый сценарий", salary: 120000, flexible: 20000, oneOff: 0 }); setSaved(false); }}><Plus data-icon="inline-start" />Новый сценарий</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal />Условия сценария</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-[#8E8E93]">С чего начать</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <Button key={preset.name} type="button" size="sm" variant={plan.name === preset.name ? "secondary" : "outline"} onClick={() => { setPlan(preset); setSaved(false); }}>
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-[#8E8E93]">{selectedPreset?.description ?? "Назовите сценарий так, чтобы через месяц было понятно, что именно вы проверяли."}</p>
              </div>
              <div><Label htmlFor="scenario-name">Название сценария</Label><Input id="scenario-name" className="mt-1" value={plan.name} onChange={(event) => update("name", event.target.value)} /></div>
              <div><Label htmlFor="salary">Доход в обычный месяц</Label><Input id="salary" className="mt-1" inputMode="decimal" type="number" value={plan.salary} onChange={(event) => update("salary", event.target.value)} /><p className="mt-1 text-xs text-[#8E8E93]">Во 2–4 месяце доход временно равен нулю.</p></div>
              <div><Label htmlFor="flexible">Необязательные расходы в месяц</Label><Input id="flexible" className="mt-1" inputMode="decimal" type="number" value={plan.flexible} onChange={(event) => update("flexible", event.target.value)} /></div>
              <div><Label htmlFor="one-off">Разовая трата во 2 месяце</Label><Input id="one-off" className="mt-1" inputMode="decimal" type="number" value={plan.oneOff} onChange={(event) => update("oneOff", event.target.value)} /></div>
              <div><Label htmlFor="months">Горизонт, месяцев</Label><Input id="months" className="mt-1" min={1} max={24} type="number" value={months} onChange={(event) => setMonths(Math.min(24, Math.max(1, Number(event.target.value) || 1)))} /></div>
              <Button onClick={() => setSaved(true)}><Save data-icon="inline-start" />{saved ? "Сценарий сохранён" : "Сохранить сценарий"}</Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className={firstShortage ? "border-[#FF9500]/40" : "border-[#34C759]/30"}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">{firstShortage ? <AlertTriangle className="mt-0.5 text-[#FF9500]" /> : <CheckCircle2 className="mt-0.5 text-[#34C759]" />}<div><p className="font-bold text-[#303030]">{firstShortage ? `В месяце ${firstShortage.month} возникнет нехватка` : "Обязательные платежи покрываются"}</p><p className="mt-1 text-sm text-[#8E8E93]">{firstShortage ? `На выбранный план не хватает ${rubles(firstShortage.shortage)}. Это не банковский остаток.` : "При заданных условиях отрицательный остаток не возникает."}</p></div></div>
                <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(plan.name)}><Copy data-icon="inline-start" />Копировать</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Что показывает сценарий</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#F5F5F7] p-3"><p className="text-xs text-[#8E8E93]">Минимальный остаток</p><p className="mt-1 text-lg font-bold">{lowestBalance > 0 ? rubles(lowestBalance) : "Ниже нуля"}</p></div>
                <div className="rounded-xl bg-[#F5F5F7] p-3"><p className="text-xs text-[#8E8E93]">Расход без дохода</p><p className="mt-1 text-lg font-bold">{rubles(monthlyBurn)} / мес.</p></div>
                <div className="rounded-xl bg-[#F5F5F7] p-3"><p className="text-xs text-[#8E8E93]">Запаса сейчас</p><p className="mt-1 text-lg font-bold">{runway} мес.</p></div>
              </CardContent>
              <CardContent className="border-t pt-4"><p className="text-sm leading-relaxed text-[#5F5F65]">{firstShortage ? `Сначала решите проблему в месяце ${firstShortage.month}: сократите необязательные расходы, перенесите разовую покупку или добавьте резерв ${rubles(firstShortage.shortage)}.` : "Сценарий проходит без кассового разрыва. Это не значит, что покупка безопасна в любой момент: оставьте отдельный резерв на обязательные платежи."}</p></CardContent>
            </Card>

            <Card><CardHeader><CardTitle className="text-base">Помесячный расчёт</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead><tr className="border-b text-xs text-[#8E8E93]"><th className="pb-3">Месяц</th><th className="pb-3">Поступления</th><th className="pb-3">Выплаты</th><th className="pb-3">Остаток</th><th className="pb-3">Статус</th></tr></thead><tbody>{rows.map((row) => <tr key={row.month} className="border-b last:border-0"><td className="py-3 font-medium">{row.month}</td><td className="py-3">{rubles(row.income)}</td><td className="py-3">{rubles(row.expenses)}</td><td className="py-3 font-semibold">{row.end < 0 ? "Не рассчитан" : rubles(row.end)}</td><td className="py-3">{row.shortage ? <span className="font-semibold text-[#FF9500]">Нужно решение</span> : <span className="text-[#34C759]">Покрыто</span>}</td></tr>)}</tbody></table></div><p className="mt-4 flex items-center gap-2 text-xs text-[#8E8E93]"><ArrowRight className="size-3" />Модель помесячная: она показывает порядок величины, а не точный день нехватки.</p></CardContent></Card>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
