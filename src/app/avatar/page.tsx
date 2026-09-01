"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/components/auth-provider";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Target,
  Sparkles,
  Lightbulb,
  BarChart3,
  Wallet,
  Shield,
  Heart,
  PiggyBank,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";

export default function AvatarPage() {
  const { userData } = useAuth();
  const transactions = userData?.transactions || [];
  const accounts = userData?.accounts || [];
  const profile = userData?.profile;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const income = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  // Calculate scores based on real data
  const incomeScore = income > 0 ? Math.min(100, Math.round((income / 200000) * 100)) : 0;
  const savingsScore = savingsRate > 0 ? Math.min(100, savingsRate * 4) : 0;
  const diversityScore = Math.min(100, accounts.length * 25);
  const controlScore = transactions.length > 0 ? 70 : 20;
  const stabilityScore = income > expenses ? 80 : 40;
  const planningScore = (userData?.goals?.length || 0) > 0 ? 75 : 30;

  const radarData = [
    { metric: "Доход", value: incomeScore, fullMark: 100 },
    { metric: "Накопления", value: savingsScore, fullMark: 100 },
    { metric: "Счета", value: diversityScore, fullMark: 100 },
    { metric: "Контроль", value: controlScore, fullMark: 100 },
    { metric: "Стабильность", value: stabilityScore, fullMark: 100 },
    { metric: "Планирование", value: planningScore, fullMark: 100 },
  ];

  const overallScore = Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length);

  const [whatIfSavings, setWhatIfSavings] = useState(5000);

  // Tips based on real data
  const tips: { text: string; severity: "good" | "warn" | "bad"; icon: React.ElementType }[] = [];
  if (transactions.length === 0) {
    tips.push({ text: "Загрузите выписку из банка, чтобы мы могли дать точные рекомендации", severity: "warn", icon: Lightbulb });
  }
  if (savingsRate < 10 && income > 0) {
    tips.push({ text: "Вы откладываете меньше 10% дохода. Попробуйте увеличить эту цифру", severity: "warn", icon: PiggyBank });
  }
  if (savingsRate >= 20) {
    tips.push({ text: "Отличная привычка! Вы откладываете больше 20% дохода", severity: "good", icon: Heart });
  }
  if (accounts.length < 2) {
    tips.push({ text: "Добавьте все свои счета, чтобы видеть полную картину", severity: "warn", icon: Wallet });
  }
  if (accounts.length >= 2) {
    tips.push({ text: "У вас добавлено несколько счетов — картина становится полнее", severity: "good", icon: CheckCircle2 });
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1200px]">
        <div>
            <h2 className="text-2xl font-bold text-[#303030]">Ваше финансовое здоровье</h2>
            <p className="text-sm text-[#8E8E93] mt-1">
              Наглядная оценка вашего положения и понятные советы, как его улучшить
            </p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="tips">Советы</TabsTrigger>
            <TabsTrigger value="whatif">Что если?</TabsTrigger>
            <TabsTrigger value="goals">Цели</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Score */}
              <Card className="flex flex-col items-center justify-center py-8">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#E5E5EA" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#3629B7" strokeWidth="10"
                      strokeDasharray={`${overallScore * 3.27} 327`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#303030]">{overallScore}</span>
                    <span className="text-xs text-[#8E8E93]">из 100</span>
                  </div>
                </div>
                <p className="mt-3 font-semibold text-[#303030]">Ваша оценка</p>
                <Badge className={`mt-1 ${overallScore >= 70 ? "bg-[#34C759]/10 text-[#34C759]" : overallScore >= 40 ? "bg-[#FF9500]/10 text-[#FF9500]" : "bg-[#FF3B30]/10 text-[#FF3B30]"} hover:bg-transparent`}>
                  {overallScore >= 70 ? "Хорошо" : overallScore >= 40 ? "Можно лучше" : "Нужна работа"}
                </Badge>
              </Card>

              {/* Radar */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#303030]">Ваш финансовый профиль</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#E5E5EA" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#8E8E93" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#8E8E93" }} />
                        <Radar dataKey="value" stroke="#3629B7" fill="#3629B7" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-[#34C759]" />
                    <p className="text-sm text-[#8E8E93]">Доход</p>
                  </div>
                  <p className="text-xl font-bold text-[#303030]">{income > 0 ? `${income.toLocaleString("ru-RU")} ₽` : "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-[#FF3B30]" />
                    <p className="text-sm text-[#8E8E93]">Расходы</p>
                  </div>
                  <p className="text-xl font-bold text-[#303030]">{expenses > 0 ? `${expenses.toLocaleString("ru-RU")} ₽` : "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="w-4 h-4 text-[#FF9500]" />
                    <p className="text-sm text-[#8E8E93]">Накопления</p>
                  </div>
                  <p className={`text-xl font-bold ${savings >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                    {income > 0 ? `${savings >= 0 ? "+" : ""}${savings.toLocaleString("ru-RU")} ₽` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-[#3629B7]" />
                    <p className="text-sm text-[#8E8E93]">На счетах</p>
                  </div>
                  <p className="text-xl font-bold text-[#303030]">{totalBalance.toLocaleString("ru-RU")} ₽</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4 mt-4">
            {tips.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-8 h-8 text-[#3629B7] mx-auto mb-3" />
                  <p className="text-sm text-[#8E8E93]">Загрузите данные, и мы дадим персональные советы</p>
                </CardContent>
              </Card>
            )}
            {tips.map((tip, i) => {
              const color = tip.severity === "good" ? "#34C759" : tip.severity === "warn" ? "#FF9500" : "#FF3B30";
              return (
                <Card key={i} className="border-l-4" style={{ borderLeftColor: color }}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <tip.icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color }} />
                      <div>
                        <p className="text-sm text-[#303030]">{tip.text}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="whatif" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                  <Sparkles className="w-4 h-4 text-[#3629B7]" />
                  А что если откладывать каждый месяц?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[#303030] mb-2">Сумма: <span className="font-semibold">{whatIfSavings.toLocaleString("ru-RU")} ₽/мес</span></p>
                  <Slider
                    value={[whatIfSavings]}
                    onValueChange={(v) => setWhatIfSavings(v[0])}
                    min={1000}
                    max={100000}
                    step={1000}
                  />
                  <div className="flex justify-between text-xs text-[#8E8E93] mt-1">
                    <span>1 000 ₽</span>
                    <span>100 000 ₽</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-[#34C759]/5 rounded-xl border border-[#34C759]/10">
                    <p className="text-xs text-[#8E8E93] mb-1">Через 6 месяцев</p>
                    <p className="text-lg font-bold text-[#34C759]">{(whatIfSavings * 6).toLocaleString("ru-RU")} ₽</p>
                  </div>
                  <div className="p-4 bg-[#3629B7]/5 rounded-xl border border-[#3629B7]/10">
                    <p className="text-xs text-[#8E8E93] mb-1">Через год</p>
                    <p className="text-lg font-bold text-[#3629B7]">{(whatIfSavings * 12).toLocaleString("ru-RU")} ₽</p>
                  </div>
                  <div className="p-4 bg-[#FF9500]/5 rounded-xl border border-[#FF9500]/10">
                    <p className="text-xs text-[#8E8E93] mb-1">Через 3 года</p>
                    <p className="text-lg font-bold text-[#FF9500]">{(whatIfSavings * 36).toLocaleString("ru-RU")} ₽</p>
                  </div>
                </div>
                <p className="text-xs text-[#8E8E93] text-center">
                  Даже небольшая сумма каждый месяц превращается в серьёзные накопления
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 mt-4">
            {(userData?.goals || []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="w-8 h-8 text-[#FF9500] mx-auto mb-3" />
                  <h3 className="font-semibold text-[#303030] mb-1">Пока нет целей</h3>
                  <p className="text-sm text-[#8E8E93]">Цели создаются при настройке аккаунта</p>
                </CardContent>
              </Card>
            ) : (
              (userData?.goals || []).map((g) => {
                const progress = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                return (
                  <Card key={g.id}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-[#3629B7]" />
                          <p className="font-semibold text-[#303030]">{g.name}</p>
                        </div>
                        <span className="text-xs text-[#8E8E93]">до {new Date(g.deadline).toLocaleDateString("ru-RU")}</span>
                      </div>
                      <Progress value={Math.min(100, progress)} className="h-2 mb-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8E8E93]">
                          {g.currentAmount.toLocaleString("ru-RU")} ₽ из {g.targetAmount.toLocaleString("ru-RU")} ₽
                        </span>
                        <span className="font-medium text-[#303030]">{Math.round(progress)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
