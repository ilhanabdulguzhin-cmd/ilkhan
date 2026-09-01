// Monetrix — Curated Russian Bank Products Database
// Data reflects real products as of early 2025.
// Source: public info from bank sites, banki.ru, sravni.ru

import type { UserProfile, UserTransaction } from "@/lib/user-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductType = "card" | "deposit" | "loan" | "mortgage" | "invest";
export type ProductTag =
  | "best-cashback" | "no-fee" | "family" | "entrepreneur"
  | "high-rate" | "low-rate" | "popular" | "digital" | "premium" | "beginner"
  | "miles" | "bonus-program" | "cashback-rub" | "loyalty" | "compliance-safe";

export interface CashbackCategory {
  name: string;
  rate: number;
  maxMonthly?: number;
  emoji: string;
}

export interface BonusProgram {
  name: string;
  description: string;
  partnerCount?: number;
}

export interface BankProduct {
  id: string;
  bank: string;
  bankLogoSvg: string; // inline SVG path data OR emoji fallback
  bankColor: string;         // brand color
  bankColorSecondary?: string;
  name: string;
  type: ProductType;
  tags: ProductTag[];
  headline: string;
  // Card
  annualFee?: number;
  feeWaiverCondition?: string;
  cashbackBase?: number;
  cashbackCategories?: CashbackCategory[];
  cashbackMaxMonthly?: number;
  bonusProgram?: BonusProgram;
  welcomeBonus?: string;
  // Deposit
  depositRateMin?: number;
  depositRateMax?: number;
  depositTermMonths?: number[];
  depositMinAmount?: number;
  depositCapitalization?: boolean;
  // Loan/mortgage
  loanRateMin?: number;
  loanRateMax?: number;
  loanAmountMax?: number;
  loanTermMonths?: number;
  mortgageType?: "standard" | "family" | "it" | "rural" | "new-building";
  // Invest
  investMinAmount?: number;
  investYieldMin?: number;
  investYieldMax?: number;
  // Common
  pros: string[];
  cons: string[];
  applyUrl: string;
  updatedAt: string;
  segmentScore: Record<string, number>;
  riskLevel?: "low" | "medium" | "high";
  complianceNote?: string;
}

// ─── Bank Logo SVGs (inline data for reliability) ─────────────────────────────
// Each bank uses its real brand colors as SVG background with letter mark

export const BANK_LOGOS: Record<string, { svg: string; color: string; textColor: string }> = {
  tbank: {
    svg: "T",
    color: "#FFDD2D",
    textColor: "#000000",
  },
  sber: {
    svg: "СБ",
    color: "#21A038",
    textColor: "#FFFFFF",
  },
  alfa: {
    svg: "А",
    color: "#EF3124",
    textColor: "#FFFFFF",
  },
  vtb: {
    svg: "ВТБ",
    color: "#003087",
    textColor: "#FFFFFF",
  },
  raiffeisen: {
    svg: "Р",
    color: "#FFE600",
    textColor: "#000000",
  },
  ozon: {
    svg: "O",
    color: "#005BFF",
    textColor: "#FFFFFF",
  },
  gazprom: {
    svg: "ГПБ",
    color: "#003E8A",
    textColor: "#FFFFFF",
  },
  rosselhoz: {
    svg: "РСХ",
    color: "#2E7D32",
    textColor: "#FFFFFF",
  },
  mkb: {
    svg: "МКБ",
    color: "#E4003A",
    textColor: "#FFFFFF",
  },
  sovkombank: {
    svg: "СКБ",
    color: "#C8102E",
    textColor: "#FFFFFF",
  },
  psb: {
    svg: "ПСБ",
    color: "#005CA9",
    textColor: "#FFFFFF",
  },
  dom_rf: {
    svg: "ДОМ",
    color: "#1A1F71",
    textColor: "#FFFFFF",
  },
  avangard: {
    svg: "АВГ",
    color: "#FF6600",
    textColor: "#FFFFFF",
  },
  pochta: {
    svg: "ПБ",
    color: "#0050A0",
    textColor: "#FFFFFF",
  },
  akbars: {
    svg: "АКБ",
    color: "#00843D",
    textColor: "#FFFFFF",
  },
};

// ─── CARDS ────────────────────────────────────────────────────────────────────

