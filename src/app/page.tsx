"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Shield, Sparkles, Wallet, BarChart3, Lock, CheckCircle2,
  ArrowRight, ChevronRight, Brain, FileSpreadsheet, Target, Medal,
  Receipt, Calculator, MessageCircle, Star, TrendingUp,
  Globe, Building2, Gift, ExternalLink,
  PiggyBank, Users, TrendingDown,
  Activity, DollarSign, Home, Briefcase,
  RefreshCw, LayoutDashboard, Settings, Smartphone,
  LineChart, CreditCard,
} from "lucide-react";
import { MonetrixIcon } from "@/components/monetrix-logo";
import { PWAInstallButton } from "@/components/pwa-install-button";

// ─── Constants ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Финансовая панель",
    desc: "Все счета, карты, вклады, наличные и брокерские счета — в одном окне. Полная картина ваших финансов в реальном времени.",
    color: "#3629B7",
    link: "/dashboard",
    label: "Открыть панель",
  },
  {
    icon: Brain,
    title: "AI-советник Кэшик",
    desc: "ИИ анализирует введённые данные, показывает сценарии и предлагает рекомендации. Решения и операции всегда остаются за вами.",
    color: "#007AFF",
    link: "/ai-consultant",
    label: "Спросить Кэшика",
  },
  {
    icon: BarChart3,
    title: "Аналитика и ML-прогнозы",
    desc: "Категоризирует траты, показывает динамику и помогает сравнить сценарии на основе ваших данных.",
    color: "#FF9500",
    link: "/ai-consultant",
    label: "Попробовать ML",
  },
  {
    icon: Medal,
    title: "Геймификация и рейтинг",
    desc: "Финансовый рейтинг, уровни, достижения за каждое осознанное действие. Управление деньгами становится привычкой.",
    color: "#34C759",
    link: "/avatar",
    label: "Мой рейтинг",
  },
  {
    icon: Building2,
    title: "Финансы для бизнеса",
    desc: "Для юрлиц и ИП: кассы, налоги, кэшбэк на бизнес-траты, подписки сотрудников. Всё в одном приложении.",
    color: "#FF3B30",
    link: "/products",
    label: "Для бизнеса",
  },
  {
    icon: Shield,
    title: "Безопасность и 115-ФЗ",
    desc: "Риск-анализ счёта, защита от мошенников, проверка на фишинг. Данные зашифрованы на вашем устройстве (AES-256).",
    color: "#AF52DE",
    link: "/fraud",
    label: "Проверить",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Создайте аккаунт", desc: "Имя, email и пароль — 30 секунд. Данные остаются на вашем устройстве.", icon: Shield },
  { step: "02", title: "Загрузите выписку", desc: "CSV из любого банка. Или добавляйте транзакции вручную — за пару минут.", icon: FileSpreadsheet },
  { step: "03", title: "Получите понятный анализ", desc: "Система категоризирует траты, находит закономерности и показывает возможные сценарии.", icon: Sparkles },
  { step: "04", title: "Играйте и достигайте целей", desc: "Финансовый рейтинг, уровни, ачивки за каждое осознанное действие. Деньги — это игра.", icon: Target },
];

const SERVICES = [
  {
    icon: Calculator,
    title: "Налоговый помощник",
    desc: "Рассчитывает вычеты (лечение, обучение, ИИС, квартира), помогает с 3-НДФЛ и оценивает экономию.",
    color: "#007AFF",
    link: "/tax-helper",
    label: "Рассчитать вычеты",
  },
  {
    icon: Home,
    title: "Ипотечный брокер",
    desc: "Помогает сравнить семейные, IT и рыночные программы, оценить переплату и подготовиться к заявке.",
    color: "#FF9500",
    link: "/consultants",
    label: "Подобрать ипотеку",
  },
  {
    icon: TrendingUp,
    title: "Инвестиции",
    desc: "Анализирует рынок, подбирает структуру портфеля под ваш риск-профиль и горизонт инвестирования.",
    color: "#34C759",
    link: "/invest",
    label: "Выбрать стратегию",
  },
  {
    icon: CreditCard,
    title: "Кредиты и рефинансирование",
    desc: "Сравнивает предложения, рассчитывает переплату, подбирает оптимальную стратегию погашения.",
    color: "#FF3B30",
    link: "/credits",
    label: "Сравнить кредиты",
  },
];

