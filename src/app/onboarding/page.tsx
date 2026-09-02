"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, addAccount, addGoal } from "@/lib/user-store";
import type { UserSegment } from "@/lib/user-store";
import { parseVoiceProfile } from "@/lib/market-digest";
import { MonetrixIcon } from "@/components/monetrix-logo";
import { VoiceButton } from "@/components/voice-button";
import {
  ArrowRight, ArrowLeft, Target, TrendingUp,
  CreditCard, PiggyBank, Home, GraduationCap, Plane, CheckCircle2,
  Sparkles, Upload, X, User, Users, Briefcase,
  Car, Heart, Baby, Building2, MapPin,
  Zap, ChevronRight,
} from "lucide-react";

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "segment",  title: "Кто вы?",              subtitle: "Подберём советы под вашу ситуацию" },
  { id: "context",  title: "Расскажите о себе",     subtitle: "Пара вопросов для точности" },
  { id: "income",   title: "Доходы и расходы",      subtitle: "Только для вас — шифруется на устройстве" },
  { id: "goals",    title: "Ваши финансовые цели",  subtitle: "Выберите одну или несколько" },
  { id: "risk",     title: "Отношение к риску",     subtitle: "Определяет стратегию накоплений" },
  { id: "accounts", title: "Счета и балансы",       subtitle: "Необязательно — можно добавить позже" },
  { id: "ready",    title: "Monetrix готов!",       subtitle: "" },
];

const SEGMENTS = [
  { id: "solo" as UserSegment, label: "Живу один",              sublabel: "Личный бюджет",         icon: User,         color: "#3629B7", emoji: "👤", tips: ["Ненужные подписки", "Подушка", "Кешбэк"] },
  { id: "family" as UserSegment, label: "Семья / дети",         sublabel: "Семейный бюджет",        icon: Users,        color: "#34C759", emoji: "👨‍👩‍👧", tips: ["Ипотека 6%", "Пособия", "Совм. бюджет"] },
  { id: "entrepreneur" as UserSegment, label: "ИП / Бизнес",   sublabel: "Бизнес + личное",        icon: Briefcase,    color: "#FF9500", emoji: "💼", tips: ["Разделим личное/бизнес", "Вычеты ИП"] },
  { id: "solo" as UserSegment, label: "Студент",                sublabel: "Первые шаги",            icon: GraduationCap,color: "#007AFF", emoji: "🎓", tips: ["Первые накопления", "Карты без %"] },
];

const GOALS = [
  { id: "save",      label: "Подушка безопасности",  icon: PiggyBank,     color: "#34C759", desc: "3–6 мес расходов" },
  { id: "invest",    label: "Инвестировать",          icon: TrendingUp,    color: "#3629B7", desc: "ОФЗ, вклады, акции" },
  { id: "debt",      label: "Закрыть долги",          icon: CreditCard,    color: "#FF3B30", desc: "Быстрее, выгоднее" },
  { id: "home",      label: "Жильё / ипотека",        icon: Home,          color: "#FF9500", desc: "Купить или рефи" },
  { id: "car",       label: "Автомобиль",             icon: Car,           color: "#8B5CF6", desc: "Накопить или кредит" },
  { id: "education", label: "Образование",            icon: GraduationCap, color: "#007AFF", desc: "Своё или детей" },
  { id: "travel",    label: "Путешествия",            icon: Plane,         color: "#4a3dd4", desc: "Ближайшая поездка" },
  { id: "health",    label: "Здоровье / ДМС",         icon: Heart,         color: "#FF3B30", desc: "Страховка, лечение" },
  { id: "kids",      label: "На детей",               icon: Baby,          color: "#34C759", desc: "Образование, старт" },
  { id: "business",  label: "Свой проект",            icon: Building2,     color: "#FF9500", desc: "Стартовый капитал" },
  { id: "retire",    label: "Пенсия / НПФ",           icon: Sparkles,      color: "#8B5CF6", desc: "Долгосрочно" },
  { id: "freedom",   label: "Финансовая свобода",     icon: Zap,           color: "#3629B7", desc: "Пассивный доход" },
];

