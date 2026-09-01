"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Calculator,
  Calendar,
  FileText,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  Clock,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Sparkles,
  Upload,
  Info,
} from "lucide-react";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ru-RU") + " ₽";
}

// Dynamic deductions computed from user profile + transactions
function computeDeductions(
  monthlyIncome: number,
  hasChildren: boolean,
  hasDebts: boolean,
  totalMedical: number,
  totalEducation: number,
  hasIIS: boolean
) {
  const yearlyIncome = monthlyIncome * 12;
  const ndfl = yearlyIncome * 0.13; // 13% tax on income

  const deductions: {
    id: string;
    name: string;
    description: string;
    source: string;
    estimatedAmount: number;
    maxAmount: number;
    isAvailable: boolean;
    unavailableReason?: string;
    actionUrl: string;
  }[] = [];

  // IIS
  deductions.push({
    id: "iis",
    name: "Вычет по ИИС (тип А)",
    description: hasIIS
      ? "Вы внесли деньги на ИИС — вернуть 13% от взноса, до 52 000 ₽ в год."
      : "Откройте ИИС и получайте 13% от взноса от государства — до 52 000 ₽ в год.",
    source: "НК РФ, ст. 219.1",
    estimatedAmount: Math.min(ndfl, 52000),
    maxAmount: 52000,
    isAvailable: true,
    actionUrl: "https://www.nalog.gov.ru",
  });

  // Mortgage
  deductions.push({
    id: "mortgage",
    name: "Вычет по ипотеке",
    description: hasDebts
      ? "Платите ипотеку? Верните 13% от уплаченных процентов — до 390 000 ₽ за всё время."
      : "Если возьмёте ипотеку, сможете вернуть до 390 000 ₽ с выплаченных процентов.",
    source: "НК РФ, ст. 220",
    estimatedAmount: hasDebts ? Math.min(ndfl, 156000) : 0,
    maxAmount: 390000,
    isAvailable: hasDebts,
    unavailableReason: hasDebts ? undefined : "Не обнаружено ипотечных кредитов",
    actionUrl: "https://www.nalog.gov.ru",
  });

  // Medical
  deductions.push({
    id: "medical",
    name: "Вычет за лечение",
    description:
      totalMedical > 0
        ? `Расходы на здоровье в ваших данных: ${fmt(totalMedical)}. Верните 13% — это ${fmt(totalMedical * 0.13)}.`
        : "Ходили к врачу или покупали лекарства? Верните до 15 600 ₽ (13% от расходов).",
    source: "НК РФ, ст. 219",
    estimatedAmount: totalMedical > 0 ? Math.min(totalMedical * 0.13, 15600) : 7800,
    maxAmount: 15600,
    isAvailable: true,
    actionUrl: "https://www.nalog.gov.ru",
  });

  // Education
  if (totalEducation > 0) {
    deductions.push({
      id: "education",
      name: "Вычет за образование",
      description: `Расходы на образование в ваших данных: ${fmt(totalEducation)}. Вернуть 13% = ${fmt(totalEducation * 0.13)}.`,
      source: "НК РФ, ст. 219",
      estimatedAmount: Math.min(totalEducation * 0.13, 15600),
      maxAmount: 15600,
      isAvailable: true,
      actionUrl: "https://www.nalog.gov.ru",
    });
  }

  // Children
  if (hasChildren) {
    deductions.push({
      id: "children",
      name: "Стандартный вычет на ребёнка",
      description: "На первого и второго ребёнка — по 1 400 ₽/мес вычет, на третьего — 3 000 ₽/мес. Экономия на налоге до 5 200 ₽/год.",
      source: "НК РФ, ст. 218",
      estimatedAmount: 2184,
      maxAmount: 5200,
      isAvailable: true,
      actionUrl: "https://www.nalog.gov.ru",
    });
  }

  return deductions;
}

function getTaxCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const nextYear = year + 1;
  const isAfterApril = now.getMonth() >= 3; // April = index 3

  return [
    {
      date: `${isAfterApril ? nextYear : year}-04-30`,
      title: "Подать декларацию 3-НДФЛ",
      status: isAfterApril ? "upcoming" : now.getMonth() >= 3 ? "done" : "upcoming",
      description: `Декларация за ${year - 1} год. Не пропустите этот срок!`,
      urgent: !isAfterApril && now.getMonth() >= 2,
    },
    {
      date: `${year}-12-31`,
      title: "Подать на вычет по ИИС",
      status: "upcoming" as const,
      description: "Успейте подать заявление до конца года и получить возврат за этот год",
      urgent: now.getMonth() === 11,
    },
    {
      date: `${isAfterApril ? nextYear : year}-03-01`,
      title: "Справка о доходах от работодателя",
      status: now.getMonth() >= 2 ? "done" : "upcoming",
      description: `Получите справку 2-НДФЛ за ${year - 1} год для декларации`,
      urgent: false,
    },
    {
      date: `${isAfterApril ? nextYear : year}-07-15`,
      title: "Оплатить начисленный налог",
      status: isAfterApril && now.getMonth() >= 6 ? "done" : "upcoming",
      description: "Если по декларации есть сумма к уплате — оплатите до этой даты",
      urgent: false,
    },
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const taxChecklist = [
  { id: 1, title: "Получить справку 2-НДФЛ со всех мест работы" },
  { id: 2, title: "Взять выписку по ИИС у брокера" },
  { id: 3, title: "Собрать чеки за лечение и справки из клиник" },
  { id: 4, title: "Проверить зарубежные переводы (если были)" },
  { id: 5, title: "Посчитать прибыль или убыток от продажи акций" },
  { id: 6, title: "Заполнить декларацию на nalog.ru и отправить" },
  { id: 7, title: "Оплатить налог (если начислен)" },
];

export default function TaxHelperPage() {
  const { userData } = useAuth();
  const [checklist, setChecklist] = useState(taxChecklist.map((i) => ({ ...i, done: false })));
  const [activeTab, setActiveTab] = useState<"calendar" | "checklist" | "deductions">("deductions");

  const profile = userData?.profile;
  const transactions = userData?.transactions || [];
  const debts = userData?.debts || [];

  const totalMedical = useMemo(() => {
    return transactions
      .filter((t) => t.amount < 0 && /здоров|меди|аптек|клиник|больниц|врач/i.test(t.category + " " + t.description))
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions]);

  const totalEducation = useMemo(() => {
    return transactions
      .filter((t) => t.amount < 0 && /образован|учёб|курс|универ|школ/i.test(t.category + " " + t.description))
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions]);

  const hasIIS = useMemo(() => {
    return (
      userData?.accounts?.some((a) => /брокер|инвест|иис/i.test(a.name)) ||
      transactions.some((t) => /иис|брокер|инвест/i.test(t.description + " " + t.category))
    );
  }, [userData, transactions]);

  const hasChildren = profile?.hasChildren ?? false;
  const hasDebts = debts.some((d) => d.type === "mortgage");
  const monthlyIncome = profile?.monthlyIncome || 0;

  const deductions = useMemo(
    () => computeDeductions(monthlyIncome, hasChildren, hasDebts, totalMedical, totalEducation, !!hasIIS),
    [monthlyIncome, hasChildren, hasDebts, totalMedical, totalEducation, hasIIS]
  );

  const availableDeductions = deductions.filter((d) => d.isAvailable);
  const totalReturn = availableDeductions.reduce((s, d) => s + d.estimatedAmount, 0);

  const completedCount = checklist.filter((c) => c.done).length;
  const toggleItem = (id: number) => {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

  const calendar = getTaxCalendar();
  const nextDeadline = calendar.find((c) => c.status === "upcoming");

  const TABS = [
    { id: "deductions" as const, label: "Ваши вычеты", icon: Lightbulb },
    { id: "calendar" as const, label: "Важные даты", icon: Calendar },
    { id: "checklist" as const, label: "Что сделать", icon: FileText },
  ];

  return (
    <AppShell>
      <div className="space-y-5 max-w-[900px]">

        {/* Hero */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3629B7] to-[#2a1f8f] text-white">
          <CardContent className="p-5 md:p-6 relative">
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 blur-[80px]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-medium text-white/60">Налоговая оптимизация</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">Налоги и вычеты</h2>
              <p className="text-sm text-white/60 max-w-lg">
                Покажем, какие вычеты вам положены, напомним о дедлайнах и поможем вернуть деньги от государства.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No income warning */}
        {!monthlyIncome && transactions.length === 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FF9500]/8 border border-[#FF9500]/15">
            <Info className="w-4 h-4 text-[#FF9500] shrink-0" />
            <p className="text-sm text-[#FF9500]">
              Загрузите выписку или укажите доход в профиле — тогда расчёт вычетов станет персональным.{" "}
              <Link href="/upload" className="underline font-medium">Загрузить</Link>
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-[#34C759]">
            <CardContent className="p-4">
              <p className="text-xs text-[#8E8E93] mb-1">Можно вернуть</p>
              <p className="text-xl font-bold text-[#34C759]">{fmt(totalReturn)}</p>
              <p className="text-[10px] text-[#8E8E93] mt-0.5">{availableDeductions.length} вычетов доступно</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#8E8E93] mb-1">Чеклист</p>
              <p className="text-xl font-bold text-[#303030]">
                {completedCount}/{checklist.length}
              </p>
              <Progress value={(completedCount / checklist.length) * 100} className="h-1 mt-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#8E8E93] mb-1">Ближайший срок</p>
              {nextDeadline ? (
                <>
                  <p className="text-sm font-bold text-[#303030] leading-tight">
                    {new Date(nextDeadline.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-[10px] text-[#FF9500] mt-0.5 line-clamp-1">{nextDeadline.title}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-[#34C759]">Всё сделано!</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#8E8E93] mb-1">Расходы на здоровье</p>
              <p className="text-xl font-bold text-[#303030]">{fmt(totalMedical)}</p>
              <p className="text-[10px] text-[#8E8E93] mt-0.5">по данным выписки</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-[#E5E5EA] w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-[#3629B7] text-white shadow-sm"
                  : "text-[#8E8E93] hover:text-[#303030] hover:bg-[#F5F5F7]"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Deductions */}
        {activeTab === "deductions" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#34C759]/5 border border-[#34C759]/10">
              <Sparkles className="w-4 h-4 text-[#34C759] shrink-0" />
              <p className="text-sm text-[#34C759]">
                {monthlyIncome > 0 || transactions.length > 0
                  ? `На основе ваших данных: потенциальный возврат — до ${fmt(totalReturn)}/год`
                  : "Укажите доход и загрузите данные для персонального расчёта вычетов"}
              </p>
            </div>

            {deductions.map((d) => (
              <Card
                key={d.id}
                className={`border ${d.isAvailable ? "border-[#E5E5EA]" : "border-[#E5E5EA] opacity-60"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${d.isAvailable ? "bg-[#34C759]/10" : "bg-[#F5F5F7]"}`}>
                      <Lightbulb className={`w-5 h-5 ${d.isAvailable ? "text-[#34C759]" : "text-[#8E8E93]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[#303030]">{d.name}</h3>
                        <p className={`text-lg font-bold shrink-0 ${d.isAvailable ? "text-[#34C759]" : "text-[#8E8E93]"}`}>
                          {d.estimatedAmount > 0 ? fmt(d.estimatedAmount) : "—"}
                        </p>
                      </div>
                      <p className="text-sm text-[#8E8E93] mb-2">{d.description}</p>
                      {d.isAvailable && d.estimatedAmount > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-[#8E8E93] mb-1">
                            <span>Ваш возврат</span>
                            <span>Макс: {fmt(d.maxAmount)}</span>
                          </div>
                          <Progress value={(d.estimatedAmount / d.maxAmount) * 100} className="h-1.5" />
                        </div>
                      )}
                      {!d.isAvailable && d.unavailableReason && (
                        <div className="flex items-center gap-1.5 mb-2 text-xs text-[#8E8E93]">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          {d.unavailableReason}
                        </div>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
                          <BookOpen className="w-3 h-3" />
                          <span>{d.source}</span>
                        </div>
                        <a href={d.actionUrl} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            variant={d.isAvailable ? "default" : "outline"}
                            className={`h-7 text-xs px-3 rounded-lg ${d.isAvailable ? "bg-[#3629B7] hover:bg-[#2a1f8f] text-white" : "border-[#E5E5EA]"}`}
                          >
                            Подать заявку
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-l-4 border-l-[#3629B7] bg-[#3629B7]/3">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-[#303030]">Итого можно вернуть</p>
                    <p className="text-xs text-[#8E8E93]">При подаче декларации за текущий год</p>
                  </div>
                  <p className="text-2xl font-bold text-[#34C759]">{fmt(totalReturn)}</p>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-[#8E8E93] text-center">
              Расчёт приблизительный на основе данных в приложении. Точную сумму уточните на{" "}
              <a href="https://nalog.gov.ru" target="_blank" rel="noopener noreferrer" className="text-[#3629B7] underline">nalog.gov.ru</a>
            </p>
          </div>
        )}

        {/* TAB: Calendar */}
        {activeTab === "calendar" && (
          <div className="space-y-3">
            {calendar.map((item, i) => {
              const isPast = item.status === "done";
              const isUrgent = item.urgent;
              return (
                <Card key={i} className={isPast ? "opacity-50" : isUrgent ? "border-[#FF3B30]/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isPast ? "bg-[#34C759]/10" : isUrgent ? "bg-[#FF3B30]/10" : "bg-[#FF9500]/10"
                      }`}>
                        {isPast ? (
                          <CheckCircle2 className="w-6 h-6 text-[#34C759]" />
                        ) : isUrgent ? (
                          <AlertTriangle className="w-6 h-6 text-[#FF3B30]" />
                        ) : (
                          <Calendar className="w-6 h-6 text-[#FF9500]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-semibold text-[#303030]">{item.title}</p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 border-0 ${
                              isPast ? "bg-[#34C759]/10 text-[#34C759]"
                              : isUrgent ? "bg-[#FF3B30]/10 text-[#FF3B30]"
                              : "bg-[#FF9500]/10 text-[#FF9500]"
                            }`}
                          >
                            {isPast ? "Выполнено" : isUrgent ? "Срочно!" : "Предстоит"}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8E8E93]">{item.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[#303030]">
                          {new Date(item.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                        </p>
                        <p className="text-xs text-[#8E8E93]">{new Date(item.date).getFullYear()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="bg-[#F5F5F7] border-0">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-[#303030]">Подать через Госуслуги</p>
                  <p className="text-xs text-[#8E8E93]">Прямо из браузера</p>
                </div>
                <a href="https://gosuslugi.ru" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white">
                    Открыть Госуслуги
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB: Checklist */}
        {activeTab === "checklist" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#3629B7]/5 border border-[#3629B7]/10">
              <Clock className="w-4 h-4 text-[#3629B7] shrink-0" />
              <p className="text-sm text-[#3629B7]">
                Выполнено {completedCount} из {checklist.length} пунктов. Нажмите на пункт, чтобы отметить.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-[#303030]">
                  <FileText className="w-4 h-4 text-[#3629B7]" />
                  Подготовка к подаче декларации
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-[#F5F5F7] cursor-pointer transition-colors"
                    onClick={() => toggleItem(item.id)}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-[#34C759] shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#E5E5EA] shrink-0" />
                    )}
                    <span className={`text-sm ${item.done ? "line-through text-[#8E8E93]" : "text-[#303030]"}`}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#34C759]/5 to-white border-[#34C759]/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5 text-[#34C759]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#303030]">Заполнить декларацию онлайн</p>
                  <p className="text-xs text-[#8E8E93]">На nalog.gov.ru в разделе «Личный кабинет»</p>
                </div>
                <a href="https://nalog.gov.ru" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="rounded-xl bg-[#34C759] hover:bg-[#2aa84a] text-white shrink-0">
                    Открыть
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
