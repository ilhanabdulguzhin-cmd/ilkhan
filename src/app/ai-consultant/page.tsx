"use client";

import AppShell from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import type { UserData } from "@/lib/user-store";
import {
  Send, Sparkles, User, TrendingUp, Shield, CreditCard,
  Receipt, Target, AlertTriangle, Wallet, BarChart3,
  RefreshCw, Home, Landmark, ChevronRight, X, Info,
  Zap, ArrowRight, ExternalLink, ShoppingCart, ShieldAlert,
} from "lucide-react";
import { SmartInputBar } from "@/components/smart-input-bar";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { CalcResult, ValueTip, ProductSuggestion } from "@/lib/kashik-brain";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  calcResult?: CalcResult;
  tips?: ValueTip[];
  products?: ProductSuggestion[];
  typing?: boolean;
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

type ScenarioId =
  | "general" | "mortgage" | "deposit" | "tax" | "debt"
  | "budget" | "invest" | "fraud" | "fz115" | "cashback";

interface Scenario {
  id: ScenarioId;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  quickQuestions: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "general", label: "Общий анализ", icon: BarChart3, color: "#3629B7",
    description: "Анализ финансов, советы, обзор",
    quickQuestions: ["Куда уходят мои деньги?", "Как накопить финансовую подушку?", "Топ-5 советов для экономии", "Оцени мои финансы"],
  },
  {
    id: "mortgage", label: "Ипотека", icon: Home, color: "#FF9500",
    description: "Калькулятор, льготные программы",
    quickQuestions: ["Ипотека 5 млн на 20 лет под 6%", "Кто может получить семейную ипотеку?", "ИТ-ипотека 2026 — условия", "Сколько дохода нужно для ипотеки 4 млн?"],
  },
  {
    id: "deposit", label: "Вклады и счета", icon: Landmark, color: "#34C759",
    description: "Расчёт дохода, ставки банков",
    quickQuestions: ["Вклад 500 000 ₽ на 6 месяцев", "Накопительный счёт или вклад — что лучше?", "Где сейчас лучшие ставки по вкладам?", "Вклад 1 млн: сколько заработаю за год?"],
  },
  {
    id: "tax", label: "Налоги и вычеты", icon: Receipt, color: "#007AFF",
    description: "Вычеты НДФЛ, 3-НДФЛ, ИИС",
    quickQuestions: ["Вычет за лечение 80 000 ₽", "Сколько вернут за квартиру 3 млн?", "ИИС тип А — максимальный возврат", "Вычет за обучение ребёнка"],
  },
  {
    id: "debt", label: "Кредиты и долги", icon: CreditCard, color: "#FF3B30",
    description: "Погашение, рефинансирование",
    quickQuestions: ["Стратегия погашения долга 300 000 под 20%", "Выгодно ли рефинансировать ипотеку?", "Что такое долговая нагрузка?", "Кредитные каникулы — как получить?"],
  },
  {
    id: "budget", label: "Бюджет и экономия", icon: Target, color: "#AF52DE",
    description: "Планирование, правило 50/30/20",
    quickQuestions: ["Бюджет для зарплаты 100 000 ₽", "Как не выходить за бюджет?", "Где я теряю деньги каждый месяц?", "Как сократить расходы на 20%?"],
  },
  {
    id: "invest", label: "Инвестиции", icon: TrendingUp, color: "#34C759",
    description: "ОФЗ, ИИС, акции, БПИФ",
    quickQuestions: ["Куда вложить 200 000 ₽ без риска?", "Что такое ОФЗ и сколько дают?", "ИИС тип А vs тип Б — что выгоднее?", "Как начать инвестировать с нуля?"],
  },
  {
    id: "fraud", label: "Защита от мошенников", icon: AlertTriangle, color: "#FF3B30",
    description: "Схемы обмана, что делать",
    quickQuestions: ["Позвонили из «банка» — что делать?", "Топ мошеннических схем 2026", "Уже перевёл деньги — можно вернуть?", "Как проверить сайт перед оплатой?"],
  },
  {
    id: "fz115", label: "115-ФЗ и блокировки", icon: Shield, color: "#8E8E93",
    description: "Блокировки счетов, ПОД/ФТ",
    quickQuestions: ["Почему банк заблокировал счёт?", "Банк запросил документы — что делать?", "Как не попасть под 115-ФЗ?", "Куда жаловаться на банк?"],
  },
  {
    id: "cashback", label: "Кешбэк и карты", icon: Wallet, color: "#FF9500",
    description: "Выбор карты, максимизация выгоды",
    quickQuestions: ["Лучшая карта для супермаркетов", "Как получать 5%+ кешбэка?", "Карта для АЗС и топлива", "Сравни Т-Банк vs Альфа CashBack"],
  },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildUserContext(data: UserData | null) {
  if (!data) return undefined;
  const totalIncome = data.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExp = Math.abs(data.transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  const debtTotal = data.debts.reduce((s, d) => s + d.balance, 0);
  const catMap: Record<string, number> = {};
  data.transactions.filter(t => t.amount < 0).forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount);
  });
  const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
  const months = new Set(data.transactions.map(t => t.date.substring(0, 7))).size || 1;
  const monthlyIncome = data.profile.monthlyIncome || (totalIncome > 0 ? Math.round(totalIncome / months) : 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExp) / totalIncome) * 100) : 0;
  return {
    name: data.profile.name?.split(" ")[0],
    monthlyIncome,
    totalBalance,
    totalExpenses: totalExp,
    savingsRate,
    topCategories,
    hasDebts: data.debts.length > 0,
    debtTotal,
    segment: data.profile.segment,
  };
}

