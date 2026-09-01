"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { computeInsights } from "@/lib/user-store";
import type { LossItem, OpportunityItem, ActionItem } from "@/lib/user-store";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TrendingDown,
  Gift,
  Zap,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Upload,
  CreditCard,
  Repeat,
  Calculator,
  Brain,
  BarChart3,
  Wallet,
  TrendingUp,
  Star,
  Info,
} from "lucide-react";

function fmt(n: number) {
  return Math.round(Math.abs(n)).toLocaleString("ru-RU") + " ₽";
}

const LOSS_TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  subscription: { icon: Repeat,       color: "#3629B7", bg: "#3629B7", label: "Подписки" },
  impulse:      { icon: Zap,          color: "#FF9500", bg: "#FF9500", label: "Импульс" },
  growth:       { icon: TrendingDown, color: "#FF3B30", bg: "#FF3B30", label: "Рост" },
  commission:   { icon: CreditCard,   color: "#8E8E93", bg: "#8E8E93", label: "Комиссии" },
  overweight:   { icon: BarChart3,    color: "#FF9500", bg: "#FF9500", label: "Перевес" },
};

const OPP_TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  deduction: { icon: Calculator, color: "#34C759", label: "Вычет" },
  cashback:  { icon: Star,        color: "#FF9500", label: "Кешбэк" },
  tariff:    { icon: Wallet,      color: "#007AFF", label: "Тариф" },
  benefit:   { icon: Gift,        color: "#3629B7", label: "Льгота" },
  optimize:  { icon: TrendingUp,  color: "#34C759", label: "Оптимизация" },
};

const DIFFICULTY_META = {
  easy:   { label: "Легко", color: "#34C759" },
  medium: { label: "Средне", color: "#FF9500" },
  hard:   { label: "Сложно", color: "#FF3B30" },
};

