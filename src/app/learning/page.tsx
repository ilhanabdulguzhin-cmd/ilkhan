"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronRight, Trophy, Zap } from "lucide-react";

const lessons: Array<[string, string, string, string, number]> = [
  ["budget-50-30-20", "Бюджет без скуки", "Как распределить зарплату и не потерять свободу", "7 мин", 40],
  ["emergency-fund", "Финансовая подушка", "Сколько откладывать на непредвиденные расходы", "6 мин", 35],
  ["credit-cards", "Кредитки без переплат", "Льготный период, минимальный платёж и реальные риски", "8 мин", 50],
  ["first-investment", "Первые инвестиции", "Вклады, ОФЗ и риск простыми словами", "10 мин", 60],
  ["scams", "Защита от мошенников", "5 признаков опасного звонка или сообщения", "5 мин", 30],
];
export default function LearningPage() {
  const [done, setDone] = useState<string[]>([]);
  const points = lessons.filter(([id]) => done.includes(id)).reduce((sum, l) => sum + Number(l[4]), 0);
  return <main className="min-h-screen bg-[#F5F5F7] px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/" className="text-sm font-medium text-[#3629B7]">← На главный экран</Link><div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[#3629B7]">Monetrix Academy</p><h1 className="mt-1 text-3xl font-bold text-[#303030]">Финансы, которые понятны</h1><p className="mt-2 max-w-xl text-[#8E8E93]">Короткие уроки для реальной жизни. Проходите в своём темпе и собирайте XP.</p></div><div className="flex gap-3"><div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><Trophy className="mb-1 h-5 w-5 text-[#FF9500]" /><p className="text-xl font-bold text-[#303030]">{points} XP</p></div><div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><Zap className="mb-1 h-5 w-5 text-[#34C759]" /><p className="text-xl font-bold text-[#303030]">Уровень {Math.max(1, Math.floor(points / 100) + 1)}</p></div></div></div><section className="mt-8 grid gap-3 md:grid-cols-2">{lessons.map(([id, title, desc, time, xp]) => { const completed = done.includes(id); return <article key={id} className="rounded-2xl border border-[#E5E5EA] bg-white p-5 transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3629B7]/10"><BookOpen className="h-5 w-5 text-[#3629B7]" /></div><span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-xs text-[#8E8E93]">{time} · +{xp} XP</span></div><h2 className="mt-4 font-bold text-[#303030]">{title}</h2><p className="mt-1 text-sm leading-6 text-[#8E8E93]">{desc}</p><button onClick={() => setDone((v) => completed ? v.filter((x) => x !== id) : [...v, id])} className={`mt-5 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${completed ? "bg-[#34C759]/10 text-[#238b3d]" : "bg-[#3629B7] text-white hover:bg-[#2a1f8f]"}`}>{completed ? <><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Пройдено</span><span>Повторить</span></> : <><span>Начать урок</span><ChevronRight className="h-4 w-4" /></>}</button></article> })}</section></div></main>;
}
