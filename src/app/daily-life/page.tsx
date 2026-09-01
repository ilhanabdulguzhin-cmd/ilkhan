"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { useState } from "react";
import {
  ShoppingCart, Wallet, Repeat, Tag, Sparkles,
  ChevronRight, AlertTriangle, Star, ArrowRight,
  ExternalLink, Info, CreditCard, Utensils,
  CheckCircle2, X, Gift, Percent,
} from "lucide-react";

// ── Verified cashback data (April 2026) ───────────────────────────────────────
// Sources: banki.ru, sravni.ru, официальные сайты банков
const CASHBACK_CARDS = [
  {
    name: "Т-Банк Блэк",
    tagColor: "#FF9500",
    headline: "до 15% в 3 выбранных категориях",
    detail: "Выберите любые 3 из 20+ категорий. На остаток до 16% годовых. Бесплатно при остатке от 50 000 ₽.",
    best_for: "Универсальный",
    url: "https://www.tbank.ru/cards/debit-cards/tinkoff-black/",
    source: "tbank.ru",
  },
  {
    name: "Альфа-Карта Cash Back",
    tagColor: "#FF3B30",
    headline: "10% АЗС, 5% кафе и рестораны",
    detail: "Бесплатно при тратах от 10 000 ₽/мес. Один из лучших вариантов для автомобилистов без годового взноса.",
    best_for: "Автомобилисты",
    url: "https://alfabank.ru/everyday/debit-cards/alfacard/",
    source: "alfabank.ru",
  },
  {
    name: "Газпромбанк Умная карта",
    tagColor: "#3629B7",
    headline: "до 10% в топ-категории автоматически",
    detail: "Автоматически определяет вашу главную категорию трат (та, где вы тратите больше всего) и даёт повышенный кэшбек.",
    best_for: "Без выбора категорий",
    url: "https://www.gazprombank.ru/personal/cards/debit/",
    source: "gazprombank.ru",
  },
  {
    name: "СберКарта",
    tagColor: "#34C759",
    headline: "до 5% СберСпасибо в супермаркетах-партнёрах",
    detail: "Перекрёсток, СберМаркет, Пятёрочка (через СберПрайм). Бонусы СберСпасибо = до 30% у партнёров Сбера.",
    best_for: "Экосистема Сбера",
    url: "https://www.sberbank.ru/ru/person/bank_cards/debit/sbercard",
    source: "sberbank.ru",
  },
  {
    name: "Ozon Карта",
    tagColor: "#007AFF",
    headline: "7% на Ozon, 3% в супермаркетах",
    detail: "Бесплатная. Кэшбек баллами Ozon. Лучший вариант для онлайн-покупок. Подходит для совмещения с другими картами.",
    best_for: "Онлайн-покупки",
    url: "https://www.ozon.ru/card/",
    source: "ozon.ru",
  },
  {
    name: "Яндекс Банк (карта Плюс)",
    tagColor: "#FF9500",
    headline: "до 8% в такси и Яндекс Еде",
    detail: "Кэшбек баллами Плюс — тратятся на все сервисы Яндекса. Бесплатная. Особенно выгодна при подписке Яндекс Плюс.",
    best_for: "Яндекс-экосистема",
    url: "https://bank.yandex.ru/",
    source: "bank.yandex.ru",
  },
  {
    name: "МТС Деньги Weekend",
    tagColor: "#E91E63",
    headline: "5% кафе/рестораны, 5% развлечения",
    detail: "Повышенный кэшбек в пятницу–воскресенье: 5% в кафе, кино, парках. Бесплатно. Хорошо совмещается с Альфа-картой.",
    best_for: "Досуг и выходные",
    url: "https://mtsbank.ru/cards/mts-dengi-weekend/",
    source: "mtsbank.ru",
  },
  {
    name: "ВТБ Мультикарта",
    tagColor: "#009688",
    headline: "2.5% на всё + до 15% в категориях",
    detail: "Базовый кэшбек 2.5% на все покупки + до 15% в выбранной категории. Бесплатно при тратах от 5 000 ₽/мес.",
    best_for: "Базовый кэшбек везде",
    url: "https://www.vtb.ru/personal/karty/multikarta/",
    source: "vtb.ru",
  },
];