export const CARDS: BankProduct[] = [
  {
    id: "tinkoff-black",
    bank: "Т-Банк",
    bankLogoSvg: "T",
    bankColor: "#FFDD2D",
    bankColorSecondary: "#000000",
    name: "Т-Блэк",
    type: "card",
    tags: ["best-cashback", "popular", "cashback-rub"],
    headline: "До 15% кешбэка рублями в 3 выбранных категориях",
    annualFee: 0,
    feeWaiverCondition: "Бесплатно при остатке от 50 000 ₽ или тратах от 3 000 ₽/мес",
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Кафе и рестораны", rate: 5, emoji: "☕" },
      { name: "АЗС и автосервис", rate: 5, emoji: "⛽" },
      { name: "Аптеки", rate: 5, emoji: "💊" },
      { name: "Супермаркеты", rate: 5, emoji: "🛒" },
      { name: "Путешествия", rate: 5, emoji: "✈️" },
    ],
    cashbackMaxMonthly: 3000,
    welcomeBonus: "1 000 ₽ бонусами при первой покупке",
    pros: ["Кешбэк живыми рублями", "Бесплатно при условии", "Онлайн открытие за 5 мин", "3 категории на выбор каждый месяц"],
    cons: ["Лимит кешбэка 3 000 ₽/мес", "Комиссия 99 ₽/мес без условий"],
    applyUrl: "https://www.tbank.ru/cards/debit-cards/tinkoff-black/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.3, family: 1.0, entrepreneur: 0.9 },
    riskLevel: "low",
  },
  {
    id: "tinkoff-platinum",
    bank: "Т-Банк",
    bankLogoSvg: "T",
    bankColor: "#FFDD2D",
    bankColorSecondary: "#000000",
    name: "Т-Платинум",
    type: "card",
    tags: ["best-cashback", "cashback-rub", "popular"],
    headline: "Кредитная карта: 120 дней без %, до 30% кешбэка от партнёров",
    annualFee: 590,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Рестораны партнёры", rate: 30, emoji: "🍽️" },
      { name: "АЗС партнёры", rate: 10, emoji: "⛽" },
      { name: "Онлайн-покупки", rate: 5, emoji: "🛍️" },
    ],
    bonusProgram: { name: "Т-Прайм", description: "Скидки у 10 000+ партнёров — рестораны, магазины, сервисы", partnerCount: 10000 },
    welcomeBonus: "2 000 ₽ кешбэка при первой покупке от 3 000 ₽",
    pros: ["120 дней без процентов", "До 30% у партнёров", "Большая сеть партнёров"],
    cons: ["Это кредитная карта", "590 ₽/год", "Высокая ставка после льготного периода"],
    applyUrl: "https://www.tbank.ru/cards/credit-cards/tinkoff-platinum/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 0.9, entrepreneur: 1.0 },
    riskLevel: "medium",
    complianceNote: "Кредитная карта — контролируйте расходы в льготном периоде",
  },
  {
    id: "sber-sberkarta",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "СберКарта",
    type: "card",
    tags: ["no-fee", "popular", "loyalty"],
    headline: "Бесплатно навсегда + бонусы СберСпасибо",
    annualFee: 0,
    cashbackBase: 0.5,
    cashbackCategories: [
      { name: "Продукты в СберМаркете", rate: 5, emoji: "🛒" },
      { name: "Рестораны партнёры", rate: 3, emoji: "🍽️" },
    ],
    bonusProgram: { name: "СберСпасибо", description: "Бонусы у 200 000+ партнёров — Сбермаркет, СберАвто, Самокат и тысячи других", partnerCount: 200000 },
    pros: ["Полностью бесплатная навсегда", "200 000+ партнёров программы СберСпасибо", "Работает везде в мире"],
    cons: ["Бонусы, не рубли", "Базовый кешбэк 0.5% скромный"],
    applyUrl: "https://www.sberbank.ru/ru/person/bank_cards/debit/sberkarta",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.2, entrepreneur: 0.8 },
    riskLevel: "low",
  },
  {
    id: "sber-gold",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "Золотая СберКарта",
    type: "card",
    tags: ["loyalty", "popular"],
    headline: "Повышенные бонусы СберСпасибо + консьерж-сервис",
    annualFee: 3000,
    cashbackBase: 1.5,
    cashbackCategories: [
      { name: "Рестораны", rate: 5, emoji: "🍽️" },
      { name: "Путешествия", rate: 5, emoji: "✈️" },
      { name: "АЗС", rate: 3, emoji: "⛽" },
    ],
    bonusProgram: { name: "СберСпасибо Привилегированный", description: "Увеличенные бонусы + доступ в бизнес-залы аэропортов" },
    pros: ["Бизнес-залы аэропортов", "Страховка в путешествиях", "Повышенные бонусы"],
    cons: ["3 000 ₽/год", "Бонусы не живые деньги"],
    applyUrl: "https://www.sberbank.ru/ru/person/bank_cards/pack/gold",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.9, family: 1.1, entrepreneur: 1.0 },
    riskLevel: "low",
  },
  {
    id: "alfa-100days",
    bank: "Альфа-Банк",
    bankLogoSvg: "А",
    bankColor: "#EF3124",
    name: "Альфа 100 дней",
    type: "card",
    tags: ["popular", "no-fee"],
    headline: "100 дней без процентов на всё",
    annualFee: 0,
    feeWaiverCondition: "Бесплатно при тратах от 10 000 ₽/мес",
    cashbackBase: 1.5,
    cashbackCategories: [
      { name: "Кафе", rate: 3, emoji: "☕" },
      { name: "Путешествия", rate: 5, emoji: "✈️" },
      { name: "Такси", rate: 3, emoji: "🚕" },
    ],
    welcomeBonus: "500 бонусных рублей после первой покупки",
    pros: ["100 дней без процентов", "Кешбэк на путешествия 5%", "Бесплатно при условии"],
    cons: ["Кредитная карта", "Нужны траты 10k+/мес для бесплатности"],
    applyUrl: "https://alfabank.ru/get-money/credit-cards/100-days/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 0.9, entrepreneur: 1.0 },
    riskLevel: "medium",
    complianceNote: "Кредитная карта — следите за льготным периодом",
  },
  {
    id: "alfa-cash-back",
    bank: "Альфа-Банк",
    bankLogoSvg: "А",
    bankColor: "#EF3124",
    name: "Альфа CashBack",
    type: "card",
    tags: ["best-cashback", "cashback-rub"],
    headline: "До 10% кешбэка за АЗС + 5% за кафе",
    annualFee: 1490,
    feeWaiverCondition: "Бесплатно при тратах от 70 000 ₽/мес",
    cashbackBase: 1,
    cashbackCategories: [
      { name: "АЗС", rate: 10, emoji: "⛽", maxMonthly: 2000 },
      { name: "Кафе и рестораны", rate: 5, emoji: "☕", maxMonthly: 2000 },
      { name: "Супермаркеты", rate: 1, emoji: "🛒" },
    ],
    cashbackMaxMonthly: 5000,
    pros: ["10% на АЗС — максимум на рынке", "5% на кафе", "Кешбэк живыми рублями"],
    cons: ["1 490 ₽/год", "Окупается при регулярной заправке"],
    applyUrl: "https://alfabank.ru/everyday/debit-cards/alfacard/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.0, entrepreneur: 1.2 },
    riskLevel: "low",
  },
  {
    id: "vtb-multikarta",
    bank: "ВТБ",
    bankLogoSvg: "ВТБ",
    bankColor: "#003087",
    name: "ВТБ Мультикарта",
    type: "card",
    tags: ["cashback-rub", "popular"],
    headline: "До 5% рублями на выбранную категорию",
    annualFee: 0,
    feeWaiverCondition: "Бесплатно при тратах от 5 000 ₽/мес",
    cashbackBase: 1.5,
    cashbackCategories: [
      { name: "Авто (АЗС)", rate: 5, emoji: "🚗" },
      { name: "Рестораны", rate: 5, emoji: "🍽️" },
      { name: "Путешествия", rate: 5, emoji: "✈️" },
      { name: "Супермаркеты", rate: 5, emoji: "🛒" },
    ],
    pros: ["Рубли, не баллы", "Одна повышенная категория на месяц", "Бесплатно при условии"],
    cons: ["Одна категория за раз", "Нужна активация в приложении"],
    applyUrl: "https://www.vtb.ru/personal/karty/debetovye/multikarta/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 1.0, entrepreneur: 1.0 },
    riskLevel: "low",
  },
  {
    id: "vtb-mir-supreme",
    bank: "ВТБ",
    bankLogoSvg: "ВТБ",
    bankColor: "#003087",
    name: "Мир Supreme",
    type: "card",
    tags: ["premium", "miles", "loyalty"],
    headline: "Привилегированная карта: мили + бизнес-залы + консьерж",
    annualFee: 15000,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Авиабилеты", rate: 10, emoji: "✈️" },
      { name: "Отели", rate: 5, emoji: "🏨" },
    ],
    bonusProgram: { name: "ВТБ Привилегия", description: "Мили, бизнес-залы, страховка, консьерж 24/7" },
    pros: ["Неограниченный доступ в бизнес-залы", "Страховка в путешествиях", "Консьерж 24/7", "Мили на авиабилеты"],
    cons: ["15 000 ₽/год", "Только для состоятельных клиентов"],
    applyUrl: "https://www.vtb.ru/personal/karty/kreditnye-karty/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.7, family: 1.0, entrepreneur: 1.3 },
    riskLevel: "low",
  },
  {
    id: "raiffeisen-allairlines",
    bank: "Райффайзен",
    bankLogoSvg: "Р",
    bankColor: "#FFE600",
    bankColorSecondary: "#000000",
    name: "Всё Включено",
    type: "card",
    tags: ["premium", "best-cashback", "cashback-rub"],
    headline: "3.9% кешбэка на всё без ограничений по категориям",
    annualFee: 3900,
    cashbackBase: 3.9,
    cashbackMaxMonthly: 15000,
    pros: ["Высокий кешбэк 3.9% на всё", "Без ограничений по категориям", "Лимит 15 000 ₽/мес"],
    cons: ["3 900 ₽/год", "Окупается при тратах от 8 400 ₽/мес"],
    applyUrl: "https://raiffeisen.ru/retail/cards/debit/all-at-once",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.9, family: 1.1, entrepreneur: 1.2 },
    riskLevel: "low",
  },
  {
    id: "ozon-card",
    bank: "Озон Банк",
    bankLogoSvg: "O",
    bankColor: "#005BFF",
    name: "Ozon Карта",
    type: "card",
    tags: ["digital", "no-fee", "beginner", "cashback-rub"],
    headline: "До 7% кешбэка на Ozon + 3% в супермаркетах",
    annualFee: 0,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Ozon", rate: 7, emoji: "📦" },
      { name: "Супермаркеты", rate: 3, emoji: "🛒" },
      { name: "Аптеки", rate: 3, emoji: "💊" },
    ],
    welcomeBonus: "500 бонусных рублей при первом заказе на Ozon",
    pros: ["Бесплатная навсегда", "7% на Ozon — лучшее на рынке", "Удобное приложение"],
    cons: ["Только онлайн-банк", "Ограниченная сеть банкоматов"],
    applyUrl: "https://finance.ozon.ru/bankovskie-karty",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 1.1, entrepreneur: 0.8 },
    riskLevel: "low",
  },
  {
    id: "mkb-cashback",
    bank: "МКБ",
    bankLogoSvg: "МКБ",
    bankColor: "#E4003A",
    name: "МКБ Кешбэк",
    type: "card",
    tags: ["cashback-rub", "no-fee"],
    headline: "До 5% кешбэка рублями на повседневные траты",
    annualFee: 0,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Кафе", rate: 5, emoji: "☕" },
      { name: "АЗС", rate: 5, emoji: "⛽" },
      { name: "Такси", rate: 5, emoji: "🚕" },
    ],
    pros: ["Бесплатная", "Рублёвый кешбэк", "Хорошие категории"],
    cons: ["Менее известный банк", "Ограниченная сеть банкоматов"],
    applyUrl: "https://mkb.ru/personal/cards",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 0.9, entrepreneur: 0.9 },
    riskLevel: "low",
  },
  {
    id: "sovkombank-halva",
    bank: "Совкомбанк",
    bankLogoSvg: "СКБ",
    bankColor: "#C8102E",
    name: "Халва",
    type: "card",
    tags: ["popular", "no-fee", "loyalty"],
    headline: "Рассрочка 0% у 250 000+ партнёров на 24 месяца",
    annualFee: 0,
    cashbackBase: 0.5,
    bonusProgram: { name: "Программа Халва", description: "Рассрочка 0% у 250 000 магазинов-партнёров", partnerCount: 250000 },
    welcomeBonus: "2 месяца рассрочки бесплатно при первой покупке",
    pros: ["250 000 магазинов-партнёров", "Рассрочка 0% до 24 мес", "Бесплатная карта", "Кешбэк до 6% у партнёров"],
    cons: ["Основная ценность только у партнёров", "Ставка вне партнёров"],
    applyUrl: "https://sovcombank.ru/cards/rassrochki/halva",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 1.3, entrepreneur: 0.8 },
    riskLevel: "low",
  },
  {
    id: "psb-bonus",
    bank: "ПСБ",
    bankLogoSvg: "ПСБ",
    bankColor: "#005CA9",
    name: "ПСБ Бонус",
    type: "card",
    tags: ["no-fee", "cashback-rub"],
    headline: "3% кешбэка на всё + доп. выгода для военных",
    annualFee: 0,
    cashbackBase: 3,
    pros: ["3% на всё без ограничений", "Бесплатная", "Гос. банк — надёжность"],
    cons: ["Нет повышенных категорий", "Ограниченный цифровой сервис"],
    applyUrl: "https://www.psbank.ru/personal/cards",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.0, entrepreneur: 0.7 },
    riskLevel: "low",
    complianceNote: "Промсвязьбанк — системно значимый банк, высокая надёжность",
  },
  {
    id: "mir-travel",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "Сбер Travel",
    type: "card",
    tags: ["miles", "travel", "cashback-rub"] as ProductTag[],
    headline: "До 10% кешбэка на путешествия через СберТревел",
    annualFee: 900,
    feeWaiverCondition: "Бесплатно при тратах от 30 000 ₽/мес",
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Авиабилеты СберТревел", rate: 10, emoji: "✈️" },
      { name: "Отели", rate: 5, emoji: "🏨" },
      { name: "ЖД-билеты", rate: 5, emoji: "🚂" },
    ],
    pros: ["10% на билеты в СберТревел", "Страховка путешественника", "Отменить бронь легко"],
    cons: ["900 ₽/год без условия", "Максимальный кешбэк только в СберТревел"],
    applyUrl: "https://www.sberbank.ru/ru/person/bank_cards/debit/sber-travel",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 0.9, entrepreneur: 1.1 },
    riskLevel: "low",
  },
];

