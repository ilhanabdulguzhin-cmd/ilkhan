"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import {
  getPersonalizedProducts,
  ALL_PRODUCTS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPE_EMOJI,
  getBankLogoStyle,
  formatRate,
  type BankProduct,
  type ProductMatch,
  type ProductType,
} from "@/lib/bank-products";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Star,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Info,
  CreditCard,
  Filter,
  ShieldCheck,
} from "lucide-react";

const TYPE_FILTERS: { id: ProductType | "all"; label: string; emoji: string }[] = [
  { id: "all",      label: "Все",          emoji: "✨" },
  { id: "card",     label: "Карты",        emoji: "💳" },
  { id: "deposit",  label: "Вклады",       emoji: "🏦" },
  { id: "mortgage", label: "Ипотека",      emoji: "🏠" },
  { id: "invest",   label: "Инвестиции",   emoji: "📈" },
];

const TAG_LABELS: Record<string, string> = {
  "best-cashback": "Лучший кешбэк",
  "no-fee":        "Бесплатная",
  "family":        "Для семьи",
  "entrepreneur":  "Для ИП",
  "high-rate":     "Высокая ставка",
  "low-rate":      "Льготная ставка",
  "popular":       "Популярное",
  "digital":       "Онлайн",
  "premium":       "Премиум",
  "beginner":      "Для новичков",
  "miles":         "Мили",
  "loyalty":       "Лояльность",
  "cashback-rub":  "Кешбэк ₽",
};

const TAG_COLORS: Record<string, string> = {
  "best-cashback": "#3629B7",
  "no-fee":        "#34C759",
  "family":        "#FF9500",
  "entrepreneur":  "#007AFF",
  "high-rate":     "#34C759",
  "low-rate":      "#34C759",
  "popular":       "#8E8E93",
  "digital":       "#007AFF",
  "premium":       "#FF9500",
  "beginner":      "#34C759",
  "miles":         "#3629B7",
  "loyalty":       "#FF9500",
  "cashback-rub":  "#3629B7",
};

function BankLogo({ product }: { product: BankProduct }) {
  const logo = getBankLogoStyle(product);
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 leading-none"
      style={{ backgroundColor: logo.bg, color: logo.text }}
    >
      {logo.label}
    </div>
  );
}