// ── Cashback services (сервисы кэшбека) ──────────────────────────────────────
// Источник: megabonus.com, официальные сайты
const CASHBACK_SERVICES = [
  {
    name: "Кэшбэк-сервисы банков",
    items: [
      { name: "СберСпасибо", desc: "до 30% у 200 000+ партнёров, накопленные баллы", url: "https://spasibo.sber.ru" },
      { name: "Бонусная программа Т-Банк", desc: "кэшбек милями, рублями или баллами на выбор", url: "https://www.tbank.ru/cashback/" },
      { name: "Альфа-Бонус", desc: "мили + кэшбек в партнёрских магазинах", url: "https://alfabank.ru/bonus/" },
    ],
  },
  {
    name: "Независимые кэшбэк-сервисы",
    items: [
      { name: "Megabonus", desc: "кэшбек в Ozon, Wildberries, AliExpress и 3000+ магазинах", url: "https://megabonus.com" },
      { name: "Backit (ePN)", desc: "до 25% кэшбэк, Wildberries/Ozon/Lamoda и другие", url: "https://backit.me" },
      { name: "LetyShops", desc: "кэшбэк в 4000+ магазинах, вывод от 1 ₽", url: "https://letyshops.com" },
    ],
  },
];

// ── Verified subscriptions (April 2026) ───────────────────────────────────────
// Источник: официальные сайты сервисов
const SUBSCRIPTION_BUNDLES = [
  {
    name: "Яндекс Плюс",
    price: 299,
    includes: ["Кинопоиск HD", "Яндекс Музыка", "Навигатор без рекламы", "Яндекс GO скидки", "Книги", "Облако 10 ГБ"],
    vs: "Кинопоиск (399 ₽) + Музыка (219 ₽) = 618 ₽ отдельно",
    saving: 319,
    highlight: true,
    verdict: "Лучший выбор если пользуетесь хотя бы одним сервисом Яндекса",
    url: "https://plus.yandex.ru",
    source: "plus.yandex.ru",
    promo: "Первые 3 месяца бесплатно для новых пользователей",
  },
  {
    name: "СберПрайм",
    price: 399,
    includes: ["Okko Оптимум", "СберЗвук", "Скидки СберМаркет 5%", "Кэшбек 3% везде", "СберАптека скидки"],
    vs: "Okko (499 ₽) + СберЗвук (169 ₽) = 668 ₽ отдельно",
    saving: 269,
    highlight: false,
    verdict: "Выгодно при активном использовании сервисов Сбера",
    url: "https://prime.sber.ru",
    source: "prime.sber.ru",
    promo: "Бесплатно 30 дней для держателей СберКарты",
  },
  {
    name: "VK Комбо",
    price: 249,
    includes: ["VK Музыка", "VK Видео (VK Видео MAX)", "Облако 256 ГБ", "Почта Mail.ru без рекламы"],
    vs: "VK Музыка (169 ₽) + Облако 256 ГБ (149 ₽) = 318 ₽",
    saving: 69,
    highlight: false,
    verdict: "Выгодно если активны в экосистеме VK",
    url: "https://vk.com/combo",
    source: "vk.com/combo",
    promo: null,
  },
  {
    name: "МТС Premium",
    price: 299,
    includes: ["KION (фильмы/сериалы)", "МТС Музыка", "Антивирус Dr.Web", "Скидки МТС Банк"],
    vs: "KION (299 ₽) + Музыка (169 ₽) = 468 ₽ отдельно",
    saving: 169,
    highlight: false,
    verdict: "Хорошо для абонентов МТС — скидка на связь + стриминг",
    url: "https://premium.mts.ru",
    source: "premium.mts.ru",
    promo: null,
  },
];