const RISK_PROFILES = [
  { id: "conservative" as const, label: "Консервативный", sublabel: "Без стресса", emoji: "🛡️", color: "#34C759",
    desc: "Вклады, накопительные счета, ОФЗ. Главное — не потерять.", expectedReturn: "13–16% в год" },
  { id: "moderate" as const,     label: "Сбалансированный", sublabel: "Рост + надёжность", emoji: "⚖️", color: "#FF9500",
    desc: "Вклады + дивидендные акции. Небольшие колебания допустимы.", expectedReturn: "15–22% в год" },
  { id: "aggressive" as const,   label: "Агрессивный", sublabel: "Максимум роста", emoji: "🚀", color: "#FF3B30",
    desc: "Акции, ETF, корп. облигации. Готовы к просадкам ради роста.", expectedReturn: "20%+ в год" },
];

const EMPLOYMENT_TYPES = [
  { id: "employee",     label: "Наёмный",     icon: "👔" },
  { id: "selfemployed", label: "Самозанятый", icon: "🧑‍💻" },
  { id: "entrepreneur", label: "ИП / Бизнес", icon: "🏢" },
  { id: "freelancer",   label: "Фрилансер",   icon: "💻" },
  { id: "retired",      label: "Пенсионер",   icon: "🎖️" },
  { id: "student",      label: "Студент",     icon: "🎓" },
];

