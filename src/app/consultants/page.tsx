"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Shield, Sparkles, TrendingUp, Lock,
  CheckCircle2, Clock, Star, Award, Briefcase, Calculator,
  Receipt, Home, CreditCard, FileText,
} from "lucide-react";

// ── Expert profiles ───────────────────────────────────────────────────────────

const EXPERTS = [
  {
    role: "Персональный финансовый советник",
    emoji: "💼",
    tagColor: "#3629B7",
    tagBg: "#3629B7",
    cert: "CFP (Certified Financial Planner) · ФСФР 1.0",
    certNote: "Сертификат CFP, аттестат ФСФР первого уровня",
    specialties: ["Личный бюджет и накопления", "Инвестиционный портфель", "Финансовые цели и планирование", "Выбор банковских продуктов"],
    priceFrom: "от 2 500 ₽",
    priceNote: "за 60 минут онлайн",
    format: "Онлайн · Telegram · Zoom",
    avgTime: "60–90 мин",
    icon: Briefcase,
    highlight: "Подбирает стратегию под ваш доход и цели. Помогает сэкономить 15–30% расходов уже в первый месяц.",
    stars: 5,
    reviews: 47,
  },
  {
    role: "Налоговый консультант",
    emoji: "🧾",
    tagColor: "#007AFF",
    tagBg: "#007AFF",
    cert: "Аттестат налогового консультанта ИПБР · 5 лет практики",
    certNote: "Аттестат ИПБР (Институт профессиональных бухгалтеров России)",
    specialties: ["Налоговые вычеты (лечение, обучение, ИИС)", "Имущественный вычет при покупке жилья", "Декларация 3-НДФЛ под ключ", "Налоги ИП и самозанятых"],
    priceFrom: "от 1 500 ₽",
    priceNote: "за вычет под ключ",
    format: "Онлайн · Email · Telegram",
    avgTime: "30–45 мин",
    icon: Receipt,
    highlight: "Помогает вернуть в среднем 38 000 ₽ в год через вычеты. Декларацию заполнит и подаст за вас.",
    stars: 5,
    reviews: 83,
  },
  {
    role: "Ипотечный брокер",
    emoji: "🏠",
    tagColor: "#FF9500",
    tagBg: "#FF9500",
    cert: "Лицензия ЦБ РФ · Партнёр 12 банков · АИЖК сертификат",
    certNote: "Официальный партнёр Сбербанка, ВТБ, Т-Банка и 9 других",
    specialties: ["Семейная и IT-ипотека", "Подбор банка и одобрение", "Рефинансирование ипотеки", "Анализ условий и расчёт переплаты"],
    priceFrom: "Бесплатно*",
    priceNote: "*Вознаграждение от банка, не от вас",
    format: "Онлайн · Telegram · По городам",
    avgTime: "45–60 мин",
    icon: Home,
    highlight: "Экономит в среднем 120 000–400 000 ₽ на переплате за счёт подбора оптимального банка и условий.",
    stars: 5,
    reviews: 61,
  },
  {
    role: "Инвестиционный аналитик",
    emoji: "📈",
    tagColor: "#34C759",
    tagBg: "#34C759",
    cert: "CFA Level II · ФСФР 1.0 · 8 лет на рынке",
    certNote: "CFA (Chartered Financial Analyst) — международная квалификация",
    specialties: ["ОФЗ, облигации, БПИФ", "Составление портфеля по риску", "ИИС тип А и Б", "Фундаментальный анализ акций"],
    priceFrom: "от 3 000 ₽",
    priceNote: "за консультацию + план",
    format: "Онлайн · Zoom · Telegram",
    avgTime: "60 мин",
    icon: TrendingUp,
    highlight: "Составляет диверсифицированный портфель, отвечающий вашему риск-профилю. Реальные сделки, не теория.",
    stars: 4,
    reviews: 29,
  },
  {
    role: "Юрист по 115-ФЗ и банковскому праву",
    emoji: "⚖️",
    tagColor: "#8E8E93",
    tagBg: "#8E8E93",
    cert: "Адвокатское удостоверение АП Москвы · Специализация — банковское право",
    certNote: "Удостоверение адвоката, 6 лет практики по спорам с банками",
    specialties: ["Разблокировка счетов и карт", "Оспаривание решений по 115-ФЗ", "Жалобы в ЦБ и межведомственную комиссию", "Защита прав в банковских спорах"],
    priceFrom: "от 4 000 ₽",
    priceNote: "за консультацию + заявление",
    format: "Онлайн · Telegram · Почта",
    avgTime: "60 мин",
    icon: Shield,
    highlight: "Разблокировал 200+ счетов. 87% дел решаются без суда — через жалобу в ЦБ или комиссию.",
    stars: 5,
    reviews: 38,
  },
  {
    role: "Бухгалтер и налоговый консультант для ИП",
    emoji: "🧮",
    tagColor: "#AF52DE",
    tagBg: "#AF52DE",
    cert: "Аттестат ИПБР · 1С сертификат · 7 лет с ИП",
    certNote: "Аттестованный бухгалтер ИПБР, опыт с ИП и самозанятыми",
    specialties: ["Налоги ИП на УСН и патенте", "Переход с самозанятости на ИП", "Годовая отчётность и декларации", "Оптимизация налоговой нагрузки"],
    priceFrom: "от 1 800 ₽",
    priceNote: "за консультацию",
    format: "Онлайн · Telegram",
    avgTime: "45–60 мин",
    icon: Calculator,
    highlight: "Помогает ИП экономить 20–40% на налогах через правильный выбор системы и вычетов страховых взносов.",
    stars: 5,
    reviews: 55,
  },
];