const SINGLE_SERVICES = [
  { name: "Кинопоиск HD", price: 399, note: "Входит в Яндекс Плюс 299 ₽ — брать отдельно не выгодно" },
  { name: "Яндекс Музыка", price: 219, note: "Входит в Яндекс Плюс — нет смысла отдельно" },
  { name: "Okko Оптимум", price: 499, note: "Спорт только в Okko. Входит в СберПрайм 399 ₽" },
  { name: "Netflix (через RuStore)", price: 599, note: "Базовый план с рекламой. Работает через VPN или спец. способы оплаты" },
  { name: "ChatGPT Plus", price: 1800, note: "Оплата через иностр. карту или спец. сервисы типа pay.chatgpt.ru" },
  { name: "Notion Plus", price: 800, note: "Нужен для командной работы. Бесплатный план покрывает ~80% задач" },
  { name: "Spotify (через сторонние сервисы)", price: 200, note: "Официально недоступен в РФ. Аккаунт Индия/Аргентина через посредника" },
  { name: "1С:Фреш", price: 3900, note: "Бухгалтерия онлайн для ИП/самозанятых — официальная 1С в облаке" },
];

// ── Promo & savings opportunities ─────────────────────────────────────────────
const PROMO_TIPS = [
  {
    emoji: "🛒",
    title: "Wildberries Клуб",
    desc: "Подписка 399 ₽/мес — скидка до 3% на все товары + приоритетная доставка. При тратах от 10 000 ₽/мес окупается.",
    url: "https://www.wildberries.ru/landing/wbclub",
    tag: "Маркетплейс",
    tagColor: "#9C27B0",
  },
  {
    emoji: "🍕",
    title: "Яндекс Плюс × Еда",
    desc: "Подписчики Плюс получают скидку 10% в Яндекс Еде + бесплатную доставку при заказе от 600 ₽.",
    url: "https://plus.yandex.ru",
    tag: "Доставка",
    tagColor: "#FF9500",
  },
  {
    emoji: "💊",
    title: "Аптека.ру + Сбер",
    desc: "СберПрайм даёт 3–7% скидку в СберАптеке. Без подписки — покупайте через приложение и собирайте СберСпасибо.",
    url: "https://apteka.ru",
    tag: "Здоровье",
    tagColor: "#34C759",
  },
  {
    emoji: "✈️",
    title: "Авиабилеты — кэшбэк",
    desc: "Ozon Travel (7% Ozon-баллами), Яндекс Путешествия (Плюс-баллы), S7 Priority (накопительные мили).",
    url: "https://travel.yandex.ru",
    tag: "Путешествия",
    tagColor: "#007AFF",
  },
  {
    emoji: "📦",
    title: "Ozon Premium",
    desc: "199 ₽/мес — бесплатная доставка в любой ПВЗ + скидка 5% на миллионы товаров. Окупается с 2–3 заказов/мес.",
    url: "https://www.ozon.ru/premium/",
    tag: "Маркетплейс",
    tagColor: "#007AFF",
  },
  {
    emoji: "🎮",
    title: "VK Play Cloud",
    desc: "Облачный гейминг 499 ₽/мес — играй в игры ПК на любом устройстве без покупки железа.",
    url: "https://vkplay.ru/cloud/",
    tag: "Игры",
    tagColor: "#3629B7",
  },
];

// ── Budget norms (verified data) ─────────────────────────────────────────────
const BUDGET_NORMS = [
  { cat: "Аренда / жильё", ideal: "30%", warn: ">40%", color: "#3629B7", icon: "🏠" },
  { cat: "Продукты и кафе", ideal: "15%", warn: ">25%", color: "#34C759", icon: "🍎" },
  { cat: "Транспорт", ideal: "10%", warn: ">15%", color: "#FF9500", icon: "🚗" },
  { cat: "Подписки и досуг", ideal: "5%", warn: ">10%", color: "#007AFF", icon: "🎬" },
  { cat: "Кредиты", ideal: "<20%", warn: ">40%", color: "#FF3B30", icon: "💳" },
  { cat: "Накопления", ideal: "20%+", warn: "<10%", color: "#AF52DE", icon: "💰" },
];

