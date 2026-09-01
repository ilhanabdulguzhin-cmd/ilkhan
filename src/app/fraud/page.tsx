"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, ArrowRight, Sparkles, Info, Search,
  Scale, Eye, Phone, ExternalLink,
} from "lucide-react";

// ── Verified fraud data (April 2026) ──────────────────────────────────────────
// Sources: cbr.ru, mvd.ru, fssp.gov.ru, rbc.ru

const FRAUD_STATS = [
  { label: "Ущерб 2025", value: "27 млрд ₽", note: "только телефонное мошенничество · cbr.ru", color: "#FF3B30", url: "https://cbr.ru/press/event/?id=22601" },
  { label: "Возвращено жертвам", value: "4.4 млрд ₽", note: "за 2025 год · ФЗ-161 · cbr.ru", color: "#34C759", url: "https://cbr.ru/press/event/" },
  { label: "Жалоб на Авито", value: "15 000/мес", note: "мошеннических объявлений", color: "#FF9500", url: "https://www.rbc.ru/finances/" },
  { label: "Средний убыток", value: "1.3 млн ₽", note: "псевдоинвестиции · МВД", color: "#AF52DE", url: "https://mvd.ru/" },
];

const FRAUD_SCHEMES = [
  {
    emoji: "📞",
    name: "Звонки от «банка» / «ФСБ»",
    stat: "Ущерб 2025: 27 млрд ₽ · самая частая схема · источник: cbr.ru",
    statUrl: "https://cbr.ru/press/event/?id=22601",
    signs: [
      "Просят CVV, PIN или OTP-код",
      "Говорят про «безопасный счёт»",
      "Создают срочность: «прямо сейчас»",
      "Просят установить приложение (AnyDesk, TeamViewer)",
      "Называют ФИО и последние 4 цифры карты — это не доказательство что это банк",
    ],
    action: "Положите трубку. Позвоните в банк сами по номеру на карте.",
    color: "#FF3B30",
  },
  {
    emoji: "🔗",
    name: "Фишинговые сайты",
    stat: "Каждый 10-й переход по SMS-ссылке — поддельный сайт · Роскомнадзор",
    statUrl: "https://rkn.gov.ru/",
    signs: [
      "URL отличается от официального (gosuslug.ru вместо gosuslugi.ru)",
      "Ссылка пришла в SMS с обещанием выигрыша",
      "Нет HTTPS или неизвестный сертификат",
      "Просят ввести данные карты для «получения выплаты»",
      "Дизайн слегка отличается от настоящего сайта",
    ],
    action: "Вводите адрес банка вручную. Не переходите по ссылкам из SMS/мессенджеров.",
    color: "#FF9500",
  },
  {
    emoji: "📈",
    name: "Псевдоинвестиции",
    stat: "Средний убыток жертвы: 1.3 млн ₽ · источник: МВД России",
    statUrl: "https://mvd.ru/",
    signs: [
      "Гарантированный доход 30–200% годовых",
      "Нет лицензии ЦБ (проверяйте: cbr.ru/registries)",
      "Нельзя вывести деньги без «налога» или «страховки»",
      "Реклама через Telegram-каналы и «закрытые чаты»",
      "Менеджер «личный» звонит сам и торопит с решением",
    ],
    action: "Проверьте лицензию ЦБ на cbr.ru/registries. Гарантированного дохода на рынке не существует.",
    color: "#FF9500",
  },
  {
    emoji: "🛒",
    name: "Авито и маркетплейсы",
    stat: "15 000 жалоб/мес только на Авито · по данным платформы",
    statUrl: "https://www.avito.ru/company/safety",
    signs: [
      "Цена значительно ниже рынка",
      "Переводят в мессенджер для «безопасной сделки»",
      "Присылают ссылку на «Авито Доставку» — поддельный сайт",
      "Просят данные обеих сторон карты",
      "Торопят или ссылаются на «другого покупателя»",
    ],
    action: "Платите только через официальные сервисы платформы. Для получения денег нужен только номер карты — не CVV.",
    color: "#FF9500",
  },
  {
    emoji: "💼",
    name: "Ложная работа / подработка",
    stat: "Рост на 40% в 2025 · источник: hh.ru",
    statUrl: "https://hh.ru/article/fraud",
    signs: [
      "Обещают 50–100 000 ₽/мес за «лёгкую» удалённую работу",
      "Просят купить оборудование или пройти обучение за деньги",
      "Перевести деньги для «тестового задания»",
      "Оформление без договора, только через мессенджер",
    ],
    action: "Легальный работодатель никогда не просит вложить деньги. Договор перед любой работой — обязателен.",
    color: "#FF3B30",
  },
  {
    emoji: "🏦",
    name: "Мошенники-«финансовые консультанты»",
    stat: "Более 4 000 нелегальных организаций выявлено ЦБ в 2025",
    statUrl: "https://cbr.ru/registries/",
    signs: [
      "Предлагают «уникальную» схему инвестирования с гарантией",
      "Запрашивают доступ к брокерскому счёту или интернет-банку",
      "Обещают помочь вернуть деньги потерянные у другого мошенника",
      "Нет лицензии ЦБ — проверяйте на cbr.ru/registries",
    ],
    action: "Проверьте лицензию на cbr.ru/registries. Реальный консультант не управляет вашими деньгами без договора.",
    color: "#FF3B30",
  },
];