const HOUSING_TYPES = [
  { id: "rent",    label: "Снимаю",       icon: "🔑" },
  { id: "mortgage",label: "Ипотека",      icon: "🏦" },
  { id: "own",     label: "Своя",         icon: "🏠" },
  { id: "parents", label: "У родителей", icon: "👪" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh, userData } = useAuth();
  const supabase = typeof window !== "undefined" ? createClient() : null;
  const [step, setStep] = useState(0);

  // Segment
  const [segment, setSegment] = useState<UserSegment | "">("");
  const [segIdx, setSegIdx] = useState(-1);

  // Context
  const [employment, setEmployment] = useState("");
  const [housing, setHousing] = useState("");
  const [hasCar, setHasCar] = useState<boolean | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [childrenCount, setChildrenCount] = useState("1");
  const [city, setCity] = useState("");

  // Income
  const [income, setIncome] = useState("");
  const [expRent, setExpRent] = useState("");
  const [expFood, setExpFood] = useState("");
  const [expTransport, setExpTransport] = useState("");
  const [expCredit, setExpCredit] = useState("");
  const [voiceRaw, setVoiceRaw] = useState("");
  const [voiceParsedCount, setVoiceParsedCount] = useState(0);

  // Goals
  const [goals, setGoals] = useState<string[]>([]);

  // Risk
  const [risk, setRisk] = useState<"conservative" | "moderate" | "aggressive" | "">("");

  // Accounts
  const [accounts, setAccounts] = useState([{ name: "", type: "bank", balance: "" }]);

  const totalSteps = STEPS.length;
  const cur = STEPS[step];
  const isLast = step === totalSteps - 1;

  const incomeNum = Number(income.replace(/\s/g, "")) || 0;
  const totalExp = [expRent, expFood, expTransport, expCredit]
    .map((v) => Number(v.replace(/\s/g, "")) || 0).reduce((a, b) => a + b, 0);
  const free = incomeNum - totalExp;
  const debtPct = incomeNum && expCredit ? Math.round((Number(expCredit.replace(/\s/g, "")) / incomeNum) * 100) : 0;

  // ── Voice confirm handler ─────────────────────────────────────────────────

  const handleVoiceConfirm = (text: string) => {
    setVoiceRaw(text);
    const p = parseVoiceProfile(text);
    setVoiceParsedCount(p.parsedFields.length);
    if (p.income) setIncome(String(p.income));
    if (p.rent) setExpRent(String(p.rent));
    if (p.food) setExpFood(String(p.food));
    if (p.transport) setExpTransport(String(p.transport));
    if (p.credit) setExpCredit(String(p.credit));
    if (p.housingType) setHousing(p.housingType);
    if (p.hasCar !== undefined) setHasCar(p.hasCar);
    if (p.hasChildren !== undefined) setHasChildren(p.hasChildren);
    if (p.childrenCount) setChildrenCount(String(p.childrenCount));
    if (p.city) setCity(p.city);
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const canNext = () => {
    if (cur.id === "segment") return segment !== "";
    if (cur.id === "income")  return income.trim() !== "" && !isNaN(Number(income.replace(/\s/g, "")));
    if (cur.id === "goals")   return goals.length > 0;
    if (cur.id === "risk")    return risk !== "";
    return true;
  };

  const save = () => {
    const inc = Number(income.replace(/\s/g, ""));
    updateProfile({
      segment: segment as UserSegment,
      monthlyIncome: inc,
      mainGoal: goals[0],
      mainGoals: goals,
      riskTolerance: risk as "conservative" | "moderate" | "aggressive",
      onboarded: true,
      hasChildren: hasChildren ?? undefined,
      childrenCount: hasChildren ? Number(childrenCount) : undefined,
      familySize: segment === "family" ? (hasChildren ? Number(childrenCount) + 2 : 2) : undefined,
      city: city || undefined,
      housingType: housing as "rent" | "own" | "mortgage" | "parents" || undefined,
      hasCar: hasCar ?? undefined,
      employmentType: employment as "employee" | "selfemployed" | "entrepreneur" | "freelancer" | "retired" | "student" || undefined,
      monthlyRent: expRent ? Number(expRent.replace(/\s/g, "")) : undefined,
      monthlyFood: expFood ? Number(expFood.replace(/\s/g, "")) : undefined,
      monthlyTransport: expTransport ? Number(expTransport.replace(/\s/g, "")) : undefined,
      monthlyCredit: expCredit ? Number(expCredit.replace(/\s/g, "")) : undefined,
    });
    for (const acc of accounts) {
      if (acc.name.trim()) {
        addAccount({ name: acc.name, type: acc.type as "bank" | "broker" | "wallet" | "cash", balance: Number(acc.balance.replace(/\s/g, "")) || 0, currency: "RUB" });
      }
    }
    const goalLabel = GOALS.find((g) => g.id === goals[0])?.label || "Цель";
    addGoal({ name: goalLabel, targetAmount: inc * 6, currentAmount: 0, deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], currency: "RUB" });
    if (supabase && userData) {
      void supabase.from("profiles").upsert({ id: userData.id, display_name: userData.user_metadata?.display_name || "", segment, birth_year: undefined, onboarding_completed: true, updated_at: new Date().toISOString() });
      for (const acc of accounts) if (acc.name.trim()) void supabase.from("financial_accounts").insert({ user_id: userData.id, provider: "manual", account_name: acc.name, account_type: acc.type, balance: Number(acc.balance.replace(/\s/g, "")) || 0, currency: "RUB", last_synced_at: new Date().toISOString() });
    }
    refresh();
  };

  const next = () => {
    if (cur.id === "accounts") save();
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F0F8] to-[#E8E8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-[580px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-7">
          <MonetrixIcon size={36} />
          <span className="text-2xl font-bold tracking-tight text-[#303030]">monetrix</span>
        </div>

        {/* Progress */}
        {!isLast && (
          <div className="mb-5">
            <div className="flex gap-1.5 mb-2">
              {STEPS.slice(0, -1).map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full bg-[#E5E5EA] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] transition-all duration-500"
                    style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <p className="text-xs text-[#8E8E93]">Шаг {step + 1} из {totalSteps - 1}</p>
              <p className="text-xs font-medium text-[#3629B7]">{cur.title}</p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden">
          {!isLast && (
            <div className="px-6 pt-5 pb-4 border-b border-[#F5F5F7]">
              <h2 className="text-xl font-bold text-[#303030]">{cur.title}</h2>
              {cur.subtitle && <p className="text-sm text-[#8E8E93] mt-0.5">{cur.subtitle}</p>}
            </div>
          )}

          <div className="p-6">

            {/* SEGMENT */}
            {cur.id === "segment" && (
              <div className="grid grid-cols-2 gap-3">
                {SEGMENTS.map((seg, idx) => (
                  <button key={idx} onClick={() => { setSegment(seg.id); setSegIdx(idx); }}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${segIdx === idx ? "border-[#3629B7] bg-[#3629B7]/5 shadow-sm" : "border-[#E5E5EA] hover:border-[#3629B7]/30 hover:bg-[#F5F5F7]"}`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${seg.color}15` }}>
                        {seg.emoji}
                      </div>
                      {segIdx === idx && <CheckCircle2 className="w-4 h-4 text-[#3629B7]" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#303030]">{seg.label}</p>
                      <p className="text-xs text-[#8E8E93] mt-0.5">{seg.sublabel}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {seg.tips.map((t, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F5F5F7] text-[#8E8E93]">{t}</span>)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* CONTEXT */}
            {cur.id === "context" && (
              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2 block">Занятость</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {EMPLOYMENT_TYPES.map((e) => (
                      <button key={e.id} onClick={() => setEmployment(e.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${employment === e.id ? "border-[#3629B7] bg-[#3629B7]/5" : "border-[#E5E5EA] hover:border-[#3629B7]/20 hover:bg-[#F5F5F7]"}`}>
                        <span className="text-xl">{e.icon}</span>
                        <span className="text-[10px] font-medium text-[#303030] text-center leading-tight">{e.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2 block">Жильё</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {HOUSING_TYPES.map((h) => (
                      <button key={h.id} onClick={() => setHousing(h.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${housing === h.id ? "border-[#3629B7] bg-[#3629B7]/5" : "border-[#E5E5EA] hover:border-[#3629B7]/20 hover:bg-[#F5F5F7]"}`}>
                        <span className="text-xl">{h.icon}</span>
                        <span className="text-[10px] font-medium text-[#303030] text-center">{h.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2 block">Автомобиль</Label>
                    <div className="flex gap-2">
                      {[["Есть 🚗", true], ["Нет", false]].map(([lbl, v]) => (
                        <button key={String(v)} onClick={() => setHasCar(v as boolean)}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${hasCar === v ? "border-[#3629B7] bg-[#3629B7]/5 text-[#3629B7]" : "border-[#E5E5EA] text-[#8E8E93]"}`}>
                          {lbl as string}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2 block">Дети</Label>
                    <div className="flex gap-2">
                      {[["Есть 👶", true], ["Нет", false]].map(([lbl, v]) => (
                        <button key={String(v)} onClick={() => setHasChildren(v as boolean)}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${hasChildren === v ? "border-[#3629B7] bg-[#3629B7]/5 text-[#3629B7]" : "border-[#E5E5EA] text-[#8E8E93]"}`}>
                          {lbl as string}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {hasChildren && (
                  <div>
                    <Label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2 block">Детей</Label>
                    <div className="flex gap-2">
                      {["1", "2", "3", "4+"].map((n) => (
                        <button key={n} onClick={() => setChildrenCount(n === "4+" ? "4" : n)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${childrenCount === (n === "4+" ? "4" : n) ? "border-[#3629B7] bg-[#3629B7]/5 text-[#3629B7]" : "border-[#E5E5EA] text-[#8E8E93]"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Город <span className="normal-case font-normal">(необязательно)</span>
                  </Label>
                  <Input placeholder="Москва, Казань, Екатеринбург..."
                    value={city} onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA] text-sm" />
                </div>
                <p className="text-[10px] text-[#C7C7CC] text-center">Все поля необязательны</p>
              </div>
            )}

            {/* INCOME */}
            {cur.id === "income" && (
              <div className="space-y-4">
                {/* Voice banner */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#3629B7]/6 border border-[#3629B7]/15">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#3629B7]">🎤 Скажите всё голосом</p>
                    <p className="text-[10px] text-[#3629B7]/70 mt-0.5">«Зарабатываю 120 тысяч, аренда 35, еда 20, транспорт 5 тысяч»</p>
                  </div>
                  <VoiceButton onConfirm={handleVoiceConfirm} size="lg" variant="primary" />
                </div>

                {voiceRaw && voiceParsedCount > 0 && (
                  <div className="p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                      <p className="text-xs font-bold text-[#34C759]">{voiceParsedCount} полей заполнено из голоса</p>
                    </div>
                    <p className="text-xs text-[#8E8E93] italic">&laquo;{voiceRaw}&raquo;</p>
                  </div>
                )}

                {/* Income amount */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-[#303030]">Доход на руки в месяц *</Label>
                  <div className="relative">
                    <Input type="text" inputMode="numeric" placeholder="150 000"
                      value={income} onChange={(e) => setIncome(e.target.value.replace(/[^\d\s]/g, ""))}
                      className="h-14 text-2xl font-black text-center rounded-xl bg-[#F5F5F7] border-[#E5E5EA] focus-visible:ring-[#3629B7]/30 pr-12" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-[#8E8E93] font-bold">₽</span>
                  </div>
                </div>

                {/* Expense grid */}
                <div>
                  <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">Основные расходы <span className="normal-case font-normal">(необязательно)</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "🏠 Аренда / ипотека", val: expRent,      set: setExpRent,      ph: "40 000" },
                      { label: "🛒 Еда и продукты",   val: expFood,      set: setExpFood,      ph: "20 000" },
                      { label: "🚗 Транспорт",         val: expTransport, set: setExpTransport, ph: "8 000" },
                      { label: "💳 Кредиты",           val: expCredit,    set: setExpCredit,    ph: "15 000" },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-[10px] text-[#8E8E93] font-medium">{label}</Label>
                        <div className="relative">
                          <Input type="text" inputMode="numeric" placeholder={ph} value={val}
                            onChange={(e) => set(e.target.value.replace(/[^\d\s]/g, ""))}
                            className="h-10 text-sm rounded-xl bg-[#F5F5F7] border-[#E5E5EA] pr-7" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">₽</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget preview */}
                {incomeNum > 0 && totalExp > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-2.5">
                    <p className="text-xs font-bold text-[#303030]">📊 Анализ бюджета:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-[#E5E5EA] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF9500] transition-all"
                          style={{ width: `${Math.min(100, totalExp / incomeNum * 100)}%` }} />
                      </div>
                      <span className="text-xs text-[#8E8E93] w-8 text-right">{Math.round(totalExp / incomeNum * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-[#8E8E93]">Расходы: </span><span className="font-bold">{totalExp.toLocaleString("ru-RU")} ₽</span></div>
                      <div><span className="text-[#8E8E93]">Остаток: </span>
                        <span className={`font-bold ${free < 0 ? "text-[#FF3B30]" : free < incomeNum * 0.1 ? "text-[#FF9500]" : "text-[#34C759]"}`}>
                          {free.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                      {debtPct > 0 && (
                        <div className="col-span-2">
                          <span className="text-[#8E8E93]">Долговая нагрузка: </span>
                          <span className={`font-bold ${debtPct > 50 ? "text-[#FF3B30]" : debtPct > 30 ? "text-[#FF9500]" : "text-[#34C759]"}`}>
                            {debtPct}% {debtPct > 50 ? "⚠️ критично" : debtPct > 30 ? "— умеренно" : "— норма ✓"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GOALS — multi-select */}
            {cur.id === "goals" && (
              <div className="space-y-3">
                <p className="text-xs text-[#8E8E93]">
                  Выбрано: <strong className="text-[#3629B7]">{goals.length}</strong>
                  {goals.length > 0 && <> {goals.length === 1 ? "цель" : goals.length < 5 ? "цели" : "целей"}</>}
                  {" "}— можно выбрать несколько
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => {
                    const sel = goals.includes(g.id);
                    return (
                      <button key={g.id}
                        onClick={() => setGoals((prev) => prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id])}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${sel ? "border-[#3629B7] bg-[#3629B7]/5 shadow-sm" : "border-[#E5E5EA] hover:border-[#3629B7]/30 hover:bg-[#F5F5F7]"}`}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${g.color}18` }}>
                          <g.icon style={{ color: g.color, width: 18, height: 18 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#303030] leading-tight">{g.label}</p>
                          <p className="text-[9px] text-[#8E8E93] mt-0.5">{g.desc}</p>
                        </div>
                        {sel && <CheckCircle2 className="w-3.5 h-3.5 text-[#3629B7] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RISK */}
            {cur.id === "risk" && (
              <div className="space-y-3">
                {RISK_PROFILES.map((r) => (
                  <button key={r.id} onClick={() => setRisk(r.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${risk === r.id ? "border-[#3629B7] bg-[#3629B7]/5 shadow-sm" : "border-[#E5E5EA] hover:border-[#3629B7]/30 hover:bg-[#F5F5F7]"}`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${r.color}15` }}>
                      {r.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-[#303030]">{r.label}</span>
                        <span className="text-xs text-[#8E8E93]">— {r.sublabel}</span>
                        {risk === r.id && <CheckCircle2 className="w-4 h-4 text-[#3629B7] ml-auto" />}
                      </div>
                      <p className="text-xs text-[#8E8E93] leading-relaxed">{r.desc}</p>
                      <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${r.color}15`, color: r.color }}>
                        {r.expectedReturn}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ACCOUNTS */}
            {cur.id === "accounts" && (
              <div className="space-y-3">
                <p className="text-xs text-[#8E8E93] text-center">Данные хранятся только на вашем устройстве, шифруются AES-256.</p>
                {accounts.map((acc, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8E8E93]">Счёт {i + 1}</span>
                      {accounts.length > 1 && (
                        <button onClick={() => setAccounts((p) => p.filter((_, idx) => idx !== i))}
                          className="p-1 rounded hover:bg-[#FF3B30]/10 text-[#8E8E93] hover:text-[#FF3B30]">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Input placeholder="Сбербанк, Т-Банк, Наличные..."
                      value={acc.name} onChange={(e) => setAccounts((p) => p.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))}
                      className="h-10 rounded-lg bg-white border-[#E5E5EA] text-sm" />
                    <div className="flex gap-2">
                      <select value={acc.type} onChange={(e) => setAccounts((p) => p.map((a, idx) => idx === i ? { ...a, type: e.target.value } : a))}
                        className="h-10 px-3 rounded-lg border border-[#E5E5EA] bg-white text-sm flex-1 text-[#303030]">
                        <option value="bank">Банковская карта</option>
                        <option value="broker">Брокерский счёт</option>
                        <option value="wallet">Кошелёк</option>
                        <option value="cash">Наличные</option>
                      </select>
                      <div className="relative flex-1">
                        <Input placeholder="Баланс" value={acc.balance}
                          onChange={(e) => setAccounts((p) => p.map((a, idx) => idx === i ? { ...a, balance: e.target.value.replace(/[^\d\s.-]/g, "") } : a))}
                          className="h-10 rounded-lg bg-white border-[#E5E5EA] pr-8 text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">₽</span>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setAccounts((p) => [...p, { name: "", type: "bank", balance: "" }])}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#E5E5EA] text-sm text-[#8E8E93] hover:border-[#3629B7]/30 hover:text-[#3629B7] transition-colors">
                  + Добавить счёт
                </button>
              </div>
            )}

            {/* READY */}
            {cur.id === "ready" && (
              <div className="text-center space-y-5 py-3">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-[#3629B7]/15 animate-ping" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] flex items-center justify-center shadow-xl shadow-[#3629B7]/30">
                    <MonetrixIcon size={44} white />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-[#303030] mb-2">Monetrix готов!</h3>
                  <p className="text-sm text-[#8E8E93] leading-relaxed max-w-[320px] mx-auto">
                    {segment === "family" ? "Семейные льготы, ипотека 6% и план накоплений — уже персонализированы под вас."
                    : segment === "entrepreneur" ? "Разделили личное и бизнес. Налоговые вычеты ИП уже в рекомендациях."
                    : goals.includes("debt") ? "Построим план закрытия долгов и освободим деньги."
                    : goals.includes("invest") ? "Подберём вклады, ОФЗ и инвест-инструменты под ваш риск-профиль."
                    : "Советы, продукты и аналитика — персонализированы под вас."}
                  </p>
                </div>

                {goals.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {goals.slice(0, 4).map((gid) => {
                      const g = GOALS.find((x) => x.id === gid);
                      return g ? (
                        <span key={gid} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                          style={{ backgroundColor: `${g.color}12`, borderColor: `${g.color}30`, color: g.color }}>
                          <g.icon style={{ width: 12, height: 12 }} /> {g.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Upload, label: "Загрузить данные", color: "#3629B7", path: "/upload" },
                    { icon: Sparkles, label: "Спросить Кэшика", color: "#34C759", path: "/ai-consultant" },
                    { icon: Target, label: "Дашборд", color: "#FF9500", path: "/" },
                  ].map(({ icon: Icon, label, color, path }) => (
                    <button key={label} onClick={() => router.push(path)}
                      className="p-3 rounded-xl border border-[#E5E5EA] hover:bg-[#F5F5F7] transition-all text-center group">
                      <Icon className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" style={{ color }} />
                      <p className="text-[10px] text-[#8E8E93] font-medium leading-tight">{label}</p>
                    </button>
                  ))}
                </div>

                <Button onClick={() => router.push("/dashboard")}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] text-white font-black text-base shadow-lg shadow-[#3629B7]/25">
                  Открыть дашборд <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        {!isLast && (
          <div className="flex items-center justify-between mt-5">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}
              className="text-sm text-[#8E8E93] hover:text-[#303030]">
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>

            <div className="flex items-center gap-3">
              {(cur.id === "context" || cur.id === "accounts") && (
                <button onClick={next} className="text-sm text-[#8E8E93] hover:text-[#3629B7] transition-colors">
                  Пропустить
                </button>
              )}
              <Button onClick={next} disabled={!canNext()}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] text-white font-bold shadow-md shadow-[#3629B7]/20 disabled:opacity-40">
                {cur.id === "accounts" ? "Завершить" : "Далее"} <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