// ─── DEPOSITS ─────────────────────────────────────────────────────────────────

export const DEPOSITS: BankProduct[] = [
  {
    id: "sber-luchshiy",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "Лучший %",
    type: "deposit",
    tags: ["popular", "high-rate"],
    headline: "До 14% годовых на 4 месяца (новые деньги)",
    depositRateMin: 11,
    depositRateMax: 14,
    depositTermMonths: [1, 3, 4, 6, 12],
    depositMinAmount: 1000,
    depositCapitalization: true,
    pros: ["Надёжность — госбанк", "Капитализация %", "Застрахован АСВ до 1.4 млн", "Открыть онлайн"],
    cons: ["Нет пополнения", "Нет досрочного снятия без потери %", "Только для новых денег"],
    applyUrl: "https://www.sberbank.ru/ru/person/contributions/deposits/vklad",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 1.2, entrepreneur: 1.0 },
    riskLevel: "low",
    complianceNote: "Застрахован в системе АСВ. Государственный банк.",
  },
  {
    id: "tinkoff-smart",
    bank: "Т-Банк",
    bankLogoSvg: "T",
    bankColor: "#FFDD2D",
    bankColorSecondary: "#000000",
    name: "Накопительный счёт",
    type: "deposit",
    tags: ["digital", "high-rate"],
    headline: "До 14% на накопительный счёт — деньги доступны в любой момент",
    depositRateMin: 11,
    depositRateMax: 14,
    depositTermMonths: [0],
    depositMinAmount: 1,
    depositCapitalization: true,
    pros: ["Онлайн без визита в банк", "Снятие и пополнение в любое время", "Начисление % ежемесячно"],
    cons: ["Ставка снижается вслед за ключевой ставкой ЦБ", "Новым клиентам — приветственная надбавка"],
    applyUrl: "https://www.tbank.ru/savings/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 1.0, entrepreneur: 1.1 },
    riskLevel: "low",
  },
  {
    id: "vtb-komfort",
    bank: "ВТБ",
    bankLogoSvg: "ВТБ",
    bankColor: "#003087",
    name: "Вклад Комфортный",
    type: "deposit",
    tags: ["popular"],
    headline: "До 15% + пополнение в любой момент (приветственная ставка 1–3 мес)",
    depositRateMin: 12,
    depositRateMax: 15,
    depositTermMonths: [1, 2, 3, 6, 12, 18],
    depositMinAmount: 1000,
    depositCapitalization: true,
    pros: ["Можно пополнять", "Гибкие сроки", "Застрахован АСВ", "Минимум от 1 000 ₽"],
    cons: ["Досрочное закрытие по минимальной ставке"],
    applyUrl: "https://www.vtb.ru/personal/vklady-i-scheta/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.1, entrepreneur: 0.9 },
    riskLevel: "low",
  },
  {
    id: "alfa-nakopitelny",
    bank: "Альфа-Банк",
    bankLogoSvg: "А",
    bankColor: "#EF3124",
    name: "Альфа-Счёт",
    type: "deposit",
    tags: ["no-fee", "popular", "digital"],
    headline: "До 18% в первый месяц, затем 13% — пополняй и снимай когда угодно",
    depositRateMin: 11,
    depositRateMax: 18,
    depositTermMonths: [0],
    depositMinAmount: 1,
    depositCapitalization: true,
    pros: ["Снятие и пополнение в любой момент", "Нет срока", "Начисление % ежемесячно", "От 1 ₽"],
    cons: ["Ставка ниже срочного вклада", "Может снизиться при изменении ставки ЦБ"],
    applyUrl: "https://alfabank.ru/make-money/savings-account/alfa/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 1.0, entrepreneur: 1.2 },
    riskLevel: "low",
  },
  {
    id: "raiffeisen-nakopitelny",
    bank: "Райффайзен",
    bankLogoSvg: "Р",
    bankColor: "#FFE600",
    bankColorSecondary: "#000000",
    name: "Накопительный счёт",
    type: "deposit",
    tags: ["high-rate", "digital"],
    headline: "До 15% на накопительный счёт — без срока и ограничений",
    depositRateMin: 12,
    depositRateMax: 15,
    depositTermMonths: [0],
    depositMinAmount: 1,
    depositCapitalization: true,
    pros: ["Без срока", "Онлайн управление", "Ежемесячные проценты"],
    cons: ["Ставка меняется вслед за ЦБ"],
    applyUrl: "https://www.raiffeisen.ru/retail/deposit_investing/savings_account/daily/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 1.0, entrepreneur: 1.1 },
    riskLevel: "low",
  },
  {
    id: "gazprombank-seasonal",
    bank: "Газпромбанк",
    bankLogoSvg: "ГПБ",
    bankColor: "#003E8A",
    name: "Сезонный",
    type: "deposit",
    tags: ["high-rate"],
    headline: "До 15,5% на короткие сроки — одна из лучших ставок рынка (июль 2026)",
    depositRateMin: 14,
    depositRateMax: 16,
    depositTermMonths: [3, 6],
    depositMinAmount: 10000,
    depositCapitalization: true,
    pros: ["Одна из высших ставок на рынке", "Надёжность госбанка", "Застрахован АСВ"],
    cons: ["Ограниченные сроки", "Нет онлайн-управления в полной мере"],
    applyUrl: "https://www.gazprombank.ru/personal/increase/deposits/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.1, entrepreneur: 0.9 },
    riskLevel: "low",
  },
  {
    id: "psb-strahovoy",
    bank: "ПСБ",
    bankLogoSvg: "ПСБ",
    bankColor: "#005CA9",
    name: "Страховой Вклад",
    type: "deposit",
    tags: ["compliance-safe", "high-rate"],
    headline: "До 16% + страхование жизни в подарок",
    depositRateMin: 14,
    depositRateMax: 16,
    depositTermMonths: [6, 12],
    depositMinAmount: 50000,
    depositCapitalization: false,
    pros: ["Страховка жизни включена", "Государственный банк", "Высокая ставка"],
    cons: ["Минимум 50 000 ₽", "Нет пополнения"],
    applyUrl: "https://www.psbank.ru/personal/saving",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.9, family: 1.2, entrepreneur: 0.8 },
    riskLevel: "low",
    complianceNote: "ПСБ — системно значимый банк с господдержкой",
  },
];

