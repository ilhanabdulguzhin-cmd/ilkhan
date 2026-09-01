"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import {
  Repeat,
  AlertTriangle,
  Calendar,
  Wallet,
  Upload,
  PenLine,
  ArrowRight,
  Eye,
  Sparkles,
  Shield,
  TrendingDown,
  CreditCard,
  Star,
  ExternalLink,
  Percent,
} from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["#3629B7", "#4a3dd4", "#007AFF", "#34C759", "#FF9500", "#FF3B30", "#8E8E93"];

// ── Cashback card data (March 2026) ───────────────────────────────────────────
const CASHBACK_CARDS = [
  {
    name: "Т-Банк Блэк",
    bank: "Т-Банк",
    tag: "Универсальная",
    tagColor: "#FF9500",
    mainCashback: "до 15%",
    categories: [
      { label: "В 3 выбранных категориях", pct: "до 15%" },
      { label: "На всё остальное", pct: "1%" },
      { label: "Рестораны (нет в категориях)", pct: "1%" },
    ],
    cost: "Бесплатно",
    condition: "Остаток от 50 000 ₽ или 299 ₽/мес",
    bonus: "До 17% на остаток по счёту",
    url: "https://www.tbank.ru/cards/debit-cards/tinkoff-black/",
    highlight: true,
  },
  {
    name: "Альфа-Карта Cash Back",
    bank: "Альфа-Банк",
    tag: "АЗС и кафе",
    tagColor: "#FF3B30",
    mainCashback: "до 10%",
    categories: [
      { label: "АЗС", pct: "10%" },
      { label: "Кафе и рестораны", pct: "5%" },
      { label: "На всё остальное", pct: "1%" },
    ],
    cost: "Бесплатно",
    condition: "Траты от 10 000 ₽/мес",
    bonus: undefined,
    url: "https://alfabank.ru/everyday/debit-cards/alfacard/",
    highlight: false,
  },
  {
    name: "Ozon Карта",
    bank: "Озон Банк",
    tag: "Онлайн-покупки",
    tagColor: "#007AFF",
    mainCashback: "до 7%",
    categories: [
      { label: "Покупки на Ozon", pct: "7%" },
      { label: "Супермаркеты", pct: "3%" },
      { label: "На всё остальное", pct: "1%" },
    ],
    cost: "Бесплатно",
    condition: "Без условий",
    bonus: "Бонусы Ozon Premium совместимы",
    url: "https://finance.ozon.ru/bankovskie-karty",
    highlight: false,
  },
  {
    name: "Халва",
    bank: "Совкомбанк",
    tag: "Рассрочка",
    tagColor: "#AF52DE",
    mainCashback: "до 6%",
    categories: [
      { label: "У партнёров (250 000+)", pct: "0–6% кешбэк" },
      { label: "Рассрочка 0%", pct: "до 24 мес" },
      { label: "Вне партнёров", pct: "1%" },
    ],
    cost: "Бесплатно",
    condition: "Без условий",
    bonus: "Платите частями без переплаты",
    url: "https://sovcombank.ru/cards/rassrochki/halva",
    highlight: false,
  },
  {
    name: "ВТБ Мультикарта",
    bank: "ВТБ",
    tag: "Выбор категории",
    tagColor: "#007AFF",
    mainCashback: "до 5%",
    categories: [
      { label: "Одна категория на выбор", pct: "до 5%" },
      { label: "Рестораны или АЗС или др.", pct: "5%" },
      { label: "На всё остальное", pct: "1%" },
    ],
    cost: "Бесплатно",
    condition: "Траты от 5 000 ₽/мес",
    bonus: undefined,
    url: "https://www.vtb.ru/personal/karty/debetovye/multikarta/",
    highlight: false,
  },
  {
    name: "ПСБ Двойной кешбэк",
    bank: "Промсвязьбанк",
    tag: "Двойной кешбэк",
    tagColor: "#34C759",
    mainCashback: "до 5%",
    categories: [
      { label: "Фиксированный кешбэк", pct: "2%" },
      { label: "Повышенный в категории", pct: "+3%" },
      { label: "У партнёров ПСБ", pct: "до 15%" },
    ],
    cost: "Бесплатно",
    condition: "Траты от 10 000 ₽/мес",
    bonus: "Для военнослужащих особые условия",
    url: "https://www.psbank.ru/personal/cards",
    highlight: false,
  },
];

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

interface DetectedSub {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  categoryIcon: string;
  frequency: string;
  lastDate: string;
  count: number;
  active: boolean;
}