const TESTIMONIALS = [
  { name: "Александр М.", text: "Геймификация — это гениально. Я реально начал следить за расходами, чтобы повысить рейтинг. За месяц сэкономил 15 000 ₽.", role: "Разработчик, Москва" },
  { name: "Мария К.", text: "Модуль для юрлиц помог настроить финансы в ИП. Кэшбэк на бизнес-траты — неожиданно приятный бонус!", role: "CEO маркетингового агентства" },
  { name: "Дмитрий В.", text: "Аналитика от Кэшика с ML-прогнозами — то, что нужно. Сценарии «что если» помогают планировать крупные покупки.", role: "Инвестор, Санкт-Петербург" },
];

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen bg-white font-sans">


      {/* ═══════════════════════════════════════════════════════════════════════
          NAVBAR
         ═══════════════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/monetrix-logo.png" alt="Monetrix" width={140} height={30} priority />
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-[#8E8E93]">
            <a href="#features" className="hover:text-[#303030] transition-colors">Возможности</a>
            <a href="#how" className="hover:text-[#303030] transition-colors">Как работает</a>
            <a href="#services" className="hover:text-[#303030] transition-colors">Сервисы</a>
            <a href="#business" className="hover:text-[#303030] transition-colors">Бизнесу</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth">
              <button className="px-4 py-2 rounded-xl text-sm font-medium text-[#3629B7] hover:bg-[#3629B7]/5 transition-colors">Войти</button>
            </Link>
            <Link href="/auth">
              <button className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#3629B7] text-white hover:bg-[#2a1f8f] transition-colors shadow-md shadow-[#3629B7]/20">Начать бесплатно</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO — Next-gen financial platform
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3629B7] via-[#3629B7] to-[#2a1f8f] text-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-white/80 mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Управляйте своими финансами на основе подсказок технологий</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
              Управляйте своими финансами
              <br />
              <span className="relative">
                с помощью технологичных подсказок
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              Monetrix помогает видеть счета, анализировать траты и находить возможности для экономии. Получайте понятные подсказки, сравнивайте сценарии и принимайте решения самостоятельно.
              Данные обрабатываются с учётом настроек приватности и защищаются современными средствами безопасности.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Link href="/auth">
                <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[#3629B7] font-bold text-base hover:bg-white/95 transition-all shadow-2xl shadow-black/20">
                  Начать бесплатно
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <a href="#features">
                <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/15 transition-all">
                  Возможности
                  <ChevronRight className="w-4 h-4" />
                </button>
              </a>
              <PWAInstallButton variant="pill" />
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#34C759]" /> AES-256</span>
              <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-[#34C759]" /> PWA — работает офлайн</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" /> Без рекламы</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURES SECTION
         ═══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#303030] mb-4">Всё для управления финансами в одной платформе</h2>
            <p className="text-[#8E8E93] max-w-2xl mx-auto text-lg">Счета, аналитика, AI-советник, геймификация, бизнес-инструменты — без переключения между десятком приложений.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-[#E5E5EA] hover:border-[#3629B7]/20 hover:shadow-lg hover:shadow-[#3629B7]/5 transition-all duration-200">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.color + "15" }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-bold text-[#303030] mb-2">{f.title}</h3>
                <p className="text-sm text-[#8E8E93] leading-relaxed mb-4">{f.desc}</p>
                <Link href={f.link}>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: f.color }}>
                    {f.label} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════��══════════════════════════════════
          HOW IT WORKS
         ════════════════════════════════════════════════════════════════════���═══ */}
      <section id="how" className="py-20 md:py-24 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#303030] mb-4">Как работает платформа</h2>
            <p className="text-[#8E8E93] max-w-xl mx-auto text-lg">Четыре шага, чтобы лучше понимать свои финансы.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#3629B7]/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-5 h-5 text-[#3629B7]" />
                </div>
                <div className="text-[10px] font-black text-[#3629B7] tracking-widest mb-2">{step.step}</div>
                <h3 className="text-base font-bold text-[#303030] mb-2">{step.title}</h3>
                <p className="text-sm text-[#8E8E93] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SERVICES SECTION — AI consultants, tax, mortgage, invest, credits
         ═══════════════════════════════════════════════════════════════════════ */}
      <section id="services" className="py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Умные сервисы
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#303030] mb-4">Сервисы для каждой финансовой задачи</h2>
            <p className="text-[#8E8E93] max-w-2xl mx-auto text-lg">AI-помощники и инструменты, которые решают конкретные задачи: от налоговых вычетов до инвестиций.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map((s) => (
              <div key={s.title} className="group p-6 rounded-2xl border border-[#E5E5EA] hover:border-[#007AFF]/20 hover:shadow-lg hover:shadow-[#007AFF]/5 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "15" }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[#303030] mb-1">{s.title}</h3>
                    <p className="text-sm text-[#8E8E93] leading-relaxed mb-3">{s.desc}</p>
                    <Link href={s.link}>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: s.color }}>
                        {s.label} <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          AI CONSULTANT TEASER
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-white/5 blur-[80px]" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold mb-4">
                  <Brain className="w-3.5 h-3.5" /> AI-советник
                </div>
                <h2 className="text-2xl sm:text-3xl font-black mb-3">Спросите Кэшика — получите понятный разбор</h2>
                <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                  ИИ анализирует введённые вами данные, показывает сценарии и находит возможности для экономии. Он только предлагает варианты в рекомендательном формате: не управляет деньгами, не совершает операции и не несёт ответственности за финансовые решения.
                </p>
              </div>
              <Link href="/ai-consultant">
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-[#3629B7] font-bold text-sm hover:bg-white/95 transition-all shadow-xl shrink-0">
                  <Sparkles className="w-4 h-4" /> Открыть Кэшика <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          BUSINESS SECTION
         ═══════════════════════════════════════════════════════════════════════ */}
      <section id="business" className="py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF9500]/10 text-[#FF9500] text-xs font-semibold mb-4">
              <Building2 className="w-3.5 h-3.5" /> Для бизнеса
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#303030] mb-4">Финансы компании под контролем</h2>
            <p className="text-[#8E8E93] max-w-2xl mx-auto text-lg">Инструменты для юрлиц и ИП: кэшбэк до 20%, налоговый календарь, подписки сотрудников.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Gift, title: "Кэшбэк до 20%", desc: "На бизнес-траты: логистика, реклама, софт", color: "#34C759" },
              { icon: Receipt, title: "Налоговый календарь", desc: "УСН, НДС, взносы — сроки и суммы", color: "#007AFF" },
              { icon: Users, title: "Подписки сотрудников", desc: "До 5 сотрудников в тарифе Бизнес", color: "#AF52DE" },
              { icon: Calculator, title: "Аналитика компании", desc: "P&L, cashflow, план-факт", color: "#FF9500" },
            ].map((f) => (
              <div key={f.title} className="p-5 rounded-2xl bg-white border border-[#E5E5EA] hover:border-[#FF9500]/30 transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: f.color + "15" }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-bold text-[#303030] mb-1">{f.title}</h3>
                <p className="text-xs text-[#8E8E93]">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] p-5">
            <p className="text-xs text-[#8E8E93] mb-3 font-semibold uppercase tracking-wide">Сравнение РКО для ИП и ООО</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#8E8E93]">Банк</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-[#8E8E93]">Обслуживание</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-[#8E8E93]">Переводы ЮЛ</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-[#8E8E93]">Кэшбэк</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-[#8E8E93]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {[
                    { bank: "Т-Банк", free: "0–490 ₽/мес", transfers: "До 100 000 ₽", cashback: "До 20%", url: "https://www.tbank.ru/business/" },
                    { bank: "Альфа-Банк", free: "0–990 ₽/мес", transfers: "До 5 бесплатно", cashback: "До 15%", url: "https://alfabank.ru/sme/" },
                    { bank: "Модульбанк", free: "0–690 ₽/мес", transfers: "До 100 000 ₽", cashback: "До 10%", url: "https://modulbank.ru/" },
                    { bank: "Точка", free: "0–490 ₽/мес", transfers: "До 100 000 ₽", cashback: "До 15%", url: "https://tochka.com/" },
                  ].map((b) => (
                    <tr key={b.bank} className="bg-white hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-3 py-2.5 font-bold text-xs text-[#303030]">{b.bank}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-[#8E8E93]">{b.free}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-[#8E8E93]">{b.transfers}</td>
                      <td className="px-3 py-2.5 text-center"><span className="text-xs font-bold text-[#34C759]">{b.cashback}</span></td>
                      <td className="px-3 py-2.5 text-center">
                        <a href={b.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF9500] text-white text-[10px] font-semibold hover:bg-[#E68600] transition-colors">
                          Открыть <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Сравнить РКО на banki.ru", url: "https://www.banki.ru/business/" },
                { label: "ФНС — регистрация ИП", url: "https://www.nalog.gov.ru/rn77/service/gosreg_ip/" },
                { label: "Мой налог (НПД)", url: "https://npd.nalog.ru/" },
                { label: "СБП для юрлиц", url: "https://sbp.nspk.ru/business/" },
              ].map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5EA] text-xs text-[#303030] hover:border-[#007AFF]/30 hover:text-[#007AFF] transition-colors">
                  <ExternalLink className="w-3 h-3" /> {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECURITY
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#34C759]/15 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-7 h-7 text-[#34C759]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#303030] mb-4">Данные остаются у вас</h2>
            <p className="text-[#8E8E93] text-lg mb-8 max-w-xl mx-auto">
              Шифрование AES-256, хранение в браузере. Monetrix не получает ваши данные.
              Нет серверов — нечего взламывать.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: Lock, text: "AES-256-шифрование" },
                { icon: Shield, text: "На вашем устройстве" },
                { icon: CheckCircle2, text: "Без рекламы" },
                { icon: Globe, text: "Работает офлайн" },
                { icon: Smartphone, text: "PWA — установка на экран" },
              ].map((item) => (
                <span key={item.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5E5EA] text-sm text-[#303030]">
                  <item.icon className="w-3.5 h-3.5 text-[#34C759]" /> {item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-[#303030] mb-3">Отзывы пользователей</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FF9500] text-[#FF9500]" />)}
                </div>
                <p className="text-sm text-[#303030] leading-relaxed mb-4">«{t.text}»</p>
                <div className="text-sm font-semibold text-[#303030]">{t.name}</div>
                <div className="text-xs text-[#8E8E93]">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-[#3629B7] to-[#2a1f8f] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center mb-8">
            <MonetrixIcon size={64} white />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Готовы начать?</h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Бесплатно, без рекламы. AI-советник, ML-прогнозы, геймификация,
            кэшбэк и управление для бизнеса в одном приложении.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link href="/auth">
              <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[#3629B7] font-bold text-base hover:bg-white/95 transition-all shadow-2xl shadow-black/20">
                Создать аккаунт — бесплатно <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a href="https://t.me/ILKHAAAN" target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/15 transition-all">
                <MessageCircle className="w-4 h-4" /> Написать вопрос
              </button>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-white/50">
            <a href="https://cbr.ru" target="_blank" rel="noopener noreferrer" className="hover:text-white/80">ЦБ РФ</a>
            <span>·</span>
            <a href="https://www.moex.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/80">Мосбиржа</a>
            <span>·</span>
            <a href="https://www.banki.ru" target="_blank" rel="noopener noreferrer" className="hover:text-white/80">Банки.ру</a>
            <span>·</span>
            <a href="https://www.nalog.gov.ru" target="_blank" rel="noopener noreferrer" className="hover:text-white/80">ФНС России</a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#E5E5EA] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3 shrink-0">
              <Image src="/monetrix-logo.png" alt="Monetrix" width={130} height={28} />
              <span className="text-[#8E8E93] text-sm">— умные финансы</span>
            </div>
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#EEF4FF] via-[#F2EEFF] to-[#EEF4FF] border-2 border-[#D6E4FF] shadow-xl">
              <div className="absolute inset-0 bg-white/30 pointer-events-none" />
              <div className="relative px-5 py-4 flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-md border border-[#D6E4FF] flex items-center justify-center p-1.5">
                    <Image src="/fsi-logo.png" alt="ФСИ" width={38} height={38} className="object-contain" />
                  </div>
                  <span className="text-[#8E8E93] text-base font-bold">×</span>
                  <div className="w-14 h-14 rounded-xl bg-white shadow-md border border-[#D6E4FF] flex items-center justify-center p-1.5">
                    <Image src="/put-platform-logo.png" alt="ПУТП" width={38} height={38} className="object-contain" />
                  </div>
                </div>
                <div className="border-l-2 border-[#D6E4FF] pl-4 flex flex-col gap-1">
                  <p className="text-[11px] font-black text-[#1E40AF] leading-tight tracking-wide">
                    ПЛАТФОРМА УНИВЕРСИТЕТСКОГО<br />ТЕХНОЛОГИЧЕСКОГО ПРЕДПРИНИМАТЕЛЬСТВА
                  </p>
                  <p className="text-[9px] text-[#3B82F6] font-semibold">Фонд содействия инновациям · Программа «Студенческий стартап»</p>
                  <p className="text-[10px] text-[#4B5563] leading-relaxed pt-1 border-t border-[#D6E4FF]">
                    Проект реализован при поддержке Фонда содействия инновациям в рамках программы
                    «Студенческий стартап» мероприятия «Платформа университетского технологического
                    предпринимательства» федерального проекта «Технологии»
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h4 className="text-xs font-bold text-[#303030] uppercase tracking-wider mb-3">Продукт</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Возможности</a>
                <a href="#services" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Сервисы</a>
                <a href="#business" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Для бизнеса</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#303030] uppercase tracking-wider mb-3">Сервисы</h4>
              <div className="space-y-2">
                <Link href="/ai-consultant" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Кэшик AI</Link>
                <Link href="/invest" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Инвестиции</Link>
                <Link href="/tax-helper" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Налоги</Link>
                <Link href="/products" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Продукты</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#303030] uppercase tracking-wider mb-3">Ресурсы</h4>
              <div className="space-y-2">
                <a href="https://cbr.ru" target="_blank" rel="noopener noreferrer" className="block text-xs text-[#8E8E93] hover:text-[#303030]">ЦБ РФ</a>
                <a href="https://www.moex.com" target="_blank" rel="noopener noreferrer" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Московская биржа</a>
                <a href="https://www.banki.ru" target="_blank" rel="noopener noreferrer" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Банки.ру</a>
                <a href="https://www.nalog.gov.ru" target="_blank" rel="noopener noreferrer" className="block text-xs text-[#8E8E93] hover:text-[#303030]">ФНС России</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#303030] uppercase tracking-wider mb-3">Связаться</h4>
              <div className="space-y-2">
                <a href="https://t.me/ILKHAAAN" target="_blank" rel="noopener noreferrer" className="block text-xs text-[#8E8E93] hover:text-[#303030]">Telegram</a>
                <a href="mailto:hello@monetrix.ru" className="block text-xs text-[#8E8E93] hover:text-[#303030]">hello@monetrix.ru</a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#8E8E93] mb-6">
            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> AES-256</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Данные на устройстве</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Без рекламы</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Offline-ready</span>
          </div>
        </div>
        <div className="border-t border-[#F0F0F5] bg-[#FAFAFA]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-[#8E8E93]">
            &copy; 2026 Monetrix · Платформа нового поколения для управления финансами
          </div>
        </div>
      </footer>

      <PWAInstallButton variant="banner" />
    </div>
  );
}