// ─── MORTGAGES ────────────────────────────────────────────────────────────────

export const MORTGAGES: BankProduct[] = [
  {
    id: "sber-family-mortgage",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "Семейная ипотека",
    type: "mortgage",
    tags: ["family", "low-rate", "popular"],
    headline: "От 6% для семей с детьми до 7 лет",
    mortgageType: "family",
    loanRateMin: 5.7,
    loanRateMax: 6,
    loanAmountMax: 12000000,
    pros: ["Льготная ставка 6%", "До 12 млн ₽ в Мск/СПб, 6 млн в регионах", "Новостройки и вторичка"],
    cons: ["Только семьи с детьми до 7 лет", "Первый взнос от 20.1%"],
    applyUrl: "https://www.sberbank.ru/ru/person/credits/home/family",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.1, family: 3.0, entrepreneur: 0.3 },
    riskLevel: "low",
  },
  {
    id: "vtb-it-mortgage",
    bank: "ВТБ",
    bankLogoSvg: "ВТБ",
    bankColor: "#003087",
    name: "IT-ипотека",
    type: "mortgage",
    tags: ["digital", "low-rate"],
    headline: "От 5% для IT-специалистов",
    mortgageType: "it",
    loanRateMin: 5,
    loanRateMax: 6,
    loanAmountMax: 18000000,
    pros: ["Одна из самых низких ставок", "До 18 млн ₽ в Москве/СПб", "Ускоренное одобрение"],
    cons: ["Только аккредитованные IT-компании", "Требуется подтверждение статуса"],
    applyUrl: "https://www.vtb.ru/personal/ipoteka/it/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.5, family: 1.2, entrepreneur: 0.8 },
    riskLevel: "low",
  },
  {
    id: "alfa-new-building",
    bank: "Альфа-Банк",
    bankLogoSvg: "А",
    bankColor: "#EF3124",
    name: "Новостройка",
    type: "mortgage",
    tags: ["popular"],
    headline: "От 10.99% — одобрение за 1 день",
    mortgageType: "new-building",
    loanRateMin: 10.99,
    loanRateMax: 14,
    loanAmountMax: 50000000,
    pros: ["Одобрение за 1 день", "Крупные суммы", "Онлайн оформление"],
    cons: ["Рыночная ставка", "Требуется первый взнос"],
    applyUrl: "https://alfabank.ru/get-money/mortgage/novostrojki/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.0, entrepreneur: 1.0 },
    riskLevel: "medium",
  },
  {
    id: "rosselhoz-rural",
    bank: "Россельхозбанк",
    bankLogoSvg: "РСХ",
    bankColor: "#2E7D32",
    name: "Сельская ипотека",
    type: "mortgage",
    tags: ["low-rate"],
    headline: "От 3% на жильё в сельской местности",
    mortgageType: "rural",
    loanRateMin: 3,
    loanRateMax: 3,
    loanAmountMax: 6000000,
    pros: ["Самая низкая ставка в России", "Дом, участок, строительство", "Без комиссий"],
    cons: ["Только сельская местность", "До 6 млн ₽", "Ограниченный бюджет программы"],
    applyUrl: "https://www.rshb.ru/natural/mortgage-nvgr",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.8, family: 1.5, entrepreneur: 0.7 },
    riskLevel: "low",
  },
  {
    id: "dom-rf-standard",
    bank: "ДОМ.РФ",
    bankLogoSvg: "ДОМ",
    bankColor: "#1A1F71",
    name: "Стандартная ипотека",
    type: "mortgage",
    tags: ["popular", "compliance-safe"],
    headline: "От 11% — государственный институт развития",
    mortgageType: "standard",
    loanRateMin: 11,
    loanRateMax: 14.5,
    loanAmountMax: 100000000,
    pros: ["Гос. банк — надёжность", "Прозрачные условия", "Большие суммы"],
    cons: ["Рыночная ставка", "Строгие требования к заёмщику"],
    applyUrl: "https://domrfbank.ru/mortgage/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.0, entrepreneur: 0.9 },
    riskLevel: "low",
    complianceNote: "ДОМ.РФ — государственный институт развития жилищной сферы",
  },
];