export default function SubscriptionsPage() {
  const { userData } = useAuth();
  const transactions = userData?.transactions || [];

  // Detect subscriptions from real transactions with frequency analysis
  const detected = useMemo(() => {
    const merchantMap: Record<string, { amounts: number[]; dates: string[]; category: string; icon: string }> = {};

    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const key = (t.merchant || t.description || "").trim().toLowerCase().slice(0, 40);
        if (!key) return;
        if (!merchantMap[key]) {
          merchantMap[key] = { amounts: [], dates: [], category: t.category, icon: t.categoryIcon };
        }
        merchantMap[key].amounts.push(Math.abs(t.amount));
        merchantMap[key].dates.push(t.date);
      });

    const detectFrequency = (sortedDates: string[]): { label: string; multiplier: number } => {
      if (sortedDates.length < 2) return { label: "ежемесячно", multiplier: 1 };
      const gaps: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
        gaps.push(diff);
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      if (avgGap < 10) return { label: "еженедельно", multiplier: 4.3 };
      if (avgGap < 20) return { label: "каждые 2 недели", multiplier: 2.15 };
      if (avgGap < 45) return { label: "ежемесячно", multiplier: 1 };
      if (avgGap < 100) return { label: "ежеквартально", multiplier: 0.33 };
      return { label: "ежегодно", multiplier: 1 / 12 };
    };

    const subs: DetectedSub[] = [];
    for (const [merchant, data] of Object.entries(merchantMap)) {
      if (data.amounts.length < 2) continue;
      const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
      // Allow up to 20% variance for subscriptions (prices can change slightly)
      const isConsistent = data.amounts.every((a) => Math.abs(a - avgAmount) / avgAmount < 0.2);
      if (!isConsistent) continue;

      const sortedDates = [...data.dates].sort();
      const freq = detectFrequency(sortedDates);
      const monthlyEquivalent = Math.round(avgAmount * freq.multiplier);

      subs.push({
        id: merchant,
        merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
        amount: monthlyEquivalent,
        category: data.category,
        categoryIcon: data.icon,
        frequency: freq.label,
        lastDate: sortedDates[sortedDates.length - 1],
        count: data.amounts.length,
        active: true,
      });
    }

    // Sort by amount descending
    return subs.sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const [subStates, setSubStates] = useState<Record<string, boolean>>({});

  const getActive = (sub: DetectedSub) => subStates[sub.id] ?? sub.active;
  const activeSubs = detected.filter((s) => getActive(s));
  const totalMonthly = activeSubs.reduce((s, sub) => s + sub.amount, 0);
  const totalYearly = totalMonthly * 12;

  const chartData = activeSubs.map((s, i) => ({
    name: s.merchant,
    value: s.amount,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const toggleSub = (id: string) => {
    setSubStates((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? detected.find((s) => s.id === id)?.active ?? true),
    }));
  };

  // Empty state
  if (transactions.length === 0) {
    return (
      <AppShell>
        <div className="max-w-[600px] mx-auto py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#3629B7]/10 to-[#4a3dd4]/10 flex items-center justify-center mb-6 border border-[#3629B7]/10">
            <Repeat className="w-9 h-9 text-[#3629B7]" />
          </div>
          <h2 className="text-2xl font-bold text-[#303030] mb-2">Ваши подписки</h2>
          <p className="text-sm text-[#8E8E93] mb-2 max-w-md mx-auto">
            Загрузите выписку из банка, и мы автоматически найдём все ваши регулярные платежи: подписки, абонементы, ежемесячные списания.
          </p>
          <p className="text-xs text-[#8E8E93] mb-8">
            Вы удивитесь, сколько денег уходит на подписки каждый месяц
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/upload">
              <Button className="rounded-xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] text-white font-semibold shadow-lg shadow-[#3629B7]/20">
                <Upload className="w-4 h-4 mr-2" /> Загрузить выписку
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" className="rounded-xl">
                <PenLine className="w-4 h-4 mr-2" /> Добавить вручную
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (detected.length === 0) {
    return (
      <AppShell>
        <div className="max-w-[600px] mx-auto py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#34C759]/10 flex items-center justify-center mb-6">
            <Sparkles className="w-9 h-9 text-[#34C759]" />
          </div>
          <h2 className="text-xl font-bold text-[#303030] mb-2">Подписки не найдены</h2>
          <p className="text-sm text-[#8E8E93] mb-6 max-w-md mx-auto">
            Мы проверили ваши {transactions.length} операций и не нашли регулярных списаний. Это отличная новость — вы не тратите лишнего на подписки!
          </p>
          <Link href="/upload">
            <Button variant="outline" className="rounded-xl">
              Загрузить ещё данные
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1200px]">
        <div>
          <h2 className="text-2xl font-bold text-[#303030]">Ваши подписки</h2>
          <p className="text-sm text-[#8E8E93] mt-1">
            Мы нашли {detected.length} регулярных платежей в ваших операциях. Отключите ненужные и начните экономить.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#3629B7]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="w-4 h-4 text-[#3629B7]" />
                <p className="text-sm text-[#8E8E93]">Найдено подписок</p>
              </div>
              <p className="text-2xl font-bold text-[#303030]">{detected.length}</p>
              <p className="text-xs text-[#8E8E93]">{activeSubs.length} активных</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-[#FF9500]" />
                <p className="text-sm text-[#8E8E93]">В месяц</p>
              </div>
              <p className="text-2xl font-bold text-[#303030]">{fmt(totalMonthly)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#FF3B30]" />
                <p className="text-sm text-[#8E8E93]">В год</p>
              </div>
              <p className="text-2xl font-bold text-[#FF3B30]">{fmt(totalYearly)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#34C759]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-[#34C759]" />
                <p className="text-sm text-[#8E8E93]">Можно сэкономить</p>
              </div>
              <p className="text-2xl font-bold text-[#34C759]">
                {fmt(detected.filter((s) => !getActive(s)).reduce((sum, s) => sum + s.amount, 0))}
              </p>
              <p className="text-xs text-[#8E8E93]">отключив ненужные</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscriptions list */}
          <div className="lg:col-span-2 space-y-3">
            {detected.map((s) => {
              const isActive = getActive(s);
              return (
                <Card key={s.id} className={!isActive ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl w-10 text-center">{s.categoryIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#303030] truncate">{s.merchant}</p>
                          <Badge variant="secondary" className="text-[10px] py-0">{s.category}</Badge>
                          {!isActive && (
                            <Badge variant="secondary" className="text-[10px] py-0 bg-[#FF9500]/10 text-[#FF9500]">
                              Отключена
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#8E8E93]">
                          <span className="flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> {s.frequency}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Последний: {new Date(s.lastDate).toLocaleDateString("ru-RU")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Найдено {s.count} раз
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-[#303030]">{fmt(s.amount)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Switch checked={isActive} onCheckedChange={() => toggleSub(s.id)} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Pie chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#303030]">Куда уходят деньги</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => fmt(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {chartData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-[#8E8E93] text-xs truncate max-w-[140px]">{d.name}</span>
                        </div>
                        <span className="font-medium text-[#303030] text-xs">{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tip */}
            <Card className="border-l-4 border-l-[#FF9500]">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF9500] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#303030]">Знали ли вы?</p>
                    <p className="text-xs text-[#8E8E93] mt-1">
                      В среднем люди тратят на подписки на 30% больше, чем думают. Отключите те, которыми не пользуетесь, и экономьте <span className="font-semibold text-[#34C759]">{fmt(totalMonthly * 12)}</span> в год.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#34C759]">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#34C759] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#303030]">Данные в безопасности</p>
                    <p className="text-xs text-[#8E8E93] mt-1">
                      Подписки найдены по вашим операциям, которые хранятся только на вашем устройстве.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* ── КЕШБЭК СРАВНЕНИЕ ────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xl font-bold text-[#303030] mb-1 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#FF9500]" />
            Сравнение карт с кешбэком — март 2026
          </h3>
          <p className="text-sm text-[#8E8E93] mb-4">
            Реальные актуальные условия. Выберите карту под ваши главные категории расходов.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {CASHBACK_CARDS.map((card) => (
              <Card key={card.name} className={`overflow-hidden hover:shadow-md transition-all ${card.highlight ? "ring-2 ring-[#3629B7]/30" : ""}`}>
                {card.highlight && (
                  <div className="bg-[#3629B7] text-white text-[10px] font-semibold text-center py-1 flex items-center justify-center gap-1">
                    <Star className="w-3 h-3" /> Редакторский выбор
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#303030] text-sm">{card.name}</p>
                      <p className="text-xs text-[#8E8E93]">{card.bank}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: card.tagColor + "20", color: card.tagColor }}>
                      {card.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-[#FF9500]" />
                    <span className="text-lg font-black text-[#303030]">{card.mainCashback}</span>
                    <span className="text-xs text-[#8E8E93]">макс. кешбэк</span>
                  </div>
                  <div className="space-y-1">
                    {card.categories.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[#8E8E93]">{c.label}</span>
                        <span className="font-semibold text-[#303030]">{c.pct}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[#F5F5F7] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8E8E93]">Стоимость</span>
                      <span className={`font-semibold ${card.cost === "Бесплатно" ? "text-[#34C759]" : "text-[#303030]"}`}>{card.cost}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8E8E93]">Условие</span>
                      <span className="text-[#303030] text-right max-w-[60%]">{card.condition}</span>
                    </div>
                    {card.bonus && (
                      <p className="text-[10px] text-[#3629B7] font-medium bg-[#3629B7]/5 rounded-lg px-2 py-1">{card.bonus}</p>
                    )}
                  </div>
                  <a href={card.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-xs mt-1 gap-1.5 border-[#E5E5EA] hover:border-[#3629B7]/40 hover:text-[#3629B7]">
                      Подробнее <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[10px] text-[#C7C7CC] mt-3">Информация актуальна на март 2026. Условия могут меняться — проверяйте на сайтах банков перед оформлением.</p>
        </div>

      </div>
    </AppShell>
  );
}