function LossCard({ loss }: { loss: LossItem }) {
  const meta = LOSS_TYPE_META[loss.type] || LOSS_TYPE_META.impulse;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E5E5EA] bg-white hover:border-[#FF3B30]/20 hover:shadow-sm transition-all">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.bg}12` }}>
        <Icon className="w-5 h-5" style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-[#303030] leading-tight">{loss.title}</p>
          <Badge className="shrink-0 text-[10px] font-medium px-2 py-0.5" style={{ backgroundColor: `${meta.bg}15`, color: meta.color, border: "none" }}>
            {meta.label}
          </Badge>
        </div>
        <p className="text-xs text-[#8E8E93] leading-relaxed mb-3">{loss.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#FF3B30]">
            −{fmt(loss.amountMonthly)}/мес = −{fmt(loss.amountMonthly * 12)}/год
          </span>
          <Link href={loss.actionLink}>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3 rounded-lg border-[#E5E5EA] hover:border-[#3629B7]/40 hover:text-[#3629B7]">
              {loss.actionLabel}
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function OppCard({ opp }: { opp: OpportunityItem }) {
  const meta = OPP_TYPE_META[opp.type] || OPP_TYPE_META.optimize;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E5E5EA] bg-white hover:border-[#34C759]/20 hover:shadow-sm transition-all">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}12` }}>
        <Icon className="w-5 h-5" style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-[#303030] leading-tight">{opp.title}</p>
          <Badge className="shrink-0 text-[10px] font-medium px-2 py-0.5" style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: "none" }}>
            {meta.label}
          </Badge>
        </div>
        <p className="text-xs text-[#8E8E93] leading-relaxed mb-3">{opp.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#34C759]">
            +до {fmt(opp.potentialSaving)}/год
          </span>
          <Link href={opp.actionLink}>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3 rounded-lg border-[#E5E5EA] hover:border-[#34C759]/40 hover:text-[#34C759]">
              {opp.actionLabel}
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action, idx }: { action: ActionItem; idx: number }) {
  const diff = DIFFICULTY_META[action.difficulty];
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E5E5EA] bg-white hover:border-[#3629B7]/20 hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-full bg-[#3629B7] flex items-center justify-center shrink-0 text-white text-xs font-bold">
        {idx + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#303030] mb-1">{action.title}</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium text-[#34C759]">{action.effect}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${diff.color}15`, color: diff.color }}>
            {diff.label}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-[#8E8E93]">
            <Clock className="w-3 h-3" />
            {action.deadline}
          </div>
        </div>
        <Link href={action.actionLink}>
          <Button size="sm" className="h-8 text-xs px-4 rounded-lg bg-[#3629B7] hover:bg-[#2a1f8f] text-white">
            {action.actionLabel}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function LossesPage() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<"losses" | "opportunities" | "actions">("losses");

  const insights = useMemo(() => {
    if (!userData) return null;
    return computeInsights(userData);
  }, [userData]);

  const hasData = (userData?.transactions?.length ?? 0) > 0;

  return (
    <AppShell>
      <div className="space-y-5 max-w-[900px]">

        {/* Hero */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3629B7] to-[#2a1f8f] text-white">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-[100px]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-medium text-white/70">Финансовая диагностика</span>
              </div>
              <h2 className="text-2xl font-bold mb-1">Потери и возможности</h2>
              <p className="text-sm text-white/60 max-w-lg">
                Где вы теряете деньги, какие возможности упускаете и что нужно сделать прямо сейчас
              </p>
              {insights && (
                <div className="flex gap-4 mt-4">
                  {insights.totalLossMonthly > 0 && (
                    <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                      <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Теряете в месяц</p>
                      <p className="text-lg font-bold text-red-300">−{fmt(insights.totalLossMonthly)}</p>
                    </div>
                  )}
                  {insights.totalOpportunityYear > 0 && (
                    <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                      <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Можно вернуть/год</p>
                      <p className="text-lg font-bold text-green-300">+{fmt(insights.totalOpportunityYear)}</p>
                    </div>
                  )}
                  {insights.actions.length > 0 && (
                    <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                      <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Действий</p>
                      <p className="text-lg font-bold text-white">{insights.actions.length}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* No data state */}
        {!hasData && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#3629B7]/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-[#3629B7]" />
              </div>
              <h3 className="text-lg font-bold text-[#303030] mb-2">Загрузите данные для диагностики</h3>
              <p className="text-sm text-[#8E8E93] mb-6 max-w-sm mx-auto">
                Чтобы найти ваши потери и возможности, нужно видеть ваши операции. Загрузите выписку — это займёт 1 минуту.
              </p>
              <Link href="/upload">
                <Button className="bg-[#3629B7] hover:bg-[#2a1f8f] text-white rounded-xl px-6">
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить выписку
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {insights && (
          <>
            <div className="flex gap-1 p-1 bg-white rounded-xl border border-[#E5E5EA] w-fit">
              {[
                { id: "losses" as const, label: "Где я теряю", icon: TrendingDown, count: insights.losses.length, countColor: "#FF3B30" },
                { id: "opportunities" as const, label: "Что мне положено", icon: Gift, count: insights.opportunities.length, countColor: "#34C759" },
                { id: "actions" as const, label: "Что делать сейчас", icon: Zap, count: insights.actions.length, countColor: "#3629B7" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-[#3629B7] text-white shadow-md"
                      : "text-[#8E8E93] hover:text-[#303030] hover:bg-[#F5F5F7]"
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20 text-white" : "bg-[#F5F5F7] text-[#8E8E93]"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* TAB: losses */}
            {tab === "losses" && (
              <div className="space-y-4">
                {insights.losses.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-[#34C759] mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-[#303030] mb-1">Явных потерь не обнаружено</h3>
                      <p className="text-sm text-[#8E8E93]">
                        {hasData
                          ? "Ваши расходы выглядят здорово. Загрузите больше данных для глубокого анализа."
                          : "Загрузите выписку, чтобы мы нашли ваши финансовые потери."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-[#FF3B30]/5 rounded-xl border border-[#FF3B30]/10">
                      <Info className="w-4 h-4 text-[#FF3B30] shrink-0" />
                      <p className="text-xs text-[#FF3B30]">
                        Мы нашли <strong>{insights.losses.length} места утечки</strong> — суммарно это <strong>−{fmt(insights.totalLossMonthly)}/мес</strong> или <strong>−{fmt(insights.totalLossMonthly * 12)}/год</strong>
                      </p>
                    </div>
                    <div className="space-y-3">
                      {insights.losses.map((loss) => (
                        <LossCard key={loss.id} loss={loss} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: opportunities */}
            {tab === "opportunities" && (
              <div className="space-y-4">
                {insights.opportunities.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Sparkles className="w-12 h-12 text-[#FF9500] mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-[#303030] mb-1">Загрузите данные для персональных рекомендаций</h3>
                      <p className="text-sm text-[#8E8E93]">Мы подберём льготы, вычеты и кешбэк именно под вашу ситуацию.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-[#34C759]/5 rounded-xl border border-[#34C759]/10">
                      <Info className="w-4 h-4 text-[#34C759] shrink-0" />
                      <p className="text-xs text-[#34C759]">
                        Вы можете получить дополнительно <strong>+{fmt(insights.totalOpportunityYear)}/год</strong> — это <strong>{insights.opportunities.length} возможностей</strong>, которые вы, возможно, не используете
                      </p>
                    </div>
                    <div className="space-y-3">
                      {insights.opportunities.map((opp) => (
                        <OppCard key={opp.id} opp={opp} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: actions */}
            {tab === "actions" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[#3629B7]/5 rounded-xl border border-[#3629B7]/10">
                  <Zap className="w-4 h-4 text-[#3629B7] shrink-0" />
                  <p className="text-xs text-[#3629B7]">
                    <strong>{insights.actions.length} конкретных шага</strong> — выполните их и ваша финансовая ситуация улучшится уже в этом месяце
                  </p>
                </div>
                <div className="space-y-3">
                  {insights.actions.map((action, idx) => (
                    <ActionCard key={action.id} action={action} idx={idx} />
                  ))}
                </div>

                {/* Ask Kashik */}
                <Card className="bg-gradient-to-br from-[#F5F5F7] to-white border border-[#E5E5EA]">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#303030] mb-0.5">Нужен совет по конкретной ситуации?</p>
                      <p className="text-xs text-[#8E8E93]">Кэшик разберёт вашу ситуацию и объяснит каждый шаг простым языком</p>
                    </div>
                    <Link href="/ai-consultant">
                      <Button size="sm" className="rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white text-xs px-4">
                        Спросить Кэшика
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