// ─── BUSINESS PRODUCTS ────────────────────────────────────────────────────────

export const BUSINESS_PRODUCTS: BankProduct[] = [
  {
    id: "tinkoff-biz",
    bank: "Т-Банк Бизнес",
    bankLogoSvg: "T",
    bankColor: "#FFDD2D",
    bankColorSecondary: "#000000",
    name: "РКО для ИП",
    type: "card",
    tags: ["entrepreneur", "digital", "no-fee"],
    headline: "Бесплатное РКО + онлайн-бухгалтерия + кешбэк",
    annualFee: 0,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Канцелярия и офис", rate: 5, emoji: "📎" },
      { name: "Реклама", rate: 3, emoji: "📢" },
      { name: "Связь и интернет", rate: 3, emoji: "📱" },
    ],
    pros: ["Бесплатный счёт для ИП", "Встроенная бухгалтерия", "Кешбэк на бизнес-расходы", "Эквайринг 1.5%"],
    cons: ["Нет живых касс в офисах", "Только онлайн"],
    applyUrl: "https://www.tbank.ru/business/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.2, family: 0.3, entrepreneur: 3.0 },
    riskLevel: "low",
  },
  {
    id: "sber-biz",
    bank: "Сбербанк Бизнес",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "СберБизнес Старт",
    type: "card",
    tags: ["entrepreneur", "popular"],
    headline: "РКО от 0 ₽ + эквайринг + зарплатный проект",
    annualFee: 0,
    pros: ["Огромная сеть банкоматов", "Эквайринг сразу", "Зарплатный проект", "Господдержка МСБ"],
    cons: ["Тарифы выше онлайн-банков", "Более медленный онбординг"],
    applyUrl: "https://www.sberbank.ru/ru/s_m_business/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.1, family: 0.2, entrepreneur: 2.5 },
    riskLevel: "low",
  },
  {
    id: "alfa-biz-deposit",
    bank: "Альфа-Банк",
    bankLogoSvg: "А",
    bankColor: "#EF3124",
    name: "Бизнес-вклад",
    type: "deposit",
    tags: ["entrepreneur", "high-rate"],
    headline: "До 17% для ИП и юрлиц",
    depositRateMin: 14,
    depositRateMax: 17,
    depositTermMonths: [1, 3, 6],
    depositMinAmount: 100000,
    pros: ["Высокая ставка", "Для ИП и ООО", "Онлайн оформление"],
    cons: ["Минимум 100 000 ₽", "Только юрлицо или ИП"],
    applyUrl: "https://alfabank.ru/sme/deposits/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.1, family: 0.2, entrepreneur: 2.5 },
    riskLevel: "low",
  },
  {
    id: "vtb-biz-card",
    bank: "ВТБ Бизнес",
    bankLogoSvg: "ВТБ",
    bankColor: "#003087",
    name: "ВТБ Бизнес Карта",
    type: "card",
    tags: ["entrepreneur", "cashback-rub"],
    headline: "2% кешбэка на все бизнес-расходы + бесплатно",
    annualFee: 0,
    cashbackBase: 2,
    cashbackCategories: [
      { name: "Топливо", rate: 4, emoji: "⛽" },
      { name: "Командировки", rate: 3, emoji: "✈️" },
    ],
    pros: ["Бесплатная для бизнеса", "Кешбэк на расходы компании", "Интеграция с бухгалтерией 1С"],
    cons: ["Только для юрлиц и ИП"],
    applyUrl: "https://www.vtb.ru/malyj-biznes/karty/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 0.1, family: 0.2, entrepreneur: 2.8 },
    riskLevel: "low",
  },
];

// ─── INVEST PRODUCTS ─────────────────────────────────────────────────────────

