"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/components/auth-provider";
import { addDebt, deleteDebt, type UserDebt } from "@/lib/user-store";
import Link from "next/link";
import {
  CreditCard,
  Home,
  Car,
  Calculator,
  Lightbulb,
  Plus,
  X,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Wallet,
  Shield,
  PiggyBank,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const debtIcons: Record<string, React.ElementType> = {
  mortgage: Home,
  credit_card: CreditCard,
  auto: Car,
  consumer: CreditCard,
};

const debtLabels: Record<string, string> = {
  mortgage: "Ипотека",
  credit_card: "Кредитная карта",
  auto: "Автокредит",
  consumer: "Потребительский",
};

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

function generatePaymentSchedule(balance: number, rate: number, monthly: number) {
  const result = [];
  let remaining = balance;
  const monthlyRate = rate / 100 / 12;
  for (let i = 1; i <= 24 && remaining > 0; i++) {
    const interest = remaining * monthlyRate;
    const principal = Math.min(monthly - interest, remaining);
    remaining = Math.max(0, remaining - principal);
    result.push({
      month: `М${i}`,
      balance: Math.round(remaining),
      interest: Math.round(interest),
      principal: Math.round(Math.max(0, principal)),
    });
  }
  return result;
}

// Real amortization: sum all interest payments over remaining term
function calcOverpayment(balance: number, rate: number, months: number, monthly: number): number {
  if (rate <= 0) return 0;
  const monthlyRate = rate / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  for (let i = 0; i < months && remaining > 0; i++) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    const principal = Math.min(monthly - interest, remaining);
    if (principal <= 0) break;
    remaining -= principal;
  }
  return Math.max(0, Math.round(totalInterest));
}

// Real early payoff: calculate months saved + interest saved with extra payment
function calcExtraPayment(balance: number, rate: number, monthly: number, extra: number): { monthsSaved: number; interestSaved: number } {
  if (rate <= 0 || monthly <= 0) return { monthsSaved: 0, interestSaved: 0 };
  const monthlyRate = rate / 100 / 12;

  const calcMonthsAndInterest = (pmt: number) => {
    let rem = balance;
    let months = 0;
    let totalInterest = 0;
    while (rem > 0 && months < 600) {
      const interest = rem * monthlyRate;
      totalInterest += interest;
      const principal = Math.min(pmt - interest, rem);
      if (principal <= 0) break;
      rem -= principal;
      months++;
    }
    return { months, totalInterest };
  };

  const base = calcMonthsAndInterest(monthly);
  const boosted = calcMonthsAndInterest(monthly + extra);
  return {
    monthsSaved: Math.max(0, base.months - boosted.months),
    interestSaved: Math.max(0, Math.round(base.totalInterest - boosted.totalInterest)),
  };
}