// ── Compliance guides ─────────────────────────────────────────────────────────
const COMPLIANCE = [
  {
    emoji: "⚖️",
    name: "ФЗ-115: Блокировка счёта",
    law: "ФЗ-115",
    desc: "Банк вправе заблокировать счёт при подозрении в отмывании. Вы обязаны предоставить документы. Срок ответа банка — 7 рабочих дней. При несогласии — Росфинмониторинг и суд.",
    key: "Всегда сохраняйте документы о происхождении крупных сумм",
    color: "#3629B7",
    url: "https://www.fedsfm.ru/",
  },
  {
    emoji: "💰",
    name: "Возврат от мошенников",
    law: "ФЗ-161, ст. 9",
    desc: "С июля 2024 банки обязаны возместить похищенные средства в течение 30 дней, если перевод попал в базу мошенников ЦБ. За 2025 год возвращено более 4.4 млрд ₽.",
    key: "Срок подачи заявления: 30 дней с момента операции",
    color: "#34C759",
    url: "https://cbr.ru/consumer_protection/protection_tools/",
  },
  {
    emoji: "📋",
    name: "Страхование вкладов (АСВ)",
    law: "ФЗ-177",
    desc: "Вклады застрахованы до 1.4 млн ₽ на одного вкладчика в одном банке. Повышенный лимит 10 млн ₽ — при получении наследства, продаже жилья, соцвыплатах (90 дней).",
    key: "Накопительные счета тоже застрахованы",
    color: "#007AFF",
    url: "https://www.asv.org.ru/",
  },
  {
    emoji: "🚔",
    name: "Куда жаловаться",
    law: "Несколько ведомств",
    desc: "• МВД (мвд.рф/complaint) — мошенничество\n• ЦБ РФ (cbr.ru/reception) — нарушения банков\n• Роспотребнадзор — нарушения потребительских прав\n• ФССП (fssp.gov.ru) — незаконные действия коллекторов\n• Роскомнадзор (rkn.gov.ru) — фишинговые сайты",
    key: "Заявление в МВД — обязательный шаг для чарджбека",
    color: "#FF9500",
    url: "https://mvd.ru/",
  },
  {
    emoji: "🔍",
    name: "Как проверить организацию",
    law: "Реестры ЦБ РФ",
    desc: "Реестр лицензированных банков, МФО, брокеров и НПФ — на сайте ЦБ. Нет в реестре = нелегальная организация. Также: список финансовых пирамид, чёрный список ЦБ.",
    key: "Проверяйте ЛЮБУЮ финансовую организацию до передачи денег",
    color: "#FF3B30",
    url: "https://cbr.ru/registries/",
  },
];