const TOPICS = [
  { icon: "💳", label: "Кредиты и ипотека" },
  { icon: "📈", label: "Инвестиции" },
  { icon: "🧾", label: "Налоговые вычеты" },
  { icon: "🏦", label: "Выбор банка и карты" },
  { icon: "🔒", label: "115-ФЗ и блокировки" },
  { icon: "💼", label: "Бизнес-финансы и ИП" },
  { icon: "🎯", label: "Финансовые цели" },
  { icon: "🛡️", label: "Защита от мошенников" },
];

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= stars ? "text-[#FF9500] fill-[#FF9500]" : "text-[#E5E5EA]"}`}
        />
      ))}
    </div>
  );
}

export default function ConsultantsPage() {
  return (
    <AppShell>
      <div className="space-y-5 max-w-[900px]">

        {/* Hero */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3629B7] to-[#2a1f8f] text-white">
          <CardContent className="p-6 md:p-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#4a3dd4]/30 blur-[80px]" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4 shadow-lg">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Консультации с экспертами</h2>
              <p className="text-white/70 max-w-lg leading-relaxed text-sm">
                Аттестованные специалисты по финансам, налогам, ипотеке и инвестициям.
                Выберите нужного эксперта — свяжемся в Telegram и подберём подходящего.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-white/80">✅ Только проверенные специалисты</span>
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-white/80">🔒 Полная конфиденциальность</span>
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 text-white/80">📱 Онлайн-формат</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Experts grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-[#3629B7]" />
            <h3 className="text-base font-bold text-[#303030]">Наши эксперты</h3>
            <span className="text-xs text-[#8E8E93] ml-1">{EXPERTS.length} специалистов</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPERTS.map((expert) => (
              <Card key={expert.role} className="border border-[#E5E5EA] hover:border-[#3629B7]/30 hover:shadow-md transition-all overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: `${expert.tagBg}15` }}>
                        {expert.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#303030] leading-tight">{expert.role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating stars={expert.stars} />
                          <span className="text-[11px] text-[#8E8E93]">{expert.reviews} отзывов</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#303030]">{expert.priceFrom}</p>
                        <p className="text-[10px] text-[#8E8E93]">{expert.priceNote}</p>
                      </div>
                    </div>

                    {/* Certification */}
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#F5F5F7] mb-3">
                      <Award className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: expert.tagColor }} />
                      <div>
                        <p className="text-[11px] font-semibold text-[#303030]">{expert.cert}</p>
                        <p className="text-[10px] text-[#8E8E93] mt-0.5">{expert.certNote}</p>
                      </div>
                    </div>

                    {/* Highlight */}
                    <p className="text-xs text-[#303030] leading-relaxed mb-3">{expert.highlight}</p>

                    {/* Specialties */}
                    <div className="space-y-1 mb-3">
                      {expert.specialties.map((s) => (
                        <div key={s} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: expert.tagColor }} />
                          <p className="text-[11px] text-[#8E8E93]">{s}</p>
                        </div>
                      ))}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[10px] text-[#8E8E93] mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{expert.avgTime}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{expert.format}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-4 pb-4">
                    <a href="https://t.me/ILKHAAAN" target="_blank" rel="noopener noreferrer">
                      <Button className="w-full h-9 rounded-xl gap-2 text-sm font-semibold"
                        style={{ background: expert.tagBg }}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                        Записаться — @ILKHAAAN
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div>
          <h3 className="text-sm font-semibold text-[#303030] mb-3">По каким вопросам помогаем:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOPICS.map((t) => (
              <div key={t.label} className="p-3 rounded-xl bg-white border border-[#E5E5EA] flex items-center gap-2.5 hover:border-[#3629B7]/30 transition-all">
                <span className="text-lg shrink-0">{t.icon}</span>
                <p className="text-xs font-medium text-[#303030] leading-tight">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why us */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#303030] mb-3">Почему стоит обратиться:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Shield, text: "Строгая конфиденциальность — только вы решаете что рассказывать" },
                { icon: Sparkles, text: "Индивидуальный подход — конкретные цифры, а не шаблонные советы" },
                { icon: TrendingUp, text: "Реальный опыт — практические решения с расчётами и примерами" },
                { icon: Lock, text: "Данные Monetrix не передаются без вашего явного согласия" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F5F7]">
                  <item.icon className="w-4 h-4 text-[#3629B7] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#303030] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-[#F5F5F7] border-0">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#303030] mb-3">Как это работает:</h3>
            <div className="space-y-3">
              {[
                { step: "1", text: "Напишите в Telegram @ILKHAAAN и опишите свой вопрос", note: "Бесплатно, без обязательств" },
                { step: "2", text: "Мы подберём эксперта с нужной квалификацией", note: "1-2 часа в рабочее время" },
                { step: "3", text: "Договоритесь об удобном времени и формате консультации", note: "Онлайн, Telegram или Zoom" },
                { step: "4", text: "Получите персональный план с конкретными цифрами и шагами", note: "Документ остаётся у вас" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#3629B7] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-white">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm text-[#303030] leading-snug">{item.text}</p>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#3629B7]/10 to-[#4a3dd4]/5 border border-[#3629B7]/15">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-[#303030]">Готовы получить совет?</p>
            <p className="text-xs text-[#8E8E93] mt-0.5">Первый контакт бесплатный. Подберём нужного эксперта за 1-2 часа.</p>
          </div>
          <a href="https://t.me/ILKHAAAN" target="_blank" rel="noopener noreferrer">
            <Button className="h-10 px-5 rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white font-semibold shadow-md gap-2">
              <MessageCircle className="w-4 h-4" />
              Написать @ILKHAAAN
            </Button>
          </a>
        </div>

        <p className="text-[11px] text-[#8E8E93] text-center pb-2">
          Все эксперты проверены. Данные носят информационный характер. Финальный выбор специалиста за вами.
        </p>
      </div>
    </AppShell>
  );
}
