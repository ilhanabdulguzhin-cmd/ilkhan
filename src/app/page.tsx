"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { computeInsights } from "@/lib/user-store";
import Link from "next/link";
import { useMemo, useEffect, useState, useCallback } from "react";
import { getDigest, refreshDigest, type DigestResult } from "@/lib/market-digest";
import { useRealtimeMarket } from "@/hooks/use-realtime-market";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  CreditCard,
  Upload,
  Target,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowRight,
  Brain,
  FileSpreadsheet,
  PenLine,
  AlertTriangle,
  Zap,
  ChevronRight,
  Clock,
  Gift,
  Newspaper,
  TrendingDown,
  Lightbulb,
  Calendar,
  ExternalLink,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  ShieldAlert,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const PIE_COLORS = ["#3629B7", "#34C759", "#FF3B30", "#FF9500", "#007AFF", "#8E8E93"];

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

// Budget rebalancing logic
function getBudgetBalance(income: number, expenses: number, catMap: Record<string, number>) {
  if (income <= 0) return null;
  const mandatory = (catMap["Кредиты"] || 0) + (catMap["ЖКХ"] || 0) + (catMap["Аренда"] || 0);
  const flexible = expenses - mandatory;
  const savings = income - expenses;
  const savingsRate = (savings / income) * 100;

  const recommendations: { text: string; type: "good" | "warn" | "bad" }[] = [];
  if (savingsRate < 10) recommendations.push({ text: "Откладывайте хотя бы 10% дохода на подушку безопасности", type: "bad" });
  else if (savingsRate >= 20) recommendations.push({ text: "Отлично! Вы откладываете больше 20% дохода", type: "good" });
  if (flexible / income > 0.5) recommendations.push({ text: "Гибкие расходы занимают больше 50% дохода — есть куда оптимизировать", type: "warn" });
  if (mandatory / income > 0.4) recommendations.push({ text: "Обязательные платежи выше 40% — рассмотрите рефинансирование", type: "warn" });

  return { mandatory, flexible, savings, savingsRate, recommendations };
}

// ── Financial news — реальные данные из открытых источников, июль 2026 ──────
// Источники: cbr.ru, sravni.ru, finuslugi.ru, rbc.ru, interfax.ru
const FINANCE_NEWS = [
  {
    category: "ЦБ РФ",
    title: "Ставка ЦБ снижена до 14,0% — заседание 25 июля решит дальнейшую динамику",
    summary: "На заседании 6 июня 2026 Банк России снизил ключевую ставку с 14,5% до 14,0%. Инфляция замедлилась до 6,8% г/г (июнь) — всё ещё выше таргета 4%. Следующее заседание — 25 июля. Рынок ждёт паузу: инфляционные ожидания населения остаются повышенными (11,5%).",
    impact: "Июль — последний месяц для фиксации 15–16% по вкладам. После заседания банки могут начать снижать ставки. Открывайте длинные вклады сейчас, не ждите сентября.",
    tag: "Ставка",
    tagColor: "#3629B7",
    date: "Июль 2026",
    source: "cbr.ru",
    sourceUrl: "https://www.cbr.ru/dkp/",
  },
  {
    category: "Вклады",
    title: "Лучшие ставки по вкладам — июль 2026: до 16% на 3 месяца",
    summary: "После снижения КС до 14,0% (июнь 2026). Топ-предложений: Т-Банк — до 16% (3 мес, новые клиенты), Газпромбанк — до 15,5% (6 мес), МКБ — до 15,5% (3 мес), ВТБ — до 15% (6 мес). Средняя по ТОП-10: ~13,2%. Накопительные: Газпромбанк 14,5%, Т-Банк 14%.",
    impact: "Последний месяц высоких ставок. К сентябрю 2026 средняя ставка упадёт до 12% при новом снижении КС. Фиксируйте 15–16% на 6–12 мес сейчас.",
    tag: "Вклады",
    tagColor: "#34C759",
    date: "Июль 2026",
    source: "banki.ru",
    sourceUrl: "https://www.banki.ru/products/deposits/catalogue/",
  },
  {
    category: "Ипотека",
    title: "Семейная ипотека 6%: расширение на вторичку + рефинансирование",
    summary: "Семейная ипотека под 6% с апреля 2026 доступна на вторичном рынке в 891 городе. Новое с июля: при рефинансировании действующей ипотеки можно сохранить ставку 6% (раньше теряли). Рыночная ставка — 17–18%. Экономия при семейной — 4+ млн ₽ за 20 лет.",
    impact: "При рыночной 17% переплата за 5 млн / 20 лет — ~6,5 млн ₽. При 6% — ~2,5 млн ₽. Экономия 4 млн ₽. Если подходите — берите только льготную.",
    tag: "Ипотека",
    tagColor: "#FF9500",
    date: "Июль 2026",
    source: "domrfbank.ru",
    sourceUrl: "https://domrfbank.ru/mortgage/",
  },
  {
    category: "Инвестиции",
    title: "IMOEX 2 385: рынок РФ скорректировался на 14% с начала года",
    summary: "Индекс Мосбиржи (IMOEX) на 30 июня — 2 385 п., снижение на 14,3% с января 2026 (было 2 783). Давление: высокая ставка ЦБ 14,25%, геополитика, слабый рубль. Длинные ОФЗ дают 14–18% годовых с учётом ценового роста. При ожидаемом снижении КС до 12–13% к концу 2026 — потенциальный рост рынка.",
    impact: "Текущая коррекция — окно для входа. ОФЗ с купоном 14–15% — защита капитала. Акции нефтегаза (Сбер 308 ₽, Лукойл 4 632 ₽) — дивиденды 12–15%. Диверсификация снижает риски.",
    tag: "ОФЗ",
    tagColor: "#007AFF",
    date: "30 июня 2026",
    source: "moex.com",
    sourceUrl: "https://iss.moex.com/iss/statistics/engines/stock/markets/index/securities/IMOEX.html",
  },
  {
    category: "Налоги",
    title: "Вычеты 2025: верните до 64 000 ₽ с ИИС-3 до конца 2028",
    summary: "Лимит соцвычетов повышен до 150 000 ₽ (было 120 000) с 2025 года. Возврат до 19 500 ₽ за лечение/обучение/спорт. ИИС-3: при взносе 400 000 ₽ — возврат до 64 000 ₽ (по новой прогрессивной шкале НДФЛ 13–15% в зависимости от дохода).",
    impact: "Внесите 400 000 ₽ на ИИС-3 до конца года и верните 52 000–64 000 ₽. Заполнить 3-НДФЛ — 10 минут на nalog.ru. Деньги придут на счёт через 1–4 месяца.",
    tag: "НДФЛ",
    tagColor: "#FF3B30",
    date: "Июль 2026",
    source: "nalog.ru",
    sourceUrl: "https://lkfl2.nalog.ru/lkfl/login",
  },
  {
    category: "Безопасность",
    title: "Новая схема июля: «Центр мониторинга ЦБ» — не верьте!",
    summary: "В июне-июле 2026 ЦБ фиксирует рост мошеннических звонков от имени «Центра мониторинга». Жертв убеждают перевести деньги на «безопасный счёт» через СБП. Средняя потеря — 1,5 млн ₽. ЦБ напоминает: сотрудники ЦБ никогда не звонят. С июля 2024 банки обязаны возвращать деньги жертвам по 161-ФЗ.",
    impact: "Если перевели деньги — немедленно звоните в банк (24/7) и подавайте заявление на возврат. Банк обязан рассмотреть в течение 30 дней. Звонок от ЦБ = 100% мошенники.",
    tag: "Защита",
    tagColor: "#FF9500",
    date: "Июль 2026",
    source: "cbr.ru",
    sourceUrl: "https://www.cbr.ru/security/",
  },
];