export const INVEST_PRODUCTS: BankProduct[] = [
  {
    id: "tinkoff-iis",
    bank: "Т-Банк",
    bankLogoSvg: "T",
    bankColor: "#FFDD2D",
    bankColorSecondary: "#000000",
    name: "ИИС Тип А",
    type: "invest",
    tags: ["beginner", "popular"],
    headline: "Верните 13% НДФЛ — до 52 000 ₽ в год гарантированно",
    investMinAmount: 1000,
    investYieldMin: 13,
    investYieldMax: 25,
    pros: ["+13% возврат НДФЛ с каждого взноса", "Можно вложить в ОФЗ и получить ещё 14%+", "Онлайн открытие за 5 мин"],
    cons: ["Деньги нельзя снимать 3 года", "Нужен официальный доход и НДФЛ"],
    applyUrl: "https://www.tbank.ru/invest/iis/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.3, family: 1.0, entrepreneur: 1.1 },
    riskLevel: "low",
  },
  {
    id: "sber-ofz",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "ОФЗ для физлиц",
    type: "invest",
    tags: ["beginner", "popular", "compliance-safe"],
    headline: "Гособлигации с доходностью 13–16% — гарантия государства",
    investMinAmount: 10000,
    investYieldMin: 13,
    investYieldMax: 16,
    pros: ["Гарантия государства", "Фиксированный доход", "Ликвидность — продать можно в любой день"],
    cons: ["Доходность ниже рисковых активов", "Зависит от ключевой ставки ЦБ"],
    applyUrl: "https://www.sberbank.ru/ru/person/investments",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.2, entrepreneur: 0.9 },
    riskLevel: "low",
    complianceNote: "ОФЗ — государственные облигации РФ, максимальная надёжность",
  },
  {
    id: "vtb-fond-likv",
    bank: "ВТБ",
    bankLogoSvg: "ВТБ",
    bankColor: "#003087",
    name: "БПИФ Ликвидность",
    type: "invest",
    tags: ["beginner", "digital"],
    headline: "Вложите свободные рубли под ставку ЦБ — аналог вклада с ликвидностью",
    investMinAmount: 1,
    investYieldMin: 14,
    investYieldMax: 17,
    pros: ["Вход от 1 ₽", "Ежедневная ликвидность — продать в любой день", "Замена вкладу без срока"],
    cons: ["Не гарантированная доходность", "Небольшая комиссия фонда"],
    applyUrl: "https://www.vtb.ru/personal/investicii/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 1.0, entrepreneur: 1.3 },
    riskLevel: "low",
  },
  {
    id: "alfa-iis3",
    bank: "Альфа-Банк",
    bankLogoSvg: "А",
    bankColor: "#EF3124",
    name: "ИИС-3 Новый",
    type: "invest",
    tags: ["beginner", "popular"],
    headline: "Новый тип ИИС — без налогов на прибыль через 5 лет",
    investMinAmount: 1000,
    investYieldMin: 14,
    investYieldMax: 22,
    pros: ["Нет налога на прибыль через 5 лет", "Можно совмещать с ИИС-А", "Снятие в экстренных случаях"],
    cons: ["Минимальный срок 5 лет", "Новый инструмент — меньше практики"],
    applyUrl: "https://alfabank.ru/make-money/investments/iis-broker/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.1, family: 0.9, entrepreneur: 1.2 },
    riskLevel: "medium",
  },
];

// ─── LOYALTY & DISCOUNT PROGRAMS ─────────────────────────────────────────────

export const LOYALTY_PRODUCTS: BankProduct[] = [
  {
    id: "sber-spasibo-premium",
    bank: "Сбербанк",
    bankLogoSvg: "СБ",
    bankColor: "#21A038",
    name: "СберПрайм+",
    type: "card",
    tags: ["loyalty", "family", "popular"],
    headline: "Подписка: скидки везде + кешбэк 10% в экосистеме Сбера",
    annualFee: 3499,
    cashbackBase: 2,
    cashbackCategories: [
      { name: "СберМаркет", rate: 10, emoji: "🛒" },
      { name: "Самокат", rate: 10, emoji: "🛵" },
      { name: "СберЗдоровье", rate: 10, emoji: "💊" },
      { name: "Okko", rate: 10, emoji: "🎬" },
    ],
    bonusProgram: { name: "СберПрайм+", description: "Подписка даёт скидки на Самокат, СберМаркет, Okko, Звук, СберЗдоровье и другие сервисы экосистемы" },
    pros: ["10% скидка в сервисах Сбера", "Бесплатная доставка Самокат", "Okko и Звук включены"],
    cons: ["Выгодно только активным пользователям экосистемы Сбера", "3 499 ₽/год"],
    applyUrl: "https://www.sberbank.com/sberprime/plus",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.0, family: 1.5, entrepreneur: 0.7 },
    riskLevel: "low",
  },
  {
    id: "yandex-bank-card",
    bank: "Яндекс Банк",
    bankLogoSvg: "Я",
    bankColor: "#FC3F1D",
    name: "Яндекс Карта",
    type: "card",
    tags: ["digital", "loyalty", "cashback-rub", "no-fee"],
    headline: "До 10% кешбэка в сервисах Яндекс + бесплатно",
    annualFee: 0,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Яндекс Маркет", rate: 10, emoji: "🛒" },
      { name: "Яндекс Такси", rate: 5, emoji: "🚕" },
      { name: "Яндекс Еда", rate: 5, emoji: "🍔" },
      { name: "Яндекс Путешествия", rate: 5, emoji: "✈️" },
    ],
    bonusProgram: { name: "Яндекс Плюс", description: "Кешбэк баллами Яндекс Плюс — тратить на всех сервисах Яндекса" },
    welcomeBonus: "90 дней подписки Яндекс Плюс при оформлении",
    pros: ["Бесплатная", "10% на Яндекс Маркет", "Кешбэк Плюсом", "90 дней подписки в подарок"],
    cons: ["Кешбэк баллами, не рублями", "Только в сервисах Яндекса"],
    applyUrl: "https://bank.yandex.ru/cards/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.3, family: 1.2, entrepreneur: 1.0 },
    riskLevel: "low",
  },
  {
    id: "wildberries-card",
    bank: "ВБ Банк",
    bankLogoSvg: "WB",
    bankColor: "#CB11AB",
    name: "Карта WB",
    type: "card",
    tags: ["digital", "loyalty", "no-fee", "cashback-rub"],
    headline: "До 5% кешбэка на Wildberries + скидки каждый день",
    annualFee: 0,
    cashbackBase: 1,
    cashbackCategories: [
      { name: "Wildberries", rate: 5, emoji: "📦" },
      { name: "Категории дня", rate: 3, emoji: "🎯" },
    ],
    pros: ["Бесплатная", "5% на WB", "Регулярные акции и скидки", "Моментальный выпуск"],
    cons: ["Только для покупок на WB максимально выгодна", "Новый банк"],
    applyUrl: "https://bank.wildberries.ru/",
    updatedAt: "2026-07-01",
    segmentScore: { solo: 1.2, family: 1.3, entrepreneur: 0.8 },
    riskLevel: "low",
  },
];

// ─── All products ─────────────────────────────────────────────────────────────

export const ALL_PRODUCTS: BankProduct[] = [
  ...CARDS,
  ...DEPOSITS,
  ...MORTGAGES,
  ...BUSINESS_PRODUCTS,
  ...INVEST_PRODUCTS,
  ...LOYALTY_PRODUCTS,
];

// ─── Personalization engine ───────────────────────────────────────────────────

export interface ProductMatch {
  product: BankProduct;
  score: number;
  reasons: string[];
  matchedCategories?: string[];
}