function ProductCard({
  match,
  rank,
  isPersonalized,
}: {
  match: ProductMatch;
  rank?: number;
  isPersonalized: boolean;
}) {
  const { product, reasons } = match;
  const [expanded, setExpanded] = useState(false);

  const rateStr =
    product.type === "deposit"
      ? `До ${product.depositRateMax}%`
      : product.type === "mortgage" || product.type === "loan"
      ? `От ${product.loanRateMin}%`
      : product.type === "invest"
      ? `${formatRate(product.investYieldMin, product.investYieldMax)}`
      : product.cashbackBase
      ? `До ${product.cashbackBase}%`
      : null;

  const rateLabel =
    product.type === "deposit" || product.type === "mortgage" || product.type === "loan"
      ? "годовых"
      : product.type === "invest"
      ? "доходность"
      : "кешбэк базовый";

  const emoji = PRODUCT_TYPE_EMOJI[product.type];

  return (
    <Card className="border border-[#E5E5EA] hover:border-[#3629B7]/30 hover:shadow-md transition-all overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          <BankLogo product={product} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[#8E8E93] mb-0.5">{product.bank}</p>
                <p className="text-sm font-bold text-[#303030] leading-tight">{product.name}</p>
              </div>
              {rank !== undefined && rank < 3 && (
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#FF9500] flex items-center justify-center">
                  <Star className="w-3 h-3 text-white fill-white" />
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5F5F7] text-[#8E8E93]">
                {emoji} {PRODUCT_TYPE_LABELS[product.type]}
              </span>
              {product.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${TAG_COLORS[tag] || "#8E8E93"}15`, color: TAG_COLORS[tag] || "#8E8E93" }}
                >
                  {TAG_LABELS[tag] || tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="px-4 pb-2">
          <p className="text-sm text-[#303030] font-medium">{product.headline}</p>
        </div>

        {/* Rate / key number */}
        {rateStr && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-[#F5F5F7] flex items-center gap-3 flex-wrap">
            <div className="text-center">
              <p className="text-xl font-black text-[#3629B7]">{rateStr}</p>
              <p className="text-[10px] text-[#8E8E93]">{rateLabel}</p>
            </div>
            {product.type === "deposit" && product.depositTermMonths && (
              <div className="border-l border-[#E5E5EA] pl-3">
                <p className="text-xs text-[#8E8E93]">Сроки</p>
                <p className="text-xs font-medium text-[#303030]">
                  {product.depositTermMonths.includes(0)
                    ? "Бессрочный"
                    : product.depositTermMonths.map((m) => `${m} мес`).join(", ")}
                </p>
              </div>
            )}
            {product.type === "card" && product.annualFee === 0 && (
              <div className="border-l border-[#E5E5EA] pl-3">
                <p className="text-xs text-[#8E8E93]">Обслуживание</p>
                <p className="text-xs font-medium text-[#34C759]">Бесплатно</p>
              </div>
            )}
            {product.type === "card" && product.cashbackCategories && product.cashbackCategories.length > 0 && (
              <div className="border-l border-[#E5E5EA] pl-3 min-w-0">
                <p className="text-xs text-[#8E8E93]">Топ кешбэк</p>
                <p className="text-xs font-medium text-[#303030] truncate">
                  {product.cashbackCategories[0]?.emoji} {product.cashbackCategories[0]?.rate}% — {product.cashbackCategories[0]?.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bonus program */}
        {product.bonusProgram && !expanded && (
          <div className="px-4 pb-3">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FF9500]/5 border border-[#FF9500]/10">
              <span className="text-sm shrink-0">🎁</span>
              <p className="text-xs text-[#303030]"><strong>{product.bonusProgram.name}:</strong> {product.bonusProgram.description}</p>
            </div>
          </div>
        )}

        {/* Welcome bonus */}
        {product.welcomeBonus && !expanded && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#34C759]/5">
              <span className="text-sm">🎉</span>
              <p className="text-xs text-[#34C759]">{product.welcomeBonus}</p>
            </div>
          </div>
        )}

        {/* Personalization reasons */}
        {isPersonalized && reasons.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#3629B7]/5 border border-[#3629B7]/10">
              <Sparkles className="w-3.5 h-3.5 text-[#3629B7] shrink-0 mt-0.5" />
              <p className="text-xs text-[#3629B7] leading-relaxed">{reasons[0]}</p>
            </div>
          </div>
        )}

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 border-t border-[#F5F5F7] text-xs text-[#8E8E93] hover:bg-[#F5F5F7] transition-colors"
        >
          <span>{expanded ? "Скрыть детали" : "Подробнее"}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#F5F5F7]">
            {/* All cashback categories */}
            {product.cashbackCategories && product.cashbackCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#303030] mb-2">Кешбэк по категориям</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {product.cashbackCategories.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F5F7]">
                      <span>{cat.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#8E8E93] truncate">{cat.name}</p>
                        <p className="text-xs font-bold text-[#3629B7]">{cat.rate}%
                          {cat.maxMonthly && <span className="font-normal text-[#8E8E93]"> до {cat.maxMonthly.toLocaleString("ru-RU")} ₽</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cashback max */}
            {product.cashbackMaxMonthly && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F5F7]">
                <Info className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                <p className="text-xs text-[#8E8E93]">Лимит кешбэка: до {product.cashbackMaxMonthly.toLocaleString("ru-RU")} ₽/мес</p>
              </div>
            )}

            {/* Fee waiver */}
            {product.feeWaiverCondition && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#34C759]/5">
                <Info className="w-3.5 h-3.5 text-[#34C759] shrink-0 mt-0.5" />
                <p className="text-xs text-[#34C759]"><strong>Бесплатно при условии:</strong> {product.feeWaiverCondition}</p>
              </div>
            )}

            {/* Welcome bonus */}
            {product.welcomeBonus && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#3629B7]/5">
                <span className="text-sm">🎉</span>
                <p className="text-xs text-[#3629B7]"><strong>Приветственный бонус:</strong> {product.welcomeBonus}</p>
              </div>
            )}

            {/* Bonus program full */}
            {product.bonusProgram && (
              <div className="p-2.5 rounded-lg bg-[#FF9500]/5 border border-[#FF9500]/10 space-y-1">
                <p className="text-xs font-medium text-[#303030]">🎁 {product.bonusProgram.name}</p>
                <p className="text-xs text-[#8E8E93]">{product.bonusProgram.description}</p>
                {product.bonusProgram.partnerCount && (
                  <p className="text-xs font-medium text-[#FF9500]">{product.bonusProgram.partnerCount.toLocaleString("ru-RU")} партнёров</p>
                )}
              </div>
            )}

            {/* Compliance note */}
            {product.complianceNote && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#34C759]/5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34C759] shrink-0 mt-0.5" />
                <p className="text-xs text-[#34C759]">{product.complianceNote}</p>
              </div>
            )}

            {/* Pros & Cons */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-[#303030] mb-1.5">Плюсы</p>
                <div className="space-y-1">
                  {product.pros.map((p, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#34C759] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#8E8E93] leading-tight">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[#303030] mb-1.5">Минусы</p>
                <div className="space-y-1">
                  {product.cons.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 text-[#FF3B30] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#8E8E93] leading-tight">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <a href={product.applyUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full h-9 rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white text-sm font-medium">
                Подать заявку
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </a>
            <p className="text-[10px] text-[#8E8E93] text-center">
              Данные обновлены {new Date(product.updatedAt).toLocaleDateString("ru-RU")}. Актуальные условия — на сайте банка.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProductsPage() {
  const { userData } = useAuth();
  const [typeFilter, setTypeFilter] = useState<ProductType | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const profile = userData?.profile;
  const transactions = userData?.transactions || [];

  const personalized = useMemo(() => {
    if (!profile) return [];
    return getPersonalizedProducts(profile, transactions, 24);
  }, [profile, transactions]);

  const filtered = useMemo(() => {
    const source = showAll
      ? ALL_PRODUCTS.map((p) => ({ product: p, score: 50, reasons: [] as string[], matchedCategories: [] as string[] }))
      : personalized;
    if (typeFilter === "all") return source;
    return source.filter((m) => m.product.type === typeFilter);
  }, [personalized, typeFilter, showAll]);

  const segmentLabel = profile?.segment === "family" ? "семьи"
    : profile?.segment === "entrepreneur" ? "предпринимателей"
    : "вас";

  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.amount < 0).forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 3).map(([k]) => k);
  }, [transactions]);

  return (
    <AppShell>
      <div className="space-y-5 max-w-[1200px]">

        {/* Hero */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3629B7] to-[#2a1f8f] text-white">
          <CardContent className="p-5 md:p-6 relative">
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 blur-[80px]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-medium text-white/60">Персональный подбор</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                Банковские продукты для {segmentLabel}
              </h2>
              <p className="text-sm text-white/60 mb-4 max-w-lg">
                Подобраны на основе ваших расходов и профиля. Только актуальные предложения без рекламы.
              </p>

              {/* Profile chips */}
              <div className="flex flex-wrap gap-2">
                {profile?.segment && (
                  <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-white/80">
                    {profile.segment === "family" ? "👨‍👩‍👧 Семья" : profile.segment === "entrepreneur" ? "💼 Предприниматель" : "👤 Личный бюджет"}
                  </span>
                )}
                {profile?.monthlyIncome && (
                  <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-white/80">
                    💰 Доход {profile.monthlyIncome.toLocaleString("ru-RU")} ₽/мес
                  </span>
                )}
                {topCategories.map((cat) => (
                  <span key={cat} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/60">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No data nudge */}
        {transactions.length === 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FF9500]/8 border border-[#FF9500]/15">
            <Info className="w-4 h-4 text-[#FF9500] shrink-0" />
            <p className="text-sm text-[#FF9500]">
              Загрузите выписку — и мы подберём продукты точно под ваши категории расходов.{" "}
              <Link href="/upload" className="underline font-medium">Загрузить</Link>
            </p>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 bg-white rounded-xl border border-[#E5E5EA] flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id as ProductType | "all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  typeFilter === f.id
                    ? "bg-[#3629B7] text-white shadow-sm"
                    : "text-[#8E8E93] hover:text-[#303030] hover:bg-[#F5F5F7]"
                }`}
              >
                <span>{f.emoji}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAll(!showAll)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
              showAll
                ? "border-[#3629B7] text-[#3629B7] bg-[#3629B7]/5"
                : "border-[#E5E5EA] text-[#8E8E93] hover:border-[#3629B7]/30 hover:text-[#3629B7] bg-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{showAll ? "Только для меня" : "Показать все"}</span>
          </button>
        </div>

        {/* Personalized label */}
        {!showAll && filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3629B7]" />
            <p className="text-sm font-medium text-[#303030]">
              {filtered.length} продуктов подобраны лично для вас
            </p>
            <span className="text-xs text-[#8E8E93]">· на основе ваших данных</span>
          </div>
        )}

        {/* Products grid */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <CreditCard className="w-12 h-12 text-[#8E8E93] mx-auto mb-3" />
              <p className="text-sm text-[#8E8E93]">Нет продуктов для выбранного фильтра</p>
              <Button
                onClick={() => setTypeFilter("all")}
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg"
              >
                Сбросить фильтр
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((match, i) => (
              <ProductCard
                key={match.product.id}
                match={match}
                rank={i}
                isPersonalized={!showAll}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-[#8E8E93] text-center pb-2">
          Данные носят информационный характер. Актуальные условия — на официальных сайтах банков. Обновлено: март 2026.
        </p>
      </div>
    </AppShell>
  );
}