export default function DebtOptimizerPage() {
  const { userData, refresh } = useAuth();
  const debts = userData?.debts || [];
  const [extraPayment, setExtraPayment] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newDebt, setNewDebt] = useState({
    name: "",
    type: "consumer" as UserDebt["type"],
    balance: "",
    rate: "",
    monthlyPayment: "",
    remainingMonths: "",
  });

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0);
  const totalOverpayment = debts.reduce(
    (s, d) => s + calcOverpayment(d.balance, d.rate, d.remainingMonths, d.monthlyPayment),
    0
  );

  const monthlyIncome = userData?.profile?.monthlyIncome || 0;
  const debtLoad = monthlyIncome > 0 ? Math.round((totalMonthly / monthlyIncome) * 100) : 0;

  // Refinancing suggestion for most expensive debt
  const expensiveDebt = [...debts].sort((a, b) => b.rate - a.rate)[0];
  const refinanceRate = expensiveDebt ? Math.max(8, expensiveDebt.rate - 10) : 0;

  const scheduleDebt = debts[0];
  const scheduleData = scheduleDebt
    ? generatePaymentSchedule(
        scheduleDebt.balance,
        scheduleDebt.rate,
        scheduleDebt.monthlyPayment + extraPayment
      )
    : [];

  const handleAdd = () => {
    const balance = Number(newDebt.balance.replace(/\s/g, "")) || 0;
    const rate = Number(newDebt.rate.replace(",", ".")) || 0;
    const monthlyPayment = Number(newDebt.monthlyPayment.replace(/\s/g, "")) || 0;
    const remainingMonths = Number(newDebt.remainingMonths) || 12;
    if (!newDebt.name.trim() || balance <= 0) return;

    addDebt({
      name: newDebt.name,
      type: newDebt.type,
      balance,
      rate,
      monthlyPayment,
      remainingMonths,
      currency: "RUB",
    });
    refresh();
    setNewDebt({ name: "", type: "consumer", balance: "", rate: "", monthlyPayment: "", remainingMonths: "" });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    deleteDebt(id);
    refresh();
  };

  if (debts.length === 0 && !showAdd) {
    return (
      <AppShell>
        <div className="max-w-[700px] mx-auto py-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#3629B7]/10 to-[#4a3dd4]/10 flex items-center justify-center mb-6 border border-[#3629B7]/10">
              <CreditCard className="w-9 h-9 text-[#3629B7]" />
            </div>
            <h2 className="text-2xl font-bold text-[#303030] mb-2">Кредиты и долги</h2>
            <p className="text-sm text-[#8E8E93] max-w-md mx-auto mb-2">
              Добавьте свои кредиты, ипотеку или долги по картам. Мы покажем, сколько вы переплачиваете, и подскажем, как платить меньше.
            </p>
            <p className="text-xs text-[#8E8E93] mb-8">
              Все данные остаются только на вашем устройстве
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="text-center p-5">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#3629B7]/10 flex items-center justify-center mb-3">
                <Calculator className="w-6 h-6 text-[#3629B7]" />
              </div>
              <p className="text-sm font-semibold text-[#303030] mb-1">Посчитаем переплату</p>
              <p className="text-xs text-[#8E8E93]">Узнайте, сколько денег уходит на проценты</p>
            </Card>
            <Card className="text-center p-5">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#34C759]/10 flex items-center justify-center mb-3">
                <Lightbulb className="w-6 h-6 text-[#34C759]" />
              </div>
              <p className="text-sm font-semibold text-[#303030] mb-1">Найдём экономию</p>
              <p className="text-xs text-[#8E8E93]">Подскажем, как закрыть долги быстрее</p>
            </Card>
            <Card className="text-center p-5">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#FF9500]/10 flex items-center justify-center mb-3">
                <PiggyBank className="w-6 h-6 text-[#FF9500]" />
              </div>
              <p className="text-sm font-semibold text-[#303030] mb-1">Составим план</p>
              <p className="text-xs text-[#8E8E93]">График платежей и стратегия погашения</p>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={() => setShowAdd(true)}
              className="bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] rounded-xl shadow-lg shadow-[#3629B7]/20 px-8"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить первый кредит
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1200px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#303030]">Кредиты и долги</h2>
            <p className="text-sm text-[#8E8E93] mt-1">
              Покажем, сколько вы переплачиваете, и подскажем, как платить меньше
            </p>
          </div>
          <Button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-[#3629B7] hover:bg-[#2a1f8f] rounded-xl shadow-md shadow-[#3629B7]/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить кредит
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <Card className="border-2 border-[#3629B7]/20 border-dashed">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3629B7]/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#3629B7]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Новый кредит</p>
                  <p className="text-xs text-[#8E8E93]">Укажите параметры вашего кредита</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8E8E93]">Название</Label>
                  <Input
                    placeholder="Например: Ипотека Сбербанк"
                    value={newDebt.name}
                    onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                    className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8E8E93]">Тип</Label>
                  <select
                    value={newDebt.type}
                    onChange={(e) => setNewDebt({ ...newDebt, type: e.target.value as UserDebt["type"] })}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-sm text-[#303030]"
                  >
                    <option value="mortgage">Ипотека</option>
                    <option value="consumer">Потребительский кредит</option>
                    <option value="credit_card">Кредитная карта</option>
                    <option value="auto">Автокредит</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8E8E93]">Остаток долга</Label>
                  <div className="relative">
                    <Input
                      placeholder="1 000 000"
                      value={newDebt.balance}
                      onChange={(e) => setNewDebt({ ...newDebt, balance: e.target.value.replace(/[^\d\s]/g, "") })}
                      className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA] pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">₽</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8E8E93]">Ставка годовых</Label>
                  <div className="relative">
                    <Input
                      placeholder="12.5"
                      value={newDebt.rate}
                      onChange={(e) => setNewDebt({ ...newDebt, rate: e.target.value.replace(/[^\d.,]/g, "") })}
                      className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA] pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8E8E93]">Ежемесячный платёж</Label>
                  <div className="relative">
                    <Input
                      placeholder="25 000"
                      value={newDebt.monthlyPayment}
                      onChange={(e) => setNewDebt({ ...newDebt, monthlyPayment: e.target.value.replace(/[^\d\s]/g, "") })}
                      className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA] pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">₽</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8E8E93]">Осталось месяцев</Label>
                  <Input
                    placeholder="36"
                    value={newDebt.remainingMonths}
                    onChange={(e) => setNewDebt({ ...newDebt, remainingMonths: e.target.value.replace(/\D/g, "") })}
                    className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!newDebt.name.trim()} className="bg-[#3629B7] hover:bg-[#2a1f8f] rounded-xl">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-[#8E8E93]">
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {debts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-[#FF3B30]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-[#FF3B30]" />
                    <p className="text-sm text-[#8E8E93]">Общий долг</p>
                  </div>
                  <p className="text-2xl font-bold text-[#303030]">{fmt(totalDebt)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-[#3629B7]" />
                    <p className="text-sm text-[#8E8E93]">Платежи в месяц</p>
                  </div>
                  <p className="text-2xl font-bold text-[#303030]">{fmt(totalMonthly)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-[#FF3B30]" />
                    <p className="text-sm text-[#8E8E93]">Переплата</p>
                  </div>
                  <p className="text-2xl font-bold text-[#FF3B30]">{fmt(totalOverpayment)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#FF9500]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-[#FF9500]" />
                    <p className="text-sm text-[#8E8E93]">Долговая нагрузка</p>
                  </div>
                  <p className="text-2xl font-bold text-[#303030]">{debtLoad}%</p>
                  <p className="text-xs text-[#FF9500]">{debtLoad > 25 ? "Лучше не больше 25%" : "В пределах нормы"}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="debts">
              <TabsList>
                <TabsTrigger value="debts">Мои кредиты</TabsTrigger>
                <TabsTrigger value="optimize">Как платить меньше</TabsTrigger>
                {scheduleDebt && <TabsTrigger value="schedule">График платежей</TabsTrigger>}
              </TabsList>

              <TabsContent value="debts" className="mt-4 space-y-4">
                {debts.map((d) => {
                  const Icon = debtIcons[d.type] || CreditCard;
                  const overpay = calcOverpayment(d.balance, d.rate, d.remainingMonths, d.monthlyPayment);
                  return (
                    <Card key={d.id} className="group hover:border-[#3629B7]/20 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#3629B7]/10 flex items-center justify-center shrink-0">
                            <Icon className="w-6 h-6 text-[#3629B7]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-[#303030]">{d.name}</h3>
                                <p className="text-xs text-[#8E8E93]">
                                  {debtLabels[d.type]} &middot; Ставка {d.rate}% &middot; Осталось {d.remainingMonths} мес
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-[#303030]">{fmt(d.balance)}</p>
                                  <p className="text-xs text-[#8E8E93]">Платёж: {fmt(d.monthlyPayment)}/мес</p>
                                </div>
                                <button
                                  onClick={() => handleDelete(d.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FF3B30]/10 text-[#8E8E93] hover:text-[#FF3B30] transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                              <div>
                                <p className="text-xs text-[#8E8E93]">Переплата</p>
                                <p className="font-semibold text-[#FF3B30]">{fmt(overpay)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[#8E8E93]">Осталось</p>
                                <p className="font-medium text-[#303030]">
                                  {Math.floor(d.remainingMonths / 12) > 0 && `${Math.floor(d.remainingMonths / 12)} г `}
                                  {d.remainingMonths % 12} мес
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-[#8E8E93]">Всего к выплате</p>
                                <p className="font-medium text-[#303030]">{fmt(d.balance + overpay)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="optimize" className="mt-4 space-y-4">
                {/* Refinancing suggestion */}
                {expensiveDebt && expensiveDebt.rate > 15 && (
                  <Card className="border-l-4 border-l-[#34C759]">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-[#34C759] mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-[#303030] mb-1">
                            Можно сэкономить на «{expensiveDebt.name}»
                          </h3>
                          <p className="text-sm text-[#8E8E93] mb-3">
                            Ставка {expensiveDebt.rate}% — это дорого. Если перевести в обычный кредит под ~{refinanceRate}%, вы заметно сэкономите на процентах.
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10">
                              <p className="text-xs text-[#8E8E93]">Сейчас переплата</p>
                              <p className="font-semibold text-[#FF3B30]">
                                {fmt(calcOverpayment(expensiveDebt.balance, expensiveDebt.rate, expensiveDebt.remainingMonths, expensiveDebt.monthlyPayment))}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-[#34C759]/5 border border-[#34C759]/10">
                              <p className="text-xs text-[#8E8E93]">Могло бы быть</p>
                              <p className="font-semibold text-[#34C759]">
                                {fmt(calcOverpayment(expensiveDebt.balance, refinanceRate, expensiveDebt.remainingMonths, expensiveDebt.monthlyPayment))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Extra payment simulation */}
                {scheduleDebt && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                        <Calculator className="w-4 h-4 text-[#3629B7]" />
                        А если платить больше каждый месяц?
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-[#8E8E93]">
                        Рассчитываем для: {scheduleDebt.name}
                      </p>
                      <div>
                        <p className="text-sm text-[#303030] mb-2">
                          Доп. платёж: <span className="font-semibold">{fmt(extraPayment)}</span>/мес
                        </p>
                        <Slider
                          value={[extraPayment]}
                          onValueChange={(v) => setExtraPayment(v[0])}
                          min={0}
                          max={Math.max(50000, scheduleDebt.monthlyPayment * 2)}
                          step={1000}
                        />
                        <div className="flex justify-between text-xs text-[#8E8E93] mt-1">
                          <span>0 ₽</span>
                          <span>{fmt(Math.max(50000, scheduleDebt.monthlyPayment * 2))}</span>
                        </div>
                      </div>
                      {extraPayment > 0 && (() => {
                        const { monthsSaved, interestSaved } = calcExtraPayment(
                          scheduleDebt.balance, scheduleDebt.rate, scheduleDebt.monthlyPayment, extraPayment
                        );
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[#34C759]/5 rounded-xl border border-[#34C759]/10">
                              <p className="text-xs text-[#8E8E93]">Закроете быстрее на</p>
                              <p className="text-lg font-bold text-[#34C759]">{monthsSaved} мес</p>
                              {monthsSaved >= 12 && (
                                <p className="text-[10px] text-[#34C759]">≈ {Math.floor(monthsSaved / 12)} г {monthsSaved % 12} мес</p>
                              )}
                            </div>
                            <div className="p-3 bg-[#34C759]/5 rounded-xl border border-[#34C759]/10">
                              <p className="text-xs text-[#8E8E93]">Экономия на процентах</p>
                              <p className="text-lg font-bold text-[#34C759]">{fmt(interestSaved)}</p>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-[#8E8E93] text-center">
                        Даже небольшая доплата сверх обязательного платежа экономит тысячи на процентах
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* General tips */}
                <Card className="border-l-4 border-l-[#007AFF]">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#007AFF] mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#303030] mb-2">Простые правила по кредитам</p>
                        <div className="space-y-1.5 text-xs text-[#8E8E93]">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                            Сначала закрывайте самый дорогой кредит (с самой высокой ставкой)
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                            Платежи по кредитам не должны превышать 25% от дохода
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                            Кредитную карту лучше закрывать полностью до льготного периода
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {scheduleDebt && (
                <TabsContent value="schedule" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-[#303030]">
                        График платежей: {scheduleDebt.name} (24 мес)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={scheduleData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8E8E93" }} stroke="#E5E5EA" />
                            <YAxis tick={{ fontSize: 10, fill: "#8E8E93" }} stroke="#E5E5EA" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                            <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: 12, border: "1px solid #E5E5EA", fontSize: 13 }} />
                            <Bar dataKey="principal" stackId="a" fill="#3629B7" name="Основной долг" />
                            <Bar dataKey="interest" stackId="a" fill="#FF3B30" name="Проценты" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}