export function getPersonalizedProducts(
  profile: UserProfile,
  transactions: UserTransaction[],
  limit = 12
): ProductMatch[] {
  const segment = profile.segment || "solo";
  const monthlyIncome = profile.monthlyIncome || 0;
  const hasChildren = profile.hasChildren;

  const catTotals: Record<string, number> = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(t.amount);
  });
  const topCats = Object.entries(catTotals).sort(([, a], [, b]) => b - a).map(([k]) => k);
  const totalExpenses = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const numMonths = Math.max(new Set(transactions.map((t) => t.date.substring(0, 7))).size, 1);
  const monthlyExpenses = totalExpenses / numMonths;

  // Detect if user uses specific ecosystems
  const usesOzon = transactions.some((t) => /ozon|озон/i.test(t.description + t.merchant));
  const usesWB = transactions.some((t) => /wildberries|вайлдберрис/i.test(t.description + t.merchant));
  const usesYandex = transactions.some((t) => /яндекс|yandex/i.test(t.description + t.merchant));
  const usesSber = transactions.some((t) => /сбер|sber|самокат/i.test(t.description + t.merchant));
  const highTravel = catTotals["Путешествия"] ? (catTotals["Путешествия"] / numMonths) > 5000 : false;
  const highAuto = catTotals["Авто"] ? (catTotals["Авто"] / numMonths) > 3000 : false;
  const hasSavings = monthlyIncome > monthlyExpenses * 1.15;

  const results: ProductMatch[] = [];

  for (const product of ALL_PRODUCTS) {
    let score = 50;
    const reasons: string[] = [];
    const matchedCategories: string[] = [];

    const segBoost = product.segmentScore[segment] || 1.0;
    score *= segBoost;

    if (product.tags.includes("family") && (segment === "family" || hasChildren)) {
      score += 30;
      reasons.push("Специально для семей с детьми");
    }
    if (product.tags.includes("entrepreneur") && segment !== "entrepreneur") score -= 30;
    if (product.tags.includes("entrepreneur") && segment === "entrepreneur") {
      score += 40;
      reasons.push("Оптимален для ИП и предпринимателей");
    }

    // Ecosystem matching
    if (product.id === "ozon-card" && usesOzon) { score += 40; reasons.push("Вы покупаете на Ozon — максимальный кешбэк здесь"); }
    if (product.id === "wildberries-card" && usesWB) { score += 40; reasons.push("Вы покупаете на Wildberries — 5% кешбэка"); }
    if (product.id === "yandex-bank-card" && usesYandex) { score += 40; reasons.push("Вы пользуетесь сервисами Яндекс — кешбэк Плюсом"); }
    if (product.id === "sber-spasibo-premium" && usesSber) { score += 30; reasons.push("Вы в экосистеме Сбера — скидки везде"); }

    // Cashback category match
    if (product.cashbackCategories && topCats.length > 0) {
      for (const cbCat of product.cashbackCategories) {
        const catKey = cbCat.name.toLowerCase();
        const userMatch = topCats.find((c) => {
          const cl = c.toLowerCase();
          return cl.includes(catKey.split(" ")[0]) || catKey.includes(cl.split(" ")[0]);
        });
        if (userMatch) {
          score += cbCat.rate * 6;
          matchedCategories.push(cbCat.name);
          if (!reasons.some(r => r.includes(cbCat.name))) {
            reasons.push(`${cbCat.rate}% кешбэка на «${cbCat.name}» — вашу частую трату`);
          }
        }
      }
    }

    // Travel boost
    if (highTravel && (product.tags.includes("miles") || product.id.includes("travel"))) {
      score += 25;
      reasons.push("Вы много тратите на путешествия — мили выгодны");
    }

    // Auto boost
    if (highAuto && product.cashbackCategories?.some(c => /авто|азс/i.test(c.name))) {
      score += 20;
      reasons.push("Повышенный кешбэк на АЗС для ваших автотрат");
    }

    // Deposit relevance
    if (product.type === "deposit") {
      if (hasSavings) { score += 20; reasons.push("Есть свободные деньги — вклад принесёт доход"); }
      if (monthlyIncome > 80000) score += 10;
      if (product.depositMinAmount && monthlyIncome * 3 >= product.depositMinAmount) score += 10;
    }

    // Mortgage
    if (product.type === "mortgage") {
      if (product.mortgageType === "family" && (segment === "family" || hasChildren)) {
        score += 60; reasons.push("Семейная ипотека — созданa для вашей ситуации");
      } else if (product.mortgageType !== "family") score += 5;
      else score -= 40;
    }

    // Invest
    if (product.type === "invest") {
      if (monthlyIncome > 60000) { score += 15; reasons.push("Доход позволяет откладывать в инвестиции"); }
      if (product.id === "tinkoff-iis" && monthlyIncome > 0) {
        const possible = Math.min(Math.round(monthlyIncome * 12 * 0.13), 52000);
        reasons.push(`Возможный возврат НДФЛ через ИИС: до ${possible.toLocaleString("ru-RU")} ₽`);
      }
    }

    if (product.tags.includes("no-fee")) { score += 8; }
    if (product.tags.includes("popular")) score += 5;

    if (reasons.length === 0) {
      if (product.type === "card") reasons.push("Хорошая карта с кешбэком для повседневных трат");
      else if (product.type === "deposit") reasons.push(`Ставка до ${product.depositRateMax}% годовых`);
      else if (product.type === "mortgage") reasons.push("Выгодная ипотечная программа");
      else if (product.type === "invest") reasons.push("Инструмент для роста накоплений");
      else reasons.push("Подходит вашему профилю");
    }

    results.push({ product, score, reasons, matchedCategories });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ─── Risk Compliance Scoring ──────────────────────────────────────────────────

export interface RiskFactor {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  points: number; // negative = risk, positive = safe
  recommendation: string;
}

export interface ComplianceReport {
  score: number; // 0–100
  level: "safe" | "attention" | "risk";
  factors: RiskFactor[];
  summary: string;
  actions: string[];
}

export function computeRiskScore(
  profile: UserProfile,
  transactions: UserTransaction[]
): ComplianceReport {
  const factors: RiskFactor[] = [];
  let score = 100;

  if (transactions.length === 0) {
    return {
      score: 75,
      level: "attention",
      factors: [],
      summary: "Недостаточно данных для полной оценки. Загрузите выписку для точного анализа.",
      actions: ["Загрузите банковскую выписку для анализа", "Проверьте наличие документов по доходам"],
    };
  }

  const expenses = transactions.filter(t => t.amount < 0);
  const incomes = transactions.filter(t => t.amount > 0);
  const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort();
  const numMonths = Math.max(months.length, 1);

  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
  const monthlyIncome = totalIncome / numMonths;
  const monthlyExpenses = totalExpenses / numMonths;

  // 1. Cash withdrawals
  const cashTxs = expenses.filter(t => /снятие|наличн|банкомат|atm/i.test(t.description + t.merchant));
  const cashTotal = Math.abs(cashTxs.reduce((s, t) => s + t.amount, 0)) / numMonths;
  if (cashTotal > monthlyIncome * 0.5 && monthlyIncome > 0) {
    score -= 20;
    factors.push({
      id: "high_cash",
      title: "Высокая доля наличных",
      description: `Снятие наличных составляет более 50% дохода (${Math.round(cashTotal).toLocaleString("ru-RU")} ₽/мес). Это может привлечь внимание банка по 115-ФЗ.`,
      severity: "high",
      points: -20,
      recommendation: "Старайтесь платить картой — это безопаснее и удобнее для банка.",
    });
  } else if (cashTotal > monthlyIncome * 0.3) {
    score -= 10;
    factors.push({
      id: "medium_cash",
      title: "Умеренная доля наличных",
      description: `Снятие наличных 30–50% от дохода. Допустимо, но лучше снизить.`,
      severity: "medium",
      points: -10,
      recommendation: "Переходите на безналичные расчёты — меньше риска блокировки.",
    });
  } else {
    score += 5;
    factors.push({
      id: "low_cash",
      title: "Низкое использование наличных",
      description: "Вы в основном платите картой — это хороший сигнал для банка.",
      severity: "low",
      points: 5,
      recommendation: "Продолжайте в том же духе.",
    });
  }

  // 2. Irregular large income
  const incomeAmounts = incomes.map(t => t.amount);
  const avgIncome = totalIncome / Math.max(incomes.length, 1);
  const largeIncomes = incomes.filter(t => t.amount > avgIncome * 5);
  if (largeIncomes.length > 0 && !profile.segment?.includes("entrepreneur")) {
    score -= 15;
    factors.push({
      id: "large_income",
      title: "Нерегулярные крупные поступления",
      description: `${largeIncomes.length} крупных поступления значительно превышают средний доход. Банк может запросить документы.`,
      severity: "medium",
      points: -15,
      recommendation: "Сохраните документы, подтверждающие источник: договор, справка, акт.",
    });
  }

  // 3. Many P2P transfers
  const p2pTxs = transactions.filter(t => /перевод|p2p|физ.*лиц|от.*физ/i.test(t.description + t.merchant));
  const p2pMonthly = p2pTxs.length / numMonths;
  if (p2pMonthly > 20) {
    score -= 20;
    factors.push({
      id: "many_p2p",
      title: "Частые P2P переводы",
      description: `В среднем ${Math.round(p2pMonthly)} переводов между физлицами в месяц. При обороте более 100 000 ₽/мес банк обязан проверить по 115-ФЗ.`,
      severity: "high",
      points: -20,
      recommendation: "Если это оплата услуг — оформите договоры. Если бизнес — откройте ИП.",
    });
  } else if (p2pMonthly > 10) {
    score -= 8;
    factors.push({
      id: "p2p_medium",
      title: "Активные P2P переводы",
      description: "10–20 переводов между физлицами в месяц. Следите за оборотами.",
      severity: "medium",
      points: -8,
      recommendation: "Держите обороты в норме и сохраняйте основания для переводов.",
    });
  }

  // 4. Debt load
  if (profile.monthlyIncome) {
    const debtPayments = expenses.filter(t => t.category === "Кредиты");
    const monthlyDebt = Math.abs(debtPayments.reduce((s, t) => s + t.amount, 0)) / numMonths;
    const debtLoad = monthlyDebt / profile.monthlyIncome;
    if (debtLoad > 0.5) {
      score -= 15;
      factors.push({
        id: "high_debt_load",
        title: "Высокая долговая нагрузка",
        description: `Платежи по кредитам составляют ${Math.round(debtLoad * 100)}% от дохода. Норма — до 40%. Банки могут отказать в новых кредитах.`,
        severity: "high",
        points: -15,
        recommendation: "Постарайтесь закрыть хотя бы один кредит. Рефинансирование может снизить платёж.",
      });
    } else if (debtLoad > 0.3) {
      score -= 5;
      factors.push({
        id: "medium_debt_load",
        title: "Умеренная долговая нагрузка",
        description: `Платежи ${Math.round(debtLoad * 100)}% от дохода. Допустимо, но близко к границе.`,
        severity: "medium",
        points: -5,
        recommendation: "Не берите новые кредиты до снижения текущей нагрузки.",
      });
    } else {
      score += 10;
      factors.push({
        id: "low_debt_load",
        title: "Здоровая долговая нагрузка",
        description: "Платежи по кредитам в норме — до 30% дохода.",
        severity: "low",
        points: 10,
        recommendation: "Хорошо. Можете рассмотреть ипотеку или другие продукты.",
      });
    }
  }

  // 5. Regular income = good
  const salaryTxs = incomes.filter(t => t.category === "Зарплата" || /зарплата|salary|аванс/i.test(t.description));
  if (salaryTxs.length >= 2) {
    score += 10;
    factors.push({
      id: "regular_income",
      title: "Регулярный официальный доход",
      description: "Зарплата поступает регулярно — это положительный сигнал для банков.",
      severity: "low",
      points: 10,
      recommendation: "Официальный доход улучшает кредитный рейтинг.",
    });
  }

  // 6. Round amounts (potential structuring)
  const roundTxs = expenses.filter(t => {
    const abs = Math.abs(t.amount);
    return abs >= 50000 && abs % 10000 === 0;
  });
  if (roundTxs.length >= 3) {
    score -= 10;
    factors.push({
      id: "round_amounts",
      title: "Много круглых сумм",
      description: "Несколько переводов ровными суммами ≥ 50 000 ₽. Банковский мониторинг может обратить внимание.",
      severity: "medium",
      points: -10,
      recommendation: "Сохраняйте назначение платежей и документы к крупным операциям.",
    });
  }

  score = Math.max(0, Math.min(100, score));
  const level: ComplianceReport["level"] = score >= 70 ? "safe" : score >= 45 ? "attention" : "risk";

  const actions: string[] = [];
  if (level === "risk") {
    actions.push("Немедленно проверьте наличие документов по всем крупным операциям");
    actions.push("Обратитесь в банк с объяснением источника средств");
    actions.push("Рассмотрите открытие ИП для систематических доходов");
  } else if (level === "attention") {
    actions.push("Сохраняйте договоры и справки по нестандартным операциям");
    actions.push("Снизьте долю снятия наличных");
  } else {
    actions.push("Ваш профиль выглядит хорошо. Продолжайте вести финансовый учёт.");
    actions.push("Раз в квартал проверяйте свою кредитную историю на НБКИ");
  }

  const summaries: Record<string, string> = {
    safe: "Ваш финансовый профиль выглядит нормально. Явных рисков по 115-ФЗ нет.",
    attention: "Есть несколько моментов, на которые стоит обратить внимание. Риск невысокий, но лучше разобраться.",
    risk: "Обнаружены факторы повышенного риска. Рекомендуем принять меры, чтобы избежать вопросов от банка.",
  };

  return { score, level, factors, summary: summaries[level], actions };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  card: "Карта",
  deposit: "Вклад",
  loan: "Кредит",
  mortgage: "Ипотека",
  invest: "Инвестиции",
};

export const PRODUCT_TYPE_EMOJI: Record<ProductType, string> = {
  card: "💳",
  deposit: "🏦",
  loan: "💰",
  mortgage: "🏠",
  invest: "📈",
};

export function formatRate(min?: number, max?: number): string {
  if (!min && !max) return "—";
  if (min === max || !max) return `${min}%`;
  return `${min}–${max}%`;
}

export function getBankLogoStyle(product: BankProduct): { bg: string; text: string; label: string } {
  const isLight = product.bankColor === "#FFDD2D" || product.bankColor === "#FFE600";
  return {
    bg: product.bankColor,
    text: isLight ? (product.bankColorSecondary || "#000000") : "#FFFFFF",
    label: product.bankLogoSvg,
  };
}