// ─── CalcCard ─────────────────────────────────────────────────────────────────

function CalcCard({ result }: { result: CalcResult }) {
  return (
    <div className="mt-3 rounded-2xl border border-[#3629B7]/15 overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-[#3629B7]/10 to-transparent border-b border-[#3629B7]/10 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-[#3629B7]" />
        <p className="text-sm font-bold text-[#3629B7]">{result.title}</p>
      </div>
      <div className="divide-y divide-[#F5F5F7] bg-white">
        {result.rows.map((row, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.highlight ? "bg-gradient-to-r from-[#3629B7]/5 to-transparent" : ""}`}>
            <span className="text-xs text-[#8E8E93] shrink-0 mr-3 leading-tight">{row.label}</span>
            <div className="text-right">
              <span className={`text-sm ${row.highlight ? "font-black text-[#3629B7] text-base" : "font-semibold text-[#303030]"}`}>{row.value}</span>
              {row.note && <div className="text-[10px] text-[#8E8E93] mt-0.5">{row.note}</div>}
            </div>
          </div>
        ))}
      </div>
      {(result.tip || result.links?.length) && (
        <div className="px-4 py-3 bg-[#F5F5F7] border-t border-[#E5E5EA] space-y-2">
          {result.tip && <p className="text-[11px] text-[#8E8E93] leading-relaxed">{result.tip}</p>}
          {result.links?.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#3629B7] font-medium hover:underline">
              <ExternalLink className="w-3 h-3 shrink-0" /> {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Value Tips Card ─────────────────────────────────────────────────────────

function TipsCard({ tips }: { tips: ValueTip[] }) {
  if (!tips.length) return null;
  return (
    <div className="mt-3 rounded-2xl border border-[#34C759]/20 overflow-hidden">
      <div className="px-4 py-2 bg-gradient-to-r from-[#34C759]/10 to-transparent border-b border-[#34C759]/15 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#34C759]" />
        <p className="text-xs font-bold text-[#34C759] uppercase tracking-wide">Возможности экономии</p>
      </div>
      <div className="divide-y divide-[#F5F5F7] bg-white">
        {tips.map((tip, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3">
            <span className="text-base shrink-0">{tip.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-semibold text-[#303030]">{tip.title}</p>
                <span className="text-xs font-bold text-[#34C759] shrink-0">{tip.saving}</span>
              </div>
              <p className="text-[11px] text-[#8E8E93] leading-relaxed">{tip.action}</p>
              {tip.link && (
                <a href={tip.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#3629B7] font-medium hover:underline">
                  Перейти <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Products Card ───────────────────────────────────────────────────────────

function ProductsCard({ products }: { products: ProductSuggestion[] }) {
  if (!products.length) return null;
  return (
    <div className="mt-3 rounded-2xl border border-[#FF9500]/20 overflow-hidden">
      <div className="px-4 py-2 bg-gradient-to-r from-[#FF9500]/10 to-transparent border-b border-[#FF9500]/15 flex items-center gap-2">
        <CreditCard className="w-3.5 h-3.5 text-[#FF9500]" />
        <p className="text-xs font-bold text-[#FF9500] uppercase tracking-wide">Подобранные продукты</p>
      </div>
      <div className="divide-y divide-[#F5F5F7] bg-white">
        {products.map((p, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0 text-xs font-bold text-[#3629B7]">
              {p.bank.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#303030]">{p.name} <span className="font-normal text-[#8E8E93]">· {p.bank}</span></p>
              <p className="text-[11px] text-[#34C759] font-medium">{p.benefit}</p>
              <p className="text-[10px] text-[#8E8E93]">{p.highlight}</p>
            </div>
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#3629B7] text-white text-[11px] font-medium hover:bg-[#2a1f8f] transition-colors">
              Открыть
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={j} className="font-semibold text-[#1a1a2e]">{p.slice(2, -2)}</strong>
            : <span key={j}>{p}</span>
        )}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function MsgBubble({ msg }: { msg: Message }) {
  const [showExtras, setShowExtras] = useState(true);
  const hasExtras = !msg.typing && ((msg.tips && msg.tips.length > 0) || (msg.products && msg.products.length > 0));

  if (msg.role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[78%] bg-[#3629B7] text-white rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed">
          {msg.content}
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-[#8E8E93]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[88%] min-w-0">
        {msg.typing ? (
          <div className="bg-[#F5F5F7] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-2 h-2 bg-[#3629B7] rounded-full animate-bounce opacity-70" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : (
          <>
            <div className="bg-[#F5F5F7] rounded-2xl rounded-bl-md px-4 py-3">
              <p className="text-sm leading-relaxed text-[#303030]">{renderMarkdown(msg.content)}</p>
            </div>
            {msg.calcResult && <CalcCard result={msg.calcResult} />}
            {hasExtras && (
              <div className="mt-2">
                <button
                  onClick={() => setShowExtras(p => !p)}
                  className="flex items-center gap-1 text-[10px] text-[#8E8E93] hover:text-[#303030] transition-colors px-1 py-0.5"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${showExtras ? "rotate-90" : ""}`} />
                  {showExtras ? "Скрыть рекомендации" : "Показать рекомендации"}
                </button>
                {showExtras && (
                  <>
                    {msg.tips && msg.tips.length > 0 && <TipsCard tips={msg.tips} />}
                    {msg.products && msg.products.length > 0 && <ProductsCard products={msg.products} />}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Disclaimer ──────────────────────────────────────────────────────────────

function DisclaimerBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="mx-3 mt-2 mb-1 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 leading-relaxed">
      <Info className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
      <span className="flex-1">Информация носит образовательный характер. Не является индивидуальной инвестиционной рекомендацией.</span>
      <button onClick={() => setVisible(false)} className="text-amber-400 hover:text-amber-600 shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Context presets from Life Sections ──────────────────────────────────────
const CONTEXT_PRESETS: Record<string, { scenario: ScenarioId; greeting: string; quickQ: string[] }> = {
  daily:         { scenario: "budget",  greeting: "Я помогу с бытовыми финансами: бюджет, подписки, кэшбек, ежедневные расходы.", quickQ: ["Как оптимизировать бюджет?", "Какая карта выгоднее для продуктов?", "Как сэкономить на подписках?"] },
  subscriptions: { scenario: "budget",  greeting: "Разберём ваши подписки — найдём дубли и ненужное.", quickQ: ["Анализируй мои подписки", "Яндекс Плюс vs отдельные сервисы", "Какие подписки дешевле пакетом?"] },
  cashback:      { scenario: "budget",  greeting: "Подберу карты с максимальным кэшбеком под ваши категории трат.", quickQ: ["Лучшая карта для продуктов", "Карта для АЗС и кафе", "Как получить кэшбек 15%?"] },
  budget:        { scenario: "budget",  greeting: "Составим персональный бюджет по правилу 50/30/20 или другому подходящему.", quickQ: ["Бюджет для зарплаты 100к", "Правило 50/30/20 для меня", "Где я теряю больше всего?"] },
  invest:        { scenario: "invest",  greeting: "Помогу с инвестиционной стратегией: вклады, ОФЗ, БПИФ, ИИС-3.", quickQ: ["С чего начать инвестировать?", "Вклад 500к на 6 месяцев", "ОФЗ vs вклад — что выгоднее?"] },
  ofz:           { scenario: "invest",  greeting: "Расскажу всё об ОФЗ: доходность, риски, когда покупать.", quickQ: ["Доходность ОФЗ сейчас", "Короткие vs длинные ОФЗ", "ОФЗ через ИИС-3"] },
  gold:          { scenario: "invest",  greeting: "Объясню варианты инвестиций в золото: ОМС, БПИФ, монеты.", quickQ: ["ОМС или БПИФ на золото?", "Сколько золота в портфеле?", "Золото vs вклад 2026"] },
  debt:          { scenario: "debt",    greeting: "Помогу с кредитами: стратегия погашения, рефинансирование, расчёт переплаты.", quickQ: ["Стратегия погашения долга 300к", "Рефинансировать ипотеку выгодно?", "Долговая нагрузка — норма"] },
  refinance:     { scenario: "debt",    greeting: "Рассчитаю выгоду от рефинансирования вашего кредита.", quickQ: ["Когда выгодно рефинансировать?", "Рефинансирование ипотеки под 14%", "Документы для рефинансирования"] },
  holidays:      { scenario: "debt",    greeting: "Расскажу о кредитных каникулах по ФЗ-353: кто может, как оформить.", quickQ: ["Как получить кредитные каникулы?", "Условия по 353-ФЗ", "Что будет с процентами?"] },
  "credit-history": { scenario: "debt", greeting: "Объясню как работает кредитная история и как её улучшить.", quickQ: ["Как проверить кредитную историю?", "Как улучшить кредитный рейтинг?", "Исправить ошибки в КИ"] },
  bankruptcy:    { scenario: "debt",    greeting: "Расскажу о банкротстве физлица: когда возможно, процедура, последствия.", quickQ: ["Условия для банкротства", "Последствия банкротства", "Как начать процедуру?"] },
  fraud:         { scenario: "general", greeting: "Помогу защититься от мошенников: как действовать, что делать если обманули.", quickQ: ["Что делать если перевёл деньги мошенникам?", "Как распознать звонок мошенника?", "Заблокировали карту — что делать?"] },
  "fraud-help":  { scenario: "general", greeting: "Разберём вашу ситуацию и составим план действий против мошенников.", quickQ: ["Куда звонить если обманули?", "Как подать заявление в банк?", "Сроки возврата денег"] },
  "fraud-check": { scenario: "general", greeting: "Опишите ситуацию — помогу оценить, является ли это мошенничеством.", quickQ: ["Это законно?", "Признаки пирамиды", "Как проверить брокера?"] },
  fz115:         { scenario: "fz115",   greeting: "Объясню ФЗ-115: почему блокируют счета и как разблокировать.", quickQ: ["Почему заблокировали счёт?", "Документы для разблокировки", "Как оспорить блокировку?"] },
  chargeback:    { scenario: "general", greeting: "Помогу оспорить транзакцию и вернуть деньги.", quickQ: ["Как подать на чарджбек?", "Документы для оспаривания", "Сроки возврата средств"] },
  "borrower-rights": { scenario: "general", greeting: "Расскажу о правах заёмщика по ФЗ-353.", quickQ: ["Досрочное погашение без штрафа?", "Как отказаться ��т страховки?", "Что делают коллекторы законно?"] },
  asv:           { scenario: "general", greeting: "Объясню как работает АСВ и страхование вкладов.", quickQ: ["Лимит страховки АСВ", "Что застраховано?", "Что делать при отзыве лицензии?"] },
};

function AIConsultantInner() {
  const { userData } = useAuth();
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context") || "";
  const goalParam = searchParams.get("goal") || "";
  const strategyParam = searchParams.get("strategy") || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioId>(() => {
    const preset = CONTEXT_PRESETS[contextParam];
    return preset?.scenario || "general";
  });
  const [showScenarios, setShowScenarios] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextInitialized = useRef(false);

  const currentScenario = SCENARIOS.find((s) => s.id === activeScenario)!;

  // Welcome message — fire only once when userData first loads
  useEffect(() => {
    if (!userData) return;
    if (contextInitialized.current) return;
    contextInitialized.current = true;
    const name = userData.profile.name?.split(" ")[0] || "";
    const txCount = userData.transactions.length;
    const hasData = txCount > 0 || userData.accounts.length > 0;
    const segNote = userData.profile.segment === "family"
      ? " Знаю о семейной ипотеке, детских пособиях и льготах."
      : userData.profile.segment === "entrepreneur"
      ? " Помогу с налогами ИП/самозанятых и бизнес-финансами."
      : "";

    const inc = userData.profile.monthlyIncome;
    const balance = userData.accounts.reduce((s, a) => s + a.balance, 0);

    const preset = CONTEXT_PRESETS[contextParam];
    const contextGreeting = preset ? `\n\n${preset.greeting}` : "";
    const goalNote = goalParam ? `\n\nОтлично — цель «${goalParam}». Давайте рассчитаем срок и подберём инструмент.` : "";
    const strategyNote = strategyParam ? `\n\nРазберём стратегию «${strategyParam}» под вашу ситуацию.` : "";

    let welcome: string;
    if (hasData && inc) {
      const savingsTarget = Math.round(inc * 0.2);
      welcome = `Привет${name ? `, ${name}` : ""}! Я Monetrix — ваш финансовый советник.${segNote}${contextGreeting}${goalNote}${strategyNote}\n\nВижу ваши данные: доход **${inc.toLocaleString("ru-RU")} ₽/мес**, баланс **${balance.toLocaleString("ru-RU")} ₽**, ${txCount} операций.\n\nЦель — откладывать **${savingsTarget.toLocaleString("ru-RU")} ₽/мес** (20% дохода). Выберите тему или спрашивайте!`;
    } else {
      welcome = `Привет${name ? `, ${name}` : ""}! Я Monetrix — финансовый советник.${segNote}${contextGreeting}${goalNote}${strategyNote}\n\nОтвечаю на любые вопросы про деньги, считаю, объясняю, нахожу экономию.\n\n**Примеры запросов:**\n• «ипотека 4 млн на 15 лет под 6%»\n• «вклад 500 000 на 6 месяцев — сколько заработаю?»\n• «как вернуть 52 000 ₽ через ИИС»\n• «лучшая карта для кешбэка на продукты»\n\nНачните с шага 1: выберите сценарий. Шаг 2: ответьте на один вопрос. Шаг 3: получите расчёт и один следующий шаг. Если данных не хватает, я прямо скажу, что нужно добавить. Выберите сценарий или пишите — дам конкретные цифры и ссылки.`;
    }

    setMessages([{ id: "welcome", role: "assistant", content: welcome }]);
  }, [userData]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const typingId = `typing-${Date.now()}`;
    setMessages(prev => [...prev, userMsg, { id: typingId, role: "assistant", content: "", typing: true }]);
    setInput("");
    setIsTyping(true);

    try {
      const userContext = buildUserContext(userData);
      const resp = await fetch("/api/kashik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, scenario: activeScenario, userContext }),
      });

      const data = await resp.json();

      // Simulate typing effect - reveal text progressively
      const fullText: string = data.text || "Уточните вопрос — я помогу с расчётами и советами.";

      setMessages(prev => prev.map(m =>
        m.id === typingId ? {
          ...m,
          typing: false,
          content: fullText,
          calcResult: data.calcResult,
          tips: data.tips,
          products: data.products,
        } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === typingId ? {
          ...m,
          typing: false,
          content: "Произошла ошибка. Попробуйте ещё раз.",
        } : m
      ));
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, userData, activeScenario]);

  function handleSend() { sendMessage(input); }

  const switchScenario = (id: ScenarioId) => {
    setActiveScenario(id);
    setShowScenarios(false);
    const sc = SCENARIOS.find((s) => s.id === id)!;
    const typingId = `switch-typing-${Date.now()}`;
    setMessages(prev => [...prev, { id: typingId, role: "assistant", content: "", typing: true }]);
    setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.id === typingId ? {
          ...m,
          typing: false,
          content: `Режим: **${sc.label}** — ${sc.description}.\n\nВыберите вопрос ниже или напишите свой — дам конкретные расчёты и рекомендации.`,
        } : m
      ));
    }, 400);
  };

  return (
    <AppShell>
      <div className="flex gap-4 h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-6.5rem)] max-w-[1100px] mx-auto w-full">

        {/* ── Scenarios sidebar ── */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 gap-0.5 py-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest px-2 mb-1">Сценарии</p>
          {SCENARIOS.map((sc) => (
            <button key={sc.id} onClick={() => switchScenario(sc.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                activeScenario === sc.id
                  ? "bg-white shadow-sm border border-[#E5E5EA] font-semibold text-[#303030]"
                  : "text-[#8E8E93] hover:bg-white/70 hover:text-[#303030]"
              }`}>
              <sc.icon className="w-4 h-4 shrink-0" style={{ color: activeScenario === sc.id ? sc.color : undefined }} />
              <span className="truncate text-xs">{sc.label}</span>
            </button>
          ))}
          <div className="mt-auto pt-2 border-t border-[#F5F5F7] space-y-0.5">
            <Link href="/products">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#3629B7] hover:bg-[#3629B7]/10 transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> Банк. продукты
              </div>
            </Link>
            <Link href="/subscriptions">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#FF9500] hover:bg-[#FF9500]/10 transition-colors">
                <Wallet className="w-3.5 h-3.5" /> Кешбэк сравнение
              </div>
            </Link>
            <Link href="/risk-compliance">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#34C759] hover:bg-[#34C759]/10 transition-colors">
                <Shield className="w-3.5 h-3.5" /> Риск-анализ
              </div>
            </Link>
          </div>
        </div>

        {/* ── Chat column ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] flex items-center justify-center shadow-md shadow-[#3629B7]/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#303030] leading-none">Monetrix</h2>
                <p className="text-[11px] text-[#8E8E93]">Финансовый советник · считает · экономит · объясняет</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile scenario switcher */}
              <div className="relative lg:hidden">
                <button onClick={() => setShowScenarios((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5EA] bg-white text-xs font-medium text-[#303030]">
                  <currentScenario.icon className="w-3.5 h-3.5" style={{ color: currentScenario.color }} />
                  {currentScenario.label}
                </button>
                {showScenarios && (
                  <div className="absolute top-full mt-1 right-0 z-30 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl w-60 py-1 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b">
                      <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Сценарии</span>
                      <button onClick={() => setShowScenarios(false)}><X className="w-3.5 h-3.5 text-[#8E8E93]" /></button>
                    </div>
                    {SCENARIOS.map((sc) => (
                      <button key={sc.id} onClick={() => switchScenario(sc.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[#F5F5F7] transition-colors ${activeScenario === sc.id ? "font-semibold text-[#303030]" : "text-[#8E8E93]"}`}>
                        <sc.icon className="w-4 h-4 shrink-0" style={{ color: sc.color }} />
                        <div>
                          <div className="text-xs">{sc.label}</div>
                          <div className="text-[10px] text-[#8E8E93] font-normal">{sc.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setMessages(messages.slice(0, 1))}
                className="p-2 rounded-lg hover:bg-[#F5F5F7] text-[#8E8E93] transition-colors" title="Очистить чат">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat area */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <DisclaimerBanner />

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => <MsgBubble key={m.id} msg={m} />)}
            </div>

            {/* Quick questions — show when few messages */}
            {messages.length <= 2 && (
              <div className="px-3 py-2 border-t border-[#F5F5F7]">
                <p className="text-[10px] text-[#8E8E93] uppercase tracking-wide mb-2 px-1">Быстрые вопросы:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(CONTEXT_PRESETS[contextParam]?.quickQ || currentScenario.quickQuestions).map((qq) => (
                    <button key={qq} onClick={() => sendMessage(qq)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-[#303030] transition-colors">
                      <currentScenario.icon className="w-3 h-3 shrink-0" style={{ color: currentScenario.color }} />
                      {qq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-[#E5E5EA]">
              <div className="flex gap-2 items-center">
                {/* Smart input buttons (voice / QR / receipt) — voice auto-sends */}
                <SmartInputBar
                  onText={(text) => {
                    const trimmed = text.trim();
                    if (trimmed) sendMessage(trimmed);
                  }}
                />
                <Input
                  placeholder="Спросить Monetrixа... или используйте 🎤 QR 🧾"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm min-w-0"
                />
                <Button onClick={handleSend} className="bg-[#3629B7] hover:bg-[#2a1f8f] rounded-xl shrink-0" disabled={!input.trim() || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-[#C7C7CC] mt-1.5 px-1 flex items-center gap-3">
                <span>🎤 Голос</span>
                <span>⬛ QR-код</span>
                <span>🧾 Чек / скриншот</span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function AIConsultantPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 rounded-full border-2 border-[#3629B7] border-t-transparent animate-spin" /></div>}>
      <AIConsultantInner />
    </Suspense>
  );
}