// ── Scam checker ──────────────────────────────────────────────────────────────
function ScamChecker() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ safe: boolean; flags: string[]; level: "safe" | "warning" | "danger" } | null>(null);

  const check = () => {
    if (!text.trim()) return;
    const t = text.toLowerCase();
    const flags: string[] = [];
    if (/безопасный счёт|безопас.*перевод/i.test(t)) flags.push("«Безопасный счёт» — классическая схема мошенников банков");
    if (/cvv|cvc|пин.*код|пин-код/i.test(t)) flags.push("Запрос CVV/PIN — никогда не сообщайте эти данные");
    if (/anydesk|teamviewer|nydus|удалённый доступ/i.test(t)) flags.push("Просьба установить ПО удалённого доступа");
    if (/следственн|фсб|мвд.*звон|прокурор/i.test(t)) flags.push("Силовые структуры не блокируют счета по телефону");
    if (/гарантированн.*доход|200%|300%|500% год/i.test(t)) flags.push("Гарантированного дохода на рынке не существует");
    if (/срочно.*сейчас|прямо сейчас|последний шанс/i.test(t)) flags.push("Искусственная срочность — типичная манипуляция");
    if (/выиграли|вы выбраны|вам одобрен без/i.test(t)) flags.push("Неожиданный «выигрыш» без участия — мошенничество");
    if (/перейдите по ссылке|нажмите на ссылку/i.test(t)) flags.push("Подозрительная ссылка — не переходите без проверки URL");
    if (/код из смс|код подтвержден|сообщите код/i.test(t)) flags.push("Запрос кода из SMS — только для мошенников, банк не просит");
    if (/налог.*вывод|страховой взнос.*инвест|платёж.*получ/i.test(t)) flags.push("«Налог» или «страховка» для вывода — схема псевдоинвестиций");

    const level = flags.length === 0 ? "safe" : flags.length >= 3 ? "danger" : "warning";
    setResult({ safe: flags.length === 0, flags, level });
  };

  return (
    <Card className="border-[#E5E5EA]">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-[#FF3B30]" />
          <p className="text-sm font-bold text-[#303030]">Проверить на мошенничество</p>
        </div>
        <p className="text-xs text-[#8E8E93] mb-3">Вставьте текст сообщения или опишите ситуацию</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="«Здравствуйте, это служба безопасности Сбербанка. По вашей карте зафиксирована подозрительная операция...»"
          className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm resize-none focus:outline-none focus:border-[#FF3B30]/40 mb-3" />
        <button onClick={check} className="w-full py-2.5 rounded-xl bg-[#FF3B30] text-white text-sm font-semibold hover:bg-[#e0352b] transition-colors">
          Проверить
        </button>
        {result && (
          <div className={`mt-4 p-4 rounded-xl border ${
            result.level === "safe" ? "bg-[#34C759]/8 border-[#34C759]/20" :
            result.level === "warning" ? "bg-[#FF9500]/8 border-[#FF9500]/20" :
            "bg-[#FF3B30]/8 border-[#FF3B30]/20"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.safe
                ? <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
                : result.level === "warning"
                ? <AlertTriangle className="w-5 h-5 text-[#FF9500]" />
                : <XCircle className="w-5 h-5 text-[#FF3B30]" />}
              <p className="text-sm font-bold" style={{ color: result.safe ? "#34C759" : result.level === "warning" ? "#FF9500" : "#FF3B30" }}>
                {result.safe ? "Явных признаков мошенничества нет" :
                 result.level === "warning" ? `Есть ${result.flags.length} подозрительных признака — будьте осторожны` :
                 `Высокий риск! ${result.flags.length} явных признаков мошенничества`}
              </p>
            </div>
            {result.flags.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30] shrink-0 mt-0.5" />
                <p className="text-xs text-[#FF3B30]">{f}</p>
              </div>
            ))}
            {!result.safe && (
              <Link href="/ai-consultant?context=fraud" className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#FF3B30]">
                Что делать <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FraudPage() {
  const [tab, setTab] = useState<"overview" | "schemes" | "compliance" | "checker">("overview");
  const [open, setOpen] = useState<number | null>(null);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF3B30]/15 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-[#FF3B30]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#303030]">Защита и комплаенс</h1>
              <p className="text-xs text-[#8E8E93]">Мошенничество · ваши права · проверка</p>
            </div>
          </div>
          <Link href="/ai-consultant?context=fraud" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] text-xs font-semibold border border-[#FF3B30]/20">
            <Sparkles className="w-3.5 h-3.5" /> Кэшик
          </Link>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2">
          {FRAUD_STATS.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-white border border-[#E5E5EA] hover:border-[#FF3B30]/20 transition-colors group">
              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] font-medium text-[#303030]">{s.label}</p>
              <p className="text-[10px] text-[#8E8E93] group-hover:text-[#007AFF] transition-colors leading-tight">{s.note}</p>
            </a>
          ))}
        </div>

        {/* Emergency strip */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FF3B30]/8 border border-[#FF3B30]/15">
          <AlertTriangle className="w-5 h-5 text-[#FF3B30] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#FF3B30]">Обманули прямо сейчас?</p>
            <p className="text-xs text-[#8E8E93]">Заблокируйте карту → позвоните в банк → заявление в МВД (мвд.рф)</p>
          </div>
          <button onClick={() => setTab("overview")} className="text-xs font-semibold text-[#FF3B30] shrink-0 flex items-center gap-0.5">
            Шаги <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-2xl">
          {[
            { id: "overview", label: "Если обманули", icon: Phone },
            { id: "schemes", label: "Схемы", icon: Eye },
            { id: "compliance", label: "Права", icon: Scale },
            { id: "checker", label: "Проверить", icon: Search },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-[#303030] shadow-sm" : "text-[#8E8E93]"}`}>
              <t.icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── ЕСЛИ ОБМАНУЛИ ── */}
        {tab === "overview" && (
          <div className="space-y-3">
            <p className="text-sm text-[#8E8E93]">Действуйте быстро — шансы вернуть деньги выше в первые часы.</p>
            <div className="space-y-2">
              {[
                { step: "1", icon: "🔒", title: "Заблокируйте карту", desc: "Через приложение банка или горячую линию — немедленно" },
                { step: "2", icon: "📞", title: "Позвоните в банк", desc: "По номеру на обороте карты (не по тому, что прислали мошенники)" },
                { step: "3", icon: "📋", title: "Заявление в банк", desc: "На оспаривание операции — в течение 30 дней, банк обязан рассмотреть (ФЗ-161)" },
                { step: "4", icon: "🚔", title: "Заявление в МВД", desc: "Онлайн на мвд.рф или в отделении. Нужен талон — обязателен для чарджбека" },
                { step: "5", icon: "📢", title: "Жалоба в ЦБ", desc: "cbr.ru/reception — если банк нарушает процедуру возврата средств" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E5E5EA]">
                  <div className="w-8 h-8 rounded-full bg-[#FF3B30] flex items-center justify-center text-white text-sm font-bold shrink-0">{s.step}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#303030]">{s.icon} {s.title}</p>
                    <p className="text-xs text-[#8E8E93] mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Golden rules */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a1040] to-[#3629B7] text-white">
              <p className="text-sm font-bold mb-3">🛡️ 5 золотых правил</p>
              <div className="space-y-2">
                {[
                  "Никогда не сообщайте CVV, PIN и OTP-коды — никому и никогда",
                  "Банк никогда не просит перевести деньги на «безопасный счёт»",
                  "Гарантированного дохода на инвестициях не существует",
                  "Для получения денег нужен только номер карты — не CVV и не код",
                  "Силовые структуры не блокируют счета по звонку",
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/85 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "МВД — подать заявление", url: "https://мвд.рф/request_main", color: "#FF3B30" },
                { label: "ЦБ — жалоба на банк", url: "https://cbr.ru/reception/", color: "#3629B7" },
                { label: "Проверить организацию", url: "https://cbr.ru/registries/", color: "#007AFF" },
                { label: "АСВ — страхование вкладов", url: "https://www.asv.org.ru/", color: "#34C759" },
              ].map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5EA] hover:border-[#FF3B30]/20 transition-colors bg-white">
                  <p className="text-xs font-semibold" style={{ color: l.color }}>{l.label}</p>
                  <ExternalLink className="w-3 h-3 text-[#C7C7CC] shrink-0 ml-1" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── СХЕМЫ ── */}
        {tab === "schemes" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FF3B30]/8 border border-[#FF3B30]/15">
              <Info className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Данные за 2025 год. Источники:{" "}
                <a href="https://cbr.ru/press/event/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">cbr.ru</a>,{" "}
                <a href="https://mvd.ru/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">mvd.ru</a>,{" "}
                <a href="https://www.rbc.ru/finances/" target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">rbc.ru</a>
              </p>
            </div>
            {FRAUD_SCHEMES.map((scheme, i) => (
              <Card key={i} className="border-[#E5E5EA] overflow-hidden">
                <button className="w-full text-left p-4" onClick={() => setOpen(open === i ? null : i)}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{scheme.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#303030]">{scheme.name}</p>
                      <a href={scheme.statUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-[#8E8E93] hover:text-[#007AFF] mt-0.5 inline-flex items-center gap-0.5">
                        {scheme.stat} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-[#C7C7CC] transition-transform shrink-0 ${open === i ? "rotate-90" : ""}`} />
                  </div>
                </button>
                {open === i && (
                  <div className="px-4 pb-4 border-t border-[#F5F5F7] pt-3 space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-[#FF3B30] mb-1.5">🚩 Признаки</p>
                      {scheme.signs.map((s, j) => (
                        <div key={j} className="flex items-start gap-1.5 mb-1">
                          <XCircle className="w-3 h-3 text-[#FF3B30] shrink-0 mt-0.5" />
                          <span className="text-[11px] text-[#303030]">{s}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20">
                      <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#303030] font-semibold leading-relaxed">{scheme.action}</p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── ПРАВА ── */}
        {tab === "compliance" && (
          <div className="space-y-3">
            <p className="text-sm text-[#8E8E93]">Актуальные законы и регуляции, которые защищают вас как клиента банка.</p>
            {COMPLIANCE.map((c, i) => (
              <Card key={i} className="border-[#E5E5EA]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.emoji}</span>
                      <p className="text-sm font-bold text-[#303030]">{c.name}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#8E8E93] font-mono shrink-0">{c.law}</span>
                  </div>
                  <p className="text-xs text-[#8E8E93] leading-relaxed whitespace-pre-line mb-2">{c.desc}</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl mb-2" style={{ backgroundColor: `${c.color}10` }}>
                    <Info className="w-3.5 h-3.5 shrink-0" style={{ color: c.color }} />
                    <p className="text-[11px] font-semibold" style={{ color: c.color }}>{c.key}</p>
                  </div>
                  <a href={c.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#8E8E93] hover:text-[#007AFF]">
                    <ExternalLink className="w-3 h-3" /> Официальный источник
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── ПРОВЕРИТЬ ── */}
        {tab === "checker" && (
          <div className="space-y-4">
            <ScamChecker />

            {/* Check links */}
            <Card className="border-[#E5E5EA]">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-[#303030] mb-3">🔍 Проверить организацию</p>
                <div className="space-y-2">
                  {[
                    { name: "Реестр ЦБ — банки, МФО, брокеры", desc: "Проверьте лицензию любой финансовой организации", url: "https://cbr.ru/registries/" },
                    { name: "Список финпирамид и мошенников ЦБ", desc: "Чёрный список нелегальных организаций от ЦБ РФ", url: "https://cbr.ru/registries/wmfo_bki/" },
                    { name: "ФССП — проверить коллектора", desc: "Легальность компании по взысканию долгов", url: "https://fssp.gov.ru/iss/ip" },
                    { name: "Антифишинг — сообщить о сайте", desc: "Пожаловаться на фишинговый сайт в Роскомнадзор", url: "https://eservice.gov.ru/" },
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

            <Link href="/ai-consultant?context=fraud-check" className="flex items-center justify-between p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] hover:border-[#FF3B30]/30 transition-colors">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#3629B7]" />
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Более детальная консультация</p>
                  <p className="text-xs text-[#8E8E93]">Опишите ситуацию Кэшику</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