// ── Smart tips engine ─────────────────────────────────────────────────────────
interface FinTip {
  id: string;
  title: string;
  rationale: string;
  amount?: string;
  action: string;
  actionLink: string;
  urgency: "high" | "medium" | "low";
  horizon: "now" | "future";
}

function generateTips(
  totalIncome: number,
  totalExpenses: number,
  monthlyIncome: number,
  totalBalance: number,
  categoryMap: Record<string, number>,
  numMonths: number,
  debts: { balance: number; rate: number; name: string; monthlyPayment: number }[],
  transactions: { amount: number }[],
): { now: FinTip[]; future: FinTip[] } {
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  const monthlyExp = totalExpenses / Math.max(numMonths, 1);
  const cushionMonths = monthlyIncome > 0 && monthlyExp > 0 ? totalBalance / monthlyExp : 0;
  const highRateDebt = debts.filter(d => d.rate > 15);
  const totalHighDebt = highRateDebt.reduce((s, d) => s + d.balance, 0);
  const topExpCat = Object.entries(categoryMap).sort(([,a],[,b]) => b-a)[0];

  const fmtN = (n: number) => Math.abs(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";

  const now: FinTip[] = [];
  const future: FinTip[] = [];

  // ── NOW tips ──────────────────────────────────────────────────────────────
  if (cushionMonths < 3 && monthlyIncome > 0) {
    const need = monthlyIncome * 3 - totalBalance;
    now.push({
      id: "cushion", urgency: "high", horizon: "now",
      title: "Создайте подушку безопасности",
      rationale: `У вас ${cushionMonths.toFixed(1)} мес. запаса. Норма — 3–6 мес. расходов. При ставке 16% эти деньги ещё и растут.`,
      amount: `Нужно накопить ещё ${fmtN(need)}`,
      action: "Открыть накопительный счёт",
      actionLink: "/products",
    });
  }

  if (highRateDebt.length > 0) {
    const annualCost = highRateDebt.reduce((s,d) => s + d.balance * d.rate / 100, 0);
    now.push({
      id: "highdebt", urgency: "high", horizon: "now",
      title: `Закройте дорогие кредиты (>${highRateDebt[0].rate}%)`,
      rationale: `Долги под ${highRateDebt.map(d=>d.rate+"%").join(", ")} обходятся вам ${fmtN(annualCost)} процентов в год. Это деньги, которые уходят в никуда.`,
      amount: `Переплата ${fmtN(annualCost)}/год`,
      action: "Перейти к кредитам",
      actionLink: "/debt-optimizer",
    });
  }

  if (savingsRate < 10 && totalIncome > 0) {
    const target = monthlyIncome * 0.2;
    const extra = target - (savings / numMonths);
    now.push({
      id: "savings_rate", urgency: "high", horizon: "now",
      title: "Увеличьте норму сбережений до 20%",
      rationale: `Сейчас вы откладываете ${savingsRate.toFixed(0)}% дохода. Целевой показатель — 20%. Автоперевод в день зарплаты: деньги не потратите, они «исчезают» сами.`,
      amount: `Добавьте ${fmtN(extra)}/мес к сбережениям`,
      action: "Настроить автосбережение",
      actionLink: "/ai-consultant",
    });
  }

  if (topExpCat && totalExpenses > 0 && topExpCat[1] / totalExpenses > 0.3) {
    const save15 = Math.round(topExpCat[1] / numMonths * 0.15);
    now.push({
      id: "topcat", urgency: "medium", horizon: "now",
      title: `Оптимизируйте «${topExpCat[0]}»`,
      rationale: `Эта категория занимает ${Math.round(topExpCat[1] / totalExpenses * 100)}% всех расходов — выше нормы. Сокращение на 15% освободит ${fmtN(save15)}/мес.`,
      amount: `Экономия ~${fmtN(save15)}/мес`,
      action: "Смотреть операции",
      actionLink: "/transactions",
    });
  }

  const subAmount = (categoryMap["Подписки"] || 0) / numMonths;
  if (subAmount > 500) {
    now.push({
      id: "subs", urgency: "medium", horizon: "now",
      title: "Проверьте и отмените ненужные подписки",
      rationale: `Вы тратите ${fmtN(subAmount)}/мес на подписки. 30–40% из них используются редко. Проверка займёт 10 минут.`,
      amount: `Потенциал экономии ${fmtN(subAmount * 0.35)}/мес`,
      action: "Проверить подписки",
      actionLink: "/subscriptions",
    });
  }

  if (transactions.filter(t => t.amount > 0).length > 0 && monthlyIncome > 0) {
    const iisReturn = Math.min(Math.min(monthlyIncome * 12, 400000) * 0.13, monthlyIncome * 12 * 0.13);
    now.push({
      id: "iis", urgency: "medium", horizon: "now",
      title: "Откройте ИИС и получите возврат налога",
      rationale: `При вашем доходе государство вернёт до ${fmtN(iisReturn)} НДФЛ в год — за открытие ИИС и внесение средств.`,
      amount: `До ${fmtN(iisReturn)}/год возврат`,
      action: "Узнать про ИИС",
      actionLink: "/tax-helper",
    });
  }

  // Fill to 5
  if (now.length < 5) {
    now.push({
      id: "cashback_now", urgency: "low", horizon: "now",
      title: "Подберите карту с кешбэком под ваши расходы",
      rationale: `Карта приносит 2 000–5 000 ₽ кешбэка в месяц на ежедневных тратах. Привычки менять не придётся.`,
      amount: "До 60 000 ₽/год",
      action: "Выбрать карту",
      actionLink: "/products",
    });
  }

  // ── FUTURE tips ──────────────────────────────────────────────────────────
  future.push({
    id: "portfolio", urgency: "medium", horizon: "future",
    title: "Сформируйте инвестиционный портфель",
    rationale: cushionMonths >= 3
      ? `Подушка есть. Следующий шаг: 60% в ОФЗ/облигации (15–16%), 30% в БПИФ акций, 10% в золото. При ${fmtN(monthlyIncome * 0.2)}/мес через 10 лет — более ${fmtN(monthlyIncome * 0.2 * 12 * 10 * 1.5)}.`
      : "Сначала накопите подушку 3 мес, затем начните инвестировать. 5 000 ₽/мес в ОФЗ через 5 лет = капитал 400 000 ₽.",
    amount: totalBalance > 0 ? `Стартовый капитал: ${fmtN(totalBalance)}` : undefined,
    action: "Изучить инструменты",
    actionLink: "/ai-consultant",
  });

  future.push({
    id: "tax_plan", urgency: "medium", horizon: "future",
    title: "Налоговое планирование на год",
    rationale: `Вычеты за лечение, образование, квартиру, ИИС — возврат до 52 000–650 000 ₽. Планируйте расходы под лимиты. Подавайте 3-НДФЛ ежегодно.`,
    action: "Налоговый помощник",
    actionLink: "/tax-helper",
  });

  future.push({
    id: "refinance", urgency: debts.some(d => d.rate > 16) ? "high" : "low", horizon: "future",
    title: "Рефинансируйте дорогие кредиты при снижении ставки ЦБ",
    rationale: `ЦБ ожидает снизить ставку в 2026–2027. Когда банки опустят ипотеку на 2%+, рефинансирование сэкономит сотни тысяч рублей. Следите за ставками.`,
    action: "Оптимизировать долги",
    actionLink: "/debt-optimizer",
  });

  future.push({
    id: "passive_income", urgency: "low", horizon: "future",
    title: "Создайте источник пассивного дохода",
    rationale: monthlyIncome > 0
      ? `Цель: пассивный доход = 30% основного (${fmtN(monthlyIncome * 0.3)}/мес). При ставке 15%/год нужен капитал ${fmtN(monthlyIncome * 0.3 * 12 / 0.15)}. Начните прямо сейчас.`
      : "Дивиденды, купоны по облигациям, накопительный счёт. Пассивный доход снижает зависимость от зарплаты.",
    action: "Спросить Кэшика",
    actionLink: "/ai-consultant",
  });

  future.push({
    id: "will_pension", urgency: "low", horizon: "future",
    title: "Пенсионный капитал: начните накапливать сейчас",
    rationale: `Государственная пенсия — это минимум. При взносах ${fmtN(monthlyIncome > 0 ? monthlyIncome * 0.05 : 5000)}/мес в течение 20 лет под 10% вы накопите ${fmtN(monthlyIncome > 0 ? monthlyIncome * 0.05 * 12 * 20 * 2.5 : 3000000)}. Чем раньше начнёте — тем меньше нужно откладывать.`,
    action: "Рассчитать",
    actionLink: "/ai-consultant",
  });

  future.push({
    id: "ins_protection", urgency: "low", horizon: "future",
    title: "Оформите страховую защиту",
    rationale: "ОМС покрывает базовое лечение. ДМС и страхование жизни защищают от крупных расходов. При потере трудоспособности без страховки расходы могут уничтожить накопления.",
    action: "Узнать о защите",
    actionLink: "/risk-compliance",
  });

  future.push({
    id: "edu_invest", urgency: "low", horizon: "future",
    title: "Инвестируйте в профессиональное развитие",
    rationale: "Рост дохода на 20–30% за счёт повышения квалификации даёт больше, чем оптимизация расходов. Курсы и сертификации приносят налоговый вычет и рост зарплаты.",
    action: "Вычет за обучение",
    actionLink: "/tax-helper",
  });

  return {
    now: now.slice(0, 5),
    future: future.slice(0, 7),
  };
}

export default function DashboardPage() {
  const { userData } = useAuth();
  const market = useRealtimeMarket(5000);
  const transactions = userData?.transactions || [];
  const accounts = userData?.accounts || [];
  const goals = userData?.goals || [];
  const profile = userData?.profile;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const savings = totalIncome - totalExpenses;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    const cat = t.category || "Прочее";
    categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
  });
  const categoryData = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));

  // Monthly trends
  const monthMap: Record<string, { income: number; expenses: number }> = {};
  transactions.forEach((t) => {
    const month = t.date.substring(0, 7);
    if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 };
    if (t.amount > 0) monthMap[month].income += t.amount;
    else monthMap[month].expenses += Math.abs(t.amount);
  });
  const trendData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month: month.substring(5), income: data.income, expenses: data.expenses }));

  const hasData = transactions.length > 0;

  // Monthly income from profile or transactions
  const numMonths = Math.max(Object.keys(monthMap).length, 1);
  const monthlyIncome = profile?.monthlyIncome || (totalIncome / numMonths);
  const monthlyExpenses = totalExpenses / numMonths;
  const budget = getBudgetBalance(monthlyIncome, monthlyExpenses, categoryMap);

  // Market digest state
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  useEffect(() => {
    getDigest(profile?.segment, 6).then(setDigest);
  }, [profile?.segment]);

  const handleRefreshDigest = useCallback(async () => {
    setDigestLoading(true);
    const result = await refreshDigest(profile?.segment, 6);
    setDigest(result);
    setDigestLoading(false);
  }, [profile?.segment]);

  // Insights (top actions for center)
  const insights = useMemo(() => {
    if (!userData) return null;
    return computeInsights(userData);
  }, [userData]);

  const topActions = insights?.actions.slice(0, 3) || [];

  // Smart tips
  const tips = useMemo(() => {
    if (!hasData && !userData?.accounts.length) return { now: [], future: [] };
    return generateTips(
      totalIncome, totalExpenses, monthlyIncome, totalBalance,
      categoryMap, numMonths, userData?.debts || [], transactions,
    );
  }, [totalIncome, totalExpenses, monthlyIncome, totalBalance, categoryMap, numMonths, userData, hasData, transactions]);

  const segmentLabel = profile?.segment === "family" ? "Семейный бюджет"
    : profile?.segment === "entrepreneur" ? "Бизнес + личные"
    : "Личный бюджет";

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1400px]">

        {/* Welcome banner (no data) */}
        {!hasData && (
          <Card className="overflow-hidden border-0 bg-[#3629B7] text-white">
            <CardContent className="p-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-[80px]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-white/80" />
                  <span className="text-sm text-white/60">Добро пожаловать в Monetrix</span>
                  {profile?.segment && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/80">{segmentLabel}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Привет, {profile?.name?.split(" ")[0] || "друг"}! Давайте начнём
                </h2>
                <p className="text-sm text-white/60 mb-6 max-w-lg">
                  Загрузите выписку из банка или внесите траты вручную. Мы покажем, куда уходят деньги и где можно сэкономить.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/upload">
                    <Button className="rounded-xl bg-white text-[#3629B7] hover:bg-white/90 font-semibold shadow-lg">
                      <Upload className="w-4 h-4 mr-2" />
                      Загрузить выписку CSV
                    </Button>
                  </Link>
                  <Link href="/upload">
                    <Button className="rounded-xl bg-white/20 text-white hover:bg-white hover:text-[#3629B7] font-semibold border-2 border-white shadow-lg backdrop-blur-sm">
                      <PenLine className="w-4 h-4 mr-2" />
                      Добавить вручную
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Market Overview Strip — LIVE FROM MOEX ISS + CBR API ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "IMOEX", value: market.imoex.last.toFixed(0),
              change: `${market.imoex.changePrc > 0 ? "+" : ""}${market.imoex.changePrc.toFixed(2)}%`,
              up: market.imoex.changePrc >= 0, color: "#FF9500", link: "https://iss.moex.com/iss/statistics/engines/stock/markets/index/securities/IMOEX.html" },
            { label: "USD/RUB", value: market.currencies.usd.toFixed(2),
              change: null, up: true, color: "#007AFF", link: "https://cbr.ru/currency_base/daily/" },
            { label: "EUR/RUB", value: market.currencies.eur.toFixed(2),
              change: null, up: true, color: "#007AFF", link: "https://cbr.ru/currency_base/daily/" },
            { label: "Ключевая ставка", value: `${market.keyRate.toFixed(1)}%`,
              change: "ЦБ РФ", up: true, color: "#3629B7", link: "https://www.cbr.ru/dkp/" },
          ].map((item) => (
            <a key={item.label} href={item.link} target="_blank" rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-white border border-[#E5E5EA] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-0.5">{item.label}</div>
                <ExternalLink className="w-2.5 h-2.5 text-[#C7C7CC]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black" style={{ color: item.color }}>{item.value}</span>
                {item.change && (
                  <span className={`text-[10px] font-bold ${item.up ? "text-[#34C759]" : "text-[#FF3B30]"}`}>{item.change}</span>
                )}
              </div>
              {market.stale && <div className="text-[8px] text-[#FF9500] mt-0.5">⟳ данные загружаются</div>}
            </a>
          ))}
        </div>

        {/* ── Web 4.0 Life Sections ── */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#3629B7]" />
            <p className="text-sm font-bold text-[#303030]">Жизненные разделы</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3629B7]/10 text-[#3629B7] font-semibold">Web 4.0</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/daily-life", icon: ShoppingCart, color: "#34C759", label: "Бытовая жизнь", desc: "Бюджет, подписки, кэшбек", emoji: "🛒" },
              { href: "/invest", icon: TrendingUp, color: "#007AFF", label: "Инвестиции", desc: "Вклады, ОФЗ, ИИС, БПИФ", emoji: "📈" },
              { href: "/credits", icon: CreditCard, color: "#FF9500", label: "Кредиты", desc: "Погашение, рефинансирование", emoji: "💳" },
              { href: "/fraud", icon: ShieldAlert, color: "#FF3B30", label: "Защита", desc: "Мошенничество, права", emoji: "🛡️" },
            ].map((section) => (
              <Link key={section.href} href={section.href}
                className="group flex flex-col gap-3 p-4 rounded-2xl bg-white border border-[#E5E5EA] hover:shadow-md transition-all"
                style={{"--hover-border": `${section.color}30`} as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${section.color}30`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E5EA")}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                    <section.icon className="w-5 h-5" style={{ color: section.color }} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#303030]">{section.label}</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5">{section.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick action cards (no data) */}
        {!hasData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { href: "/upload", icon: FileSpreadsheet, color: "#3629B7", title: "Загрузить выписку", desc: "CSV из Сбербанка, Тинькофф, Альфа-Банка" },
              { href: "/upload", icon: PenLine, color: "#34C759", title: "Ручной ввод", desc: "Доходы и расходы вручную. За пару минут." },
              { href: "/ai-consultant", icon: Brain, color: "#FF9500", title: "Спросить Кэшика", desc: "AI-помощник по финансам. Без сложных терминов." },
            ].map((item) => (
              <Link key={item.href + item.title} href={item.href} className="group">
                <Card className="h-full hover:shadow-md transition-all cursor-pointer" style={{ borderColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${item.color}30`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                >
                  <CardContent className="p-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${item.color}15` }}>
                      <item.icon className="w-6 h-6" style={{ color: item.color }} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#303030] mb-1">{item.title}</h3>
                    <p className="text-xs text-[#8E8E93] leading-relaxed">{item.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: item.color }}>
                      Открыть <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#3629B7]/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#3629B7]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Баланс</p>
              </div>
              <p className="text-2xl font-bold text-[#303030]">{fmt(totalBalance)}</p>
              <p className="text-xs text-[#8E8E93] mt-1">{accounts.length > 0 ? `${accounts.length} счетов` : "Счета не добавлены"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-[#34C759]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Доходы</p>
              </div>
              <p className="text-2xl font-bold text-[#34C759]">+{fmt(totalIncome)}</p>
              <p className="text-xs text-[#8E8E93] mt-1">{transactions.filter((t) => t.amount > 0).length} операций</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-[#FF3B30]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Расходы</p>
              </div>
              <p className="text-2xl font-bold text-[#FF3B30]">-{fmt(totalExpenses)}</p>
              <p className="text-xs text-[#8E8E93] mt-1">{transactions.filter((t) => t.amount < 0).length} операций</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#FF9500]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Откладываю</p>
              </div>
              <p className={`text-2xl font-bold ${savings >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                {savings >= 0 ? "+" : ""}{fmt(savings)}
              </p>
              <p className="text-xs text-[#8E8E93] mt-1">
                {totalIncome > 0 ? `${Math.round((savings / totalIncome) * 100)}% от дохода` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Center of actions + budget rebalance */}
        {insights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Action center */}
            <Card className="border border-[#E5E5EA]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                    <Zap className="w-4 h-4 text-[#3629B7]" />
                    Что сделать сейчас
                  </CardTitle>
                  <Link href="/losses" className="text-xs text-[#3629B7] hover:underline font-medium flex items-center gap-1">
                    Все действия <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {topActions.length === 0 ? (
                  <div className="text-center py-6">
                    <Upload className="w-8 h-8 text-[#8E8E93] mx-auto mb-2" />
                    <p className="text-sm text-[#8E8E93]">Загрузите данные — мы составим план действий</p>
                    <Link href="/upload">
                      <Button size="sm" className="mt-3 rounded-lg bg-[#3629B7] hover:bg-[#2a1f8f] text-white text-xs">
                        Загрузить выписку
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topActions.map((action, idx) => (
                      <Link key={action.id} href={action.actionLink}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors cursor-pointer group">
                          <div className="w-7 h-7 rounded-full bg-[#3629B7] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#303030] leading-tight truncate">{action.title}</p>
                            <p className="text-xs text-[#34C759] font-medium mt-0.5">{action.effect}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#8E8E93] shrink-0">
                            <Clock className="w-3 h-3" />
                            {action.deadline}
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#3629B7] transition-colors shrink-0" />
                        </div>
                      </Link>
                    ))}

                    {/* Loss/opportunity summary */}
                    {(insights.totalLossMonthly > 0 || insights.totalOpportunityYear > 0) && (
                      <div className="mt-3 pt-3 border-t border-[#E5E5EA] grid grid-cols-2 gap-2">
                        {insights.totalLossMonthly > 0 && (
                          <Link href="/losses">
                            <div className="p-2.5 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10 hover:border-[#FF3B30]/30 transition-colors">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30]" />
                                <span className="text-[10px] text-[#8E8E93]">Теряете/мес</span>
                              </div>
                              <p className="text-sm font-bold text-[#FF3B30]">−{fmt(insights.totalLossMonthly)}</p>
                            </div>
                          </Link>
                        )}
                        {insights.totalOpportunityYear > 0 && (
                          <Link href="/losses?tab=opportunities">
                            <div className="p-2.5 rounded-xl bg-[#34C759]/5 border border-[#34C759]/10 hover:border-[#34C759]/30 transition-colors">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Gift className="w-3.5 h-3.5 text-[#34C759]" />
                                <span className="text-[10px] text-[#8E8E93]">Можно вернуть/год</span>
                              </div>
                              <p className="text-sm font-bold text-[#34C759]">+{fmt(insights.totalOpportunityYear)}</p>
                            </div>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget rebalance */}
            <Card className="border border-[#E5E5EA]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                  <BarChart3 className="w-4 h-4 text-[#FF9500]" />
                  Структура бюджета
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hasData || monthlyIncome === 0 ? (
                  <div className="text-center py-6">
                    <BarChart3 className="w-8 h-8 text-[#8E8E93] mx-auto mb-2" />
                    <p className="text-sm text-[#8E8E93]">Добавьте доход в настройках или загрузите выписку</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Income bar */}
                    {[
                      { label: "Доход",           value: monthlyIncome,              color: "#34C759", pct: 100 },
                      { label: "Обязательные",     value: budget?.mandatory || 0,     color: "#3629B7", pct: ((budget?.mandatory || 0) / monthlyIncome) * 100 },
                      { label: "Гибкие расходы",  value: budget?.flexible || 0,      color: "#FF9500", pct: ((budget?.flexible || 0) / monthlyIncome) * 100 },
                      { label: "Откладываю",       value: Math.max(budget?.savings || 0, 0), color: "#34C759", pct: Math.max(((budget?.savings || 0) / monthlyIncome) * 100, 0) },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#8E8E93]">{row.label}</span>
                          <span className="text-xs font-semibold text-[#303030]">{fmt(row.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E5E5EA] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: row.color }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Recommendations */}
                    {budget?.recommendations && budget.recommendations.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {budget.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{
                            backgroundColor: rec.type === "good" ? "#34C75910" : rec.type === "warn" ? "#FF950010" : "#FF3B3010"
                          }}>
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{
                              backgroundColor: rec.type === "good" ? "#34C759" : rec.type === "warn" ? "#FF9500" : "#FF3B30"
                            }} />
                            <p className="text-xs leading-relaxed" style={{
                              color: rec.type === "good" ? "#34C759" : rec.type === "warn" ? "#FF9500" : "#FF3B30"
                            }}>{rec.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts — Interactive upgraded versions */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trendData.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                    <BarChart3 className="w-4 h-4 text-[#3629B7]" />
                    Доходы и расходы по месяцам
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34C759" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#34C759" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#FF3B30" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" strokeOpacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8E8E93" }} stroke="#E5E5EA" />
                        <YAxis tick={{ fontSize: 12, fill: "#8E8E93" }} stroke="#E5E5EA" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip
                          formatter={(value: number, name: string) => [fmt(value), name === "income" ? "Доходы" : "Расходы"]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #E5E5EA", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          cursor={{ stroke: "#8E8E93", strokeDasharray: "3 3", strokeOpacity: 0.3 }}
                        />
                        <Area type="monotone" dataKey="income" stroke="#34C759" fill="url(#incomeGrad)" strokeWidth={2.5} name="income"
                          dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#34C759" }} />
                        <Area type="monotone" dataKey="expenses" stroke="#FF3B30" fill="url(#expenseGrad)" strokeWidth={2.5} name="expenses"
                          dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#FF3B30" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {categoryData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                    <PieChartIcon className="w-4 h-4 text-[#3629B7]" />
                    По категориям
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[160px] sm:h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name"
                          paddingAngle={2}
                        >
                          {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} stroke={entry.color} strokeOpacity={0.5} />)}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [fmt(value), "Расходы"]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #E5E5EA", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {categoryData.slice(0, 5).map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-xs hover:bg-[#F5F5F7] rounded-lg px-1 py-0.5 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-[#8E8E93] truncate">{c.name}</span>
                        </div>
                        <span className="font-medium text-[#303030] shrink-0 ml-2">{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recent transactions */}
        {hasData && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#303030]">Последние операции</CardTitle>
                <Link href="/transactions" className="text-xs text-[#3629B7] hover:underline font-medium flex items-center gap-1">
                  Все операции <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {transactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 8)
                  .map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-[#F5F5F7] transition-colors">
                      <span className="text-xl w-8 text-center">{t.categoryIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#303030] truncate">{t.description || t.merchant}</p>
                        <p className="text-xs text-[#8E8E93]">{t.category} · {t.date}</p>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ${t.amount > 0 ? "text-[#34C759]" : "text-[#303030]"}`}>
                        {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                <Target className="w-4 h-4 text-[#FF9500]" />
                Ваши цели
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goals.map((g) => {
                  const progress = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                  return (
                    <div key={g.id} className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-[#303030]">{g.name}</p>
                        <p className="text-xs text-[#8E8E93]">до {g.deadline}</p>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex-1 h-2 rounded-full bg-[#E5E5EA] overflow-hidden">
                          <div className="h-full rounded-full bg-[#3629B7] transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-[#3629B7] shrink-0">{Math.round(progress)}%</span>
                      </div>
                      <p className="text-xs text-[#8E8E93]">{fmt(g.currentAmount)} из {fmt(g.targetAmount)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accounts */}
        {accounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                  <CreditCard className="w-4 h-4 text-[#3629B7]" />
                  Ваши счета
                </CardTitle>
                <Link href="/integrations" className="text-xs text-[#3629B7] hover:underline font-medium flex items-center gap-1">
                  Управлять <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {accounts.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-[#3629B7]">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#303030] truncate">{a.name}</p>
                        <p className="text-[10px] text-[#8E8E93]">
                          {a.type === "bank" ? "Банк" : a.type === "broker" ? "Брокер" : a.type === "wallet" ? "Кошелёк" : "Наличные"}
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-[#303030]">{fmt(a.balance)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TOP-5 СОВЕТОВ СЕЙЧАС + TOP-7 НА БУДУЩЕЕ ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* TOP-5 СЕЙЧАС */}
          <Card className="border border-[#E5E5EA]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                <Zap className="w-4 h-4 text-[#FF9500]" />
                Топ-5 действий прямо сейчас
              </CardTitle>
              <p className="text-xs text-[#8E8E93] mt-1">
                {tips.now.length > 0 ? "Персональные рекомендации на основе ваших данных — с обоснованием и цифрами" : "Загрузите данные для персональных рекомендаций"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {tips.now.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-[#8E8E93] mx-auto mb-2" />
                  <p className="text-sm text-[#8E8E93]">Добавьте счета или загрузите выписку</p>
                  <Link href="/upload"><Button size="sm" className="mt-3 rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white text-xs">Загрузить данные</Button></Link>
                </div>
              ) : tips.now.map((tip, idx) => (
                <Link key={tip.id} href={tip.actionLink}>
                  <div className="flex gap-3 p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors cursor-pointer group border border-transparent hover:border-[#E5E5EA]">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${tip.urgency === "high" ? "bg-[#FF3B30]" : tip.urgency === "medium" ? "bg-[#FF9500]" : "bg-[#3629B7]"}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#303030] leading-tight">{tip.title}</p>
                      <p className="text-xs text-[#8E8E93] mt-0.5 leading-relaxed line-clamp-2">{tip.rationale}</p>
                      {tip.amount && <p className={`text-xs font-semibold mt-1 ${tip.urgency === "high" ? "text-[#FF3B30]" : "text-[#34C759]"}`}>{tip.amount}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C7C7CC] group-hover:text-[#3629B7] transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* TOP-7 НА БУДУЩЕЕ */}
          <Card className="border border-[#E5E5EA]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                <TrendingUp className="w-4 h-4 text-[#34C759]" />
                Топ-7 советов на перспективу
              </CardTitle>
              <p className="text-xs text-[#8E8E93] mt-1">Стратегические шаги для роста благосостояния — с обоснованием и расчётами</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {tips.future.map((tip, idx) => (
                <Link key={tip.id} href={tip.actionLink}>
                  <div className="flex gap-3 p-2.5 rounded-xl hover:bg-[#F5F5F7] transition-colors cursor-pointer group">
                    <div className="w-6 h-6 rounded-lg bg-[#34C759]/15 flex items-center justify-center shrink-0 text-[#34C759] text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#303030] leading-tight">{tip.title}</p>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-relaxed line-clamp-2">{tip.rationale}</p>
                      {tip.amount && <p className="text-[11px] font-semibold text-[#3629B7] mt-0.5">{tip.amount}</p>}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#C7C7CC] group-hover:text-[#34C759] transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── ФИНАНСОВЫЙ ДАЙДЖЕСТ ─────────────────────────────────────────── */}
        <Card className="border border-[#E5E5EA]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                <Newspaper className="w-4 h-4 text-[#3629B7]" />
                Финансовый дайджест
                {digest?.fromCache && (
                  <span className="text-[9px] font-normal text-[#8E8E93] bg-[#F5F5F7] px-1.5 py-0.5 rounded-full">кэш</span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Live currency rates */}
                {digest?.liveRates && digest.liveRates.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2">
                    {digest.liveRates.map((r) => (
                      <div key={r.key} className="flex items-center gap-1 text-[10px] text-[#8E8E93] bg-[#F5F5F7] px-2 py-1 rounded-full">
                        <DollarSign className="w-2.5 h-2.5" />
                        {r.label}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={handleRefreshDigest} disabled={digestLoading}
                  className="flex items-center gap-1 text-[10px] text-[#8E8E93] bg-[#F5F5F7] hover:bg-[#E5E5EA] px-2 py-1 rounded-full transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${digestLoading ? "animate-spin" : ""}`} />
                  Обновить
                </button>
                <span className="text-[10px] text-[#8E8E93] bg-[#F5F5F7] px-2 py-1 rounded-full">30 июня 2026</span>
              </div>
            </div>
            <p className="text-xs text-[#8E8E93] mt-1">Ключевые события и их практический смысл для вашего кошелька</p>
            {/* Mobile live rates */}
            {digest?.liveRates && digest.liveRates.length > 0 && (
              <div className="sm:hidden flex items-center gap-2 mt-2">
                {digest.liveRates.map((r) => (
                  <div key={r.key} className="flex items-center gap-1 text-[10px] text-[#8E8E93] bg-[#F5F5F7] px-2 py-1 rounded-full">
                    <DollarSign className="w-2.5 h-2.5" />
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {digest ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {digest.items.map((n, i) => (
                  <div key={n.id || i} className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5EA] hover:border-[#D1D1D6] transition-colors space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: n.tagColor }}>
                        {n.emoji} {n.categoryLabel}
                      </span>
                      <span className="text-[10px] text-[#8E8E93] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(n.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#303030] leading-snug">{n.title}</p>
                    <p className="text-xs text-[#8E8E93] leading-relaxed flex-1">{n.summary}</p>
                    <div className="pt-1.5 border-t border-[#F0F0F5]">
                      <p className="text-[11px] text-[#3629B7] font-medium leading-relaxed">{n.impact}</p>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[#8E8E93] hover:text-[#3629B7] transition-colors">
                        <ExternalLink className="w-3 h-3 shrink-0" /> {n.source}
                      </a>
                      {n.actionPath && n.actionLabel && (
                        <Link href={n.actionPath}
                          className="text-[10px] font-semibold text-[#3629B7] hover:underline flex items-center gap-0.5">
                          {n.actionLabel} <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] animate-pulse h-36" />
                ))}
              </div>
            )}
            <p className="text-[10px] text-[#C7C7CC] mt-3 text-center">
              Источники: cbr.ru, banki.ru, smart-lab.ru, finuslugi.ru, minfin.gov.ru, moex.com, nalog.ru, domrfbank.ru · 30 июня 2026
              {digest?.liveRates && digest.liveRates.length > 0 && " · Курсы ЦБ РФ в реальном времени"}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* ── Платформа университетского технологического предпринимательства ── */}
      <div className="mt-8 bg-[#F0F5FF] border border-[#D6E4FF] rounded-2xl">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <rect width="100" height="100" rx="16" fill="#2563EB"/>
                <path d="M30 60 L50 35 L70 60" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M30 70 L50 45 L70 70" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <div>
                <p className="text-[10px] font-bold text-[#1E40AF] leading-tight">
                  ПЛАТФОРМА УНИВЕРСИТЕТСКОГО<br />ТЕХНОЛОГИЧЕСКОГО ПРЕДПРИНИМАТЕЛЬСТВА
                </p>
                <p className="text-[8px] text-[#3B82F6]">федеральный проект «Технологии»</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-[#3B82F6]">
              <span className="inline-block w-1 h-1 rounded-full bg-[#3B82F6]" />
              Программа «Студенческий стартап» Фонда содействия инновациям
            </div>
          </div>
        </div>
      </div>

    </AppShell>
  );
}