export default function DailyLifePage() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<"budget" | "subs" | "cashback" | "promo">("budget");

  const income = userData?.profile?.monthlyIncome || 0;
  const rent = userData?.profile?.monthlyRent || 0;
  const food = userData?.profile?.monthlyFood || 0;
  const transport = userData?.profile?.monthlyTransport || 0;
  const credit = userData?.profile?.monthlyCredit || 0;
  const savings = userData?.profile?.monthlySavings || 0;
  const totalExpenses = rent + food + transport + credit;
  const free = income > 0 ? income - totalExpenses : 0;

  const pct = (val: number) => income > 0 ? Math.round((val / income) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#34C759]/15 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-[#34C759]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#303030]">Бытовая жизнь</h1>
              <p className="text-xs text-[#8E8E93]">Бюджет · подписки · кэшбек · экономия</p>
            </div>
          </div>
          <Link href="/ai-consultant?context=daily" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#34C759]/10 text-[#34C759] text-xs font-semibold border border-[#34C759]/20">
            <Sparkles className="w-3.5 h-3.5" /> Кэшик
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-2xl">
          {[
            { id: "budget", label: "Бюджет", icon: Wallet },
            { id: "subs", label: "Подписки", icon: Repeat },
            { id: "cashback", label: "Кэшбек", icon: Tag },
            { id: "promo", label: "Экономия", icon: Percent },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-[#303030] shadow-sm" : "text-[#8E8E93]"}`}>
              <t.icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── БЮДЖЕТ ── */}
        {tab === "budget" && (
          <div className="space-y-4">
            {income > 0 ? (
              <>
                {/* Budget breakdown */}
                <Card className="border-[#E5E5EA]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-[#303030]">Ваш бюджет</p>
                      <span className="text-xs text-[#8E8E93]">доход {income.toLocaleString("ru-RU")} ₽/мес</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Аренда / ипотека", value: rent, ideal: income * 0.3, color: "#3629B7" },
                        { label: "Продукты и кафе", value: food, ideal: income * 0.15, color: "#34C759" },
                        { label: "Транспорт", value: transport, ideal: income * 0.1, color: "#FF9500" },
                        { label: "Кредиты", value: credit, ideal: income * 0.2, color: "#FF3B30" },
                        { label: "Накопления", value: savings, ideal: income * 0.2, color: "#AF52DE" },
                      ].filter((r) => r.value > 0).map((row, i) => {
                        const p = Math.min(100, Math.round((row.value / row.ideal) * 100));
                        const over = row.value > row.ideal;
                        return (
                          <div key={i}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-[#303030]">{row.label}</span>
                              <span className="text-xs font-semibold" style={{ color: over ? "#FF3B30" : "#303030" }}>
                                {row.value.toLocaleString("ru-RU")} ₽ · {pct(row.value)}%
                                {over && " ⚠️"}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[#F5F5F7] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: over ? "#FF3B30" : row.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#F5F5F7] flex items-center justify-between">
                      <span className="text-sm text-[#8E8E93]">Свободно</span>
                      <span className={`text-lg font-bold ${free >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                        {free >= 0 ? "+" : ""}{free.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {free < income * 0.1 && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FF3B30]/8 border border-[#FF3B30]/15">
                    <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#303030]">Мало свободных средств</p>
                      <p className="text-xs text-[#8E8E93] mt-0.5 leading-relaxed">
                        У вас остаётся менее 10% дохода. Проверьте подписки и категорию с наибольшим перерасходом.
                      </p>
                      <Link href="/ai-consultant?context=budget" className="text-xs font-semibold text-[#FF3B30] flex items-center gap-1 mt-1.5">
                        Составить план <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mx-auto">
                  <Wallet className="w-7 h-7 text-[#C7C7CC]" />
                </div>
                <p className="text-base font-semibold text-[#303030]">Заполните финансовый профиль</p>
                <p className="text-sm text-[#8E8E93]">Укажите доходы и расходы чтобы увидеть персональный бюджет</p>
                <Link href="/avatar" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3629B7] text-white text-sm font-semibold">
                  Заполнить <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Norms reference */}
            <Card className="border-[#E5E5EA]">
              <CardContent className="p-5">
                <p className="text-sm font-bold text-[#303030] mb-3">Рекомендуемые нормы (правило 50/30/20)</p>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGET_NORMS.map((n, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F5F5F7]">
                      <span className="text-base">{n.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#303030] truncate">{n.cat}</p>
                        <p className="text-[10px]" style={{ color: n.color }}>Норма: {n.ideal} · {n.warn} — много</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── ПОДПИСКИ ── */}
        {tab === "subs" && (
          <div className="space-y-4">
            {/* AI insight */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#3629B7]/8 border border-[#3629B7]/15">
              <Sparkles className="w-4 h-4 text-[#3629B7] shrink-0 mt-0.5" />
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                <strong className="text-[#303030]">Главный совет:</strong> Яндекс Плюс за 299 ₽/мес включает Кинопоиск (399 ₽) и Музыку (219 ₽). Если платите за них отдельно — экономия <strong>319 ₽/мес = 3 828 ₽/год</strong>.
              </p>
            </div>

            {/* Bundles */}
            <div>
              <p className="text-sm font-bold text-[#303030] mb-3">Пакетные предложения</p>
              <div className="space-y-3">
                {SUBSCRIPTION_BUNDLES.map((sub) => (
                  <Card key={sub.name} className={`border ${sub.highlight ? "border-[#FF9500]/30 bg-[#FF9500]/3" : "border-[#E5E5EA]"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#303030]">{sub.name}</p>
                            {sub.highlight && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF9500] text-white">Лучший выбор</span>}
                          </div>
                          <p className="text-lg font-bold text-[#303030] mt-0.5">{sub.price} ₽/мес</p>
                        </div>
                        {sub.saving > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-xs text-[#34C759] font-bold">−{sub.saving} ₽/мес</p>
                            <p className="text-[10px] text-[#8E8E93]">экономия</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {sub.includes.slice(0, 4).map((s) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#8E8E93]">{s}</span>
                        ))}
                        {sub.includes.length > 4 && <span className="text-[10px] text-[#8E8E93] px-1">+{sub.includes.length - 4}</span>}
                      </div>
                      <p className="text-[11px] text-[#8E8E93] mb-1">{sub.verdict}</p>
                      {sub.promo && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Gift className="w-3 h-3 text-[#34C759]" />
                          <p className="text-[11px] text-[#34C759] font-semibold">{sub.promo}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-[#C7C7CC]">{sub.vs}</p>
                        <a href={sub.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-[#8E8E93] hover:text-[#3629B7]">
                          <ExternalLink className="w-3 h-3" /> {sub.source}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Individual services */}
            <div>
              <p className="text-sm font-bold text-[#303030] mb-3">Отдельные сервисы</p>
              <div className="space-y-2">
                {SINGLE_SERVICES.map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E5EA]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#303030]">{s.name}</p>
                      <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-0.5">{s.note}</p>
                    </div>
                    <span className="text-sm font-bold text-[#303030] shrink-0 ml-3">{s.price} ₽</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── КЭШБЕК ── */}
        {tab === "cashback" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#34C759] to-[#2fb350] text-white">
              <p className="text-sm font-bold mb-1">Стратегия максимального кэшбека</p>
              <p className="text-xs text-white/80 leading-relaxed">
                2–3 карты для разных категорий = кэшбек на 80–90% трат. Универсальная карта 2.5% + специальная под ключевую категорию.
              </p>
            </div>

            <div className="space-y-3">
              {CASHBACK_CARDS.map((card, i) => (
                <Card key={i} className="border-[#E5E5EA]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold text-[#303030]">{card.name}</p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: card.tagColor }}>{card.headline}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-white shrink-0 mt-0.5" style={{ backgroundColor: card.tagColor }}>
                        {card.best_for}
                      </span>
                    </div>
                    <p className="text-xs text-[#8E8E93] leading-relaxed mb-3">{card.detail}</p>
                    <div className="flex items-center justify-between">
                      <a href={card.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-[#3629B7]">
                        Узнать подробнее <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-[10px] text-[#C7C7CC]">{card.source}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cashback services */}
            {CASHBACK_SERVICES.map((group, gi) => (
              <div key={gi}>
                <p className="text-sm font-bold text-[#303030] mb-2">{group.name}</p>
                <div className="space-y-2">
                  {group.items.map((item, ii) => (
                    <a key={ii} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E5EA] hover:border-[#34C759]/30 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-[#303030]">{item.name}</p>
                        <p className="text-[11px] text-[#8E8E93]">{item.desc}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#C7C7CC] shrink-0 ml-3" />
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <Link href="/products?tab=cards" className="flex items-center justify-between p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] hover:border-[#3629B7]/30 transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#3629B7]" />
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Сравнить все карты</p>
                  <p className="text-xs text-[#8E8E93]">Полный каталог с условиями</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </Link>

            <Link href="/ai-consultant?context=cashback" className="flex items-center justify-between p-4 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/15 hover:bg-[#34C759]/12 transition-colors">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#34C759]" />
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Подбор под мои траты</p>
                  <p className="text-xs text-[#8E8E93]">Кэшик найдёт комбинацию под ваш профиль</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#34C759]" />
            </Link>
          </div>
        )}

        {/* ── ЭКОНОМИЯ ── */}
        {tab === "promo" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FF9500]/8 border border-[#FF9500]/15">
              <Gift className="w-4 h-4 text-[#FF9500] shrink-0 mt-0.5" />
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                <strong className="text-[#303030]">Скидки и акции:</strong> актуальные предложения на апрель 2026. Промокоды меняются — проверяйте на{" "}
                <a href="https://www.pepper.ru/coupons" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">pepper.ru</a> и{" "}
                <a href="https://berikod.ru" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">berikod.ru</a>
              </p>
            </div>

            <div className="space-y-3">
              {PROMO_TIPS.map((tip, i) => (
                <a key={i} href={tip.url} target="_blank" rel="noopener noreferrer">
                  <Card className="border-[#E5E5EA] hover:border-[#FF9500]/30 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{tip.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-[#303030]">{tip.title}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: tip.tagColor }}>
                              {tip.tag}
                            </span>
                          </div>
                          <p className="text-xs text-[#8E8E93] leading-relaxed">{tip.desc}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#C7C7CC] shrink-0 mt-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>

            {/* Aggregator tips */}
            <Card className="border-[#E5E5EA]">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-[#303030] mb-3">🔍 Агрегаторы акций и промокодов</p>
                <div className="space-y-2">
                  {[
                    { name: "Pepper.ru", desc: "Сообщество: лучшие акции, промокоды, скидки дня", url: "https://www.pepper.ru/coupons" },
                    { name: "БериКод", desc: "Промокоды на сотни магазинов — обновляется ежедневно", url: "https://berikod.ru" },
                    { name: "Megabonus", desc: "Кэшбэк в 3000+ магазинах + промокоды", url: "https://megabonus.com" },
                    { name: "1000bankov.ru", desc: "Акции банков, бонусные программы и спецпредложения", url: "https://1000bankov.ru/news/tags/akcii-bankov/" },
                  ].map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-[#303030]">{s.name}</p>
                        <p className="text-[11px] text-[#8E8E93]">{s.desc}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#C7C7CC] shrink-0 ml-3" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Link href="/ai-consultant?context=daily" className="flex items-center justify-between p-4 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/15">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#34C759]" />
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Найти экономию под мой профиль</p>
                  <p className="text-xs text-[#8E8E93]">Кэшик проанализирует ваши траты и предложит конкретные способы</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#34C759]" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
