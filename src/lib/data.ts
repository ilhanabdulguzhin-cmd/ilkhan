// Monetrix demo data and types
export interface Account {
  id: string;
  provider: string;
  providerLogo: string;
  type: 'bank' | 'broker' | 'wallet';
  name: string;
  balance: number;
  currency: string;
  lastSync: string;
  status: 'active' | 'error' | 'syncing';
  scopes: string[];
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string;
  merchantNormalized: string;
  category: string;
  categoryIcon: string;
  mcc: string;
  mccDescription: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  isSubscription: boolean;
  isFee: boolean;
  confidence: number;
  tags: string[];
}

export interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  category: string;
  status: 'active' | 'paused' | 'cancelled';
  totalSpent: number;
  detectedAt: string;
}

export interface FinancialMetric {
  name: string;
  value: number;
  target?: number;
  unit: string;
  status: 'green' | 'yellow' | 'red';
  factors: string[];
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export interface Consultant {
  id: string;
  name: string;
  photo: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  pricePerSession: number;
  currency: string;
  availability: string[];
  bio: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: { title: string; source: string }[];
  mode?: 'invest' | 'compliance';
}

export interface DebtItem {
  id: string;
  name: string;
  type: 'mortgage' | 'consumer' | 'credit_card' | 'auto';
  balance: number;
  rate: number;
  monthlyPayment: number;
  remainingMonths: number;
  totalOverpayment: number;
  currency: string;
}

// --- Demo Data ---

export const demoAccounts: Account[] = [
  {
    id: 'acc-1', provider: 'Сбер', providerLogo: '🏦', type: 'bank',
    name: 'Дебетовая карта *4521', balance: 312500.00, currency: 'RUB',
    lastSync: '2026-07-18T10:30:00Z', status: 'active',
    scopes: ['accounts', 'transactions', 'balances']
  },
  {
    id: 'acc-2', provider: 'Т-Банк', providerLogo: '🏦', type: 'bank',
    name: 'Кредитная карта *8832', balance: -38200.00, currency: 'RUB',
    lastSync: '2026-07-18T10:28:00Z', status: 'active',
    scopes: ['accounts', 'transactions', 'balances', 'credits']
  },
  {
    id: 'acc-3', provider: 'Т-Инвестиции', providerLogo: '📈', type: 'broker',
    name: 'Брокерский счёт + ИИС-3', balance: 1870000.50, currency: 'RUB',
    lastSync: '2026-07-18T09:15:00Z', status: 'active',
    scopes: ['portfolio', 'positions', 'trades']
  },
  {
    id: 'acc-4', provider: 'ЮMoney', providerLogo: '💳', type: 'wallet',
    name: 'Электронный кошелёк', balance: 18500.00, currency: 'RUB',
    lastSync: '2026-07-18T08:00:00Z', status: 'active',
    scopes: ['balance', 'operations']
  },
  {
    id: 'acc-5', provider: 'Газпромбанк', providerLogo: '🏦', type: 'bank',
    name: 'Накопительный счёт 14,5%', balance: 520000.00, currency: 'RUB',
    lastSync: '2026-07-17T23:55:00Z', status: 'active',
    scopes: ['accounts', 'balances']
  },
];

export const demoTransactions: Transaction[] = [
  { id: 't-1', date: '2026-07-18', amount: -3850, currency: 'RUB', description: 'PYATEROCHKA 1523', merchant: 'PYATEROCHKA 1523', merchantNormalized: 'Пятёрочка', category: 'Продукты', categoryIcon: '🛒', mcc: '5411', mccDescription: 'Grocery Stores, Supermarkets', accountId: 'acc-1', type: 'expense', isSubscription: false, isFee: false, confidence: 0.98, tags: [] },
  { id: 't-2', date: '2026-07-18', amount: -990, currency: 'RUB', description: 'YANDEX.PLUS', merchant: 'YANDEX.PLUS', merchantNormalized: 'Яндекс Плюс', category: 'Подписки', categoryIcon: '🔄', mcc: '4899', mccDescription: 'Cable and Pay TV', accountId: 'acc-1', type: 'expense', isSubscription: true, isFee: false, confidence: 0.99, tags: ['подписка'] },
  { id: 't-3', date: '2026-07-17', amount: -18200, currency: 'RUB', description: 'OZON.RU', merchant: 'OZON.RU', merchantNormalized: 'Ozon', category: 'Покупки', categoryIcon: '🛍️', mcc: '5999', mccDescription: 'Miscellaneous Retail', accountId: 'acc-2', type: 'expense', isSubscription: false, isFee: false, confidence: 0.95, tags: [] },
  { id: 't-4', date: '2026-07-17', amount: 195000, currency: 'RUB', description: 'Зачисление зарплаты ООО Техноком', merchant: 'ООО Техноком', merchantNormalized: 'ООО Техноком', category: 'Зарплата', categoryIcon: '💰', mcc: '0000', mccDescription: 'N/A', accountId: 'acc-1', type: 'income', isSubscription: false, isFee: false, confidence: 0.99, tags: ['зарплата'] },
  { id: 't-5', date: '2026-07-17', amount: -2500, currency: 'RUB', description: 'CITYMOBIL TRIP', merchant: 'CITYMOBIL', merchantNormalized: 'СитиМобил', category: 'Транспорт', categoryIcon: '🚗', mcc: '4121', mccDescription: 'Taxicabs and Limousines', accountId: 'acc-1', type: 'expense', isSubscription: false, isFee: false, confidence: 0.97, tags: [] },
  { id: 't-6', date: '2026-07-16', amount: -1200, currency: 'RUB', description: 'COFFEE 42', merchant: 'COFFEE 42', merchantNormalized: 'Кофе', category: 'Рестораны и кафе', categoryIcon: '☕', mcc: '5814', mccDescription: 'Fast Food Restaurants', accountId: 'acc-1', type: 'expense', isSubscription: false, isFee: false, confidence: 0.96, tags: [] },
  { id: 't-7', date: '2026-07-16', amount: -45200, currency: 'RUB', description: 'Платёж по ипотеке', merchant: 'Сбербанк', merchantNormalized: 'Сбербанк', category: 'Кредиты', categoryIcon: '🏠', mcc: '6012', mccDescription: 'Financial Institutions', accountId: 'acc-1', type: 'expense', isSubscription: true, isFee: false, confidence: 0.99, tags: ['ипотека'] },
  { id: 't-8', date: '2026-07-16', amount: -199, currency: 'RUB', description: 'SPOTIFY', merchant: 'SPOTIFY', merchantNormalized: 'Spotify', category: 'Подписки', categoryIcon: '🔄', mcc: '5815', mccDescription: 'Digital Goods', accountId: 'acc-2', type: 'expense', isSubscription: true, isFee: false, confidence: 0.99, tags: ['подписка'] },
  { id: 't-9', date: '2026-07-15', amount: -8900, currency: 'RUB', description: 'LENTA HYPERMARKET', merchant: 'LENTA', merchantNormalized: 'Лента', category: 'Продукты', categoryIcon: '🛒', mcc: '5411', mccDescription: 'Grocery Stores, Supermarkets', accountId: 'acc-1', type: 'expense', isSubscription: false, isFee: false, confidence: 0.97, tags: [] },
  { id: 't-10', date: '2026-07-15', amount: -500, currency: 'RUB', description: 'Комиссия за обслуживание карты', merchant: 'Т-Банк', merchantNormalized: 'Т-Банк', category: 'Комиссии', categoryIcon: '💸', mcc: '6012', mccDescription: 'Financial Institutions', accountId: 'acc-2', type: 'expense', isSubscription: false, isFee: true, confidence: 0.99, tags: ['комиссия'] },
  { id: 't-11', date: '2026-07-14', amount: -14500, currency: 'RUB', description: 'DNS DIGITAL', merchant: 'DNS', merchantNormalized: 'DNS', category: 'Электроника', categoryIcon: '💻', mcc: '5732', mccDescription: 'Electronics Stores', accountId: 'acc-1', type: 'expense', isSubscription: false, isFee: false, confidence: 0.94, tags: [] },
  { id: 't-12', date: '2026-07-14', amount: 30000, currency: 'RUB', description: 'Перевод от Иванов А.', merchant: 'Перевод', merchantNormalized: 'P2P Перевод', category: 'Переводы', categoryIcon: '🔄', mcc: '6012', mccDescription: 'Financial Institutions', accountId: 'acc-1', type: 'income', isSubscription: false, isFee: false, confidence: 0.92, tags: [] },
];

export const demoSubscriptions: Subscription[] = [
  { id: 's-1', merchant: 'Яндекс Плюс', amount: 990, currency: 'RUB', frequency: 'monthly', nextDate: '2026-08-18', category: 'Развлечения', status: 'active', totalSpent: 15840, detectedAt: '2025-03-11' },
  { id: 's-2', merchant: 'Spotify', amount: 199, currency: 'RUB', frequency: 'monthly', nextDate: '2026-08-16', category: 'Музыка', status: 'active', totalSpent: 3184, detectedAt: '2025-03-09' },
  { id: 's-3', merchant: 'Netflix', amount: 1490, currency: 'RUB', frequency: 'monthly', nextDate: '2026-08-15', category: 'Развлечения', status: 'active', totalSpent: 25330, detectedAt: '2024-02-15' },
  { id: 's-4', merchant: 'iCloud+', amount: 299, currency: 'RUB', frequency: 'monthly', nextDate: '2026-08-20', category: 'Облако', status: 'active', totalSpent: 5083, detectedAt: '2025-02-20' },
  { id: 's-5', merchant: 'Фитнес World Class', amount: 8500, currency: 'RUB', frequency: 'monthly', nextDate: '2026-08-01', category: 'Спорт', status: 'active', totalSpent: 144500, detectedAt: '2024-03-01' },
  { id: 's-6', merchant: 'ChatGPT Plus', amount: 2990, currency: 'RUB', frequency: 'monthly', nextDate: '2026-08-22', category: 'Инструменты', status: 'active', totalSpent: 32890, detectedAt: '2025-08-22' },
];

export const demoMetrics: FinancialMetric[] = [
  { name: 'Cashflow', value: 96700, unit: 'RUB/мес', status: 'green', factors: ['Стабильный доход 195 000 ₽', 'Контролируемые расходы', 'Положительная динамика +8%'], trend: 'up', trendValue: 5.2, target: 100000 },
  { name: 'Долговая нагрузка', value: 28, unit: '%', status: 'yellow', factors: ['Ипотека снижена до 23%', 'Кредитная карта 5%', 'Рекомендация: снизить до 25%'], trend: 'down', trendValue: -4, target: 25 },
  { name: 'Ликвидность', value: 4.5, unit: 'мес', status: 'yellow', factors: ['Резерв: 520 000 ₽', 'Расходы: ~98 300 ₽/мес', 'Рекомендация: 6 месяцев'], trend: 'up', trendValue: 0.3, target: 6 },
  { name: 'Аномалии расходов', value: 8, unit: '%', status: 'green', factors: ['Незначительное отклонение', 'Сезонный рост покупок', 'В пределах нормы'], trend: 'stable', trendValue: 0, target: 15 },
  { name: 'Инвест. риск', value: 42, unit: 'баллов', status: 'yellow', factors: ['Высокая концентрация в нефтегазе', 'ИИС-3 снижает риск', 'Портфель: ОФЗ 35%, акции 55%, золото 10%'], trend: 'down', trendValue: -3, target: 35 },
];

export const demoDebts: DebtItem[] = [
  { id: 'd-1', name: 'Ипотека Сбербанк', type: 'mortgage', balance: 4150000, rate: 7.9, monthlyPayment: 45200, remainingMonths: 150, totalOverpayment: 2700000, currency: 'RUB' },
  { id: 'd-2', name: 'Кредитная карта Т-Банк', type: 'credit_card', balance: 38200, rate: 29.9, monthlyPayment: 5000, remainingMonths: 9, totalOverpayment: 12800, currency: 'RUB' },
  { id: 'd-3', name: 'Автокредит ВТБ', type: 'auto', balance: 620000, rate: 12.5, monthlyPayment: 22100, remainingMonths: 30, totalOverpayment: 98000, currency: 'RUB' },
];

export const demoConsultants: Consultant[] = [
  { id: 'c-1', name: 'Елена Смирнова', photo: '', specialization: ['Инвестиции', 'Портфельное управление'], experience: 12, rating: 4.9, reviewCount: 234, pricePerSession: 5000, currency: 'RUB', availability: ['Пн', 'Ср', 'Пт'], bio: 'CFA, CFP. Более 12 лет опыта в управлении инвестициями. Специализация: долгосрочные стратегии, ETF-портфели.' },
  { id: 'c-2', name: 'Андрей Козлов', photo: '', specialization: ['Налоги', 'Комплаенс'], experience: 8, rating: 4.8, reviewCount: 156, pricePerSession: 4000, currency: 'RUB', availability: ['Вт', 'Чт', 'Сб'], bio: 'Налоговый консультант. 8 лет опыта в НДФЛ, ИИС, валютном контроле. Помощь в декларациях и оптимизации.' },
  { id: 'c-3', name: 'Мария Петрова', photo: '', specialization: ['Долги', 'Бюджетирование', 'Антикризис'], experience: 10, rating: 4.7, reviewCount: 312, pricePerSession: 3500, currency: 'RUB', availability: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'], bio: 'Финансовый планировщик. Специализация: выход из долгов, построение бюджета, финансовая подушка.' },
  { id: 'c-4', name: 'Дмитрий Волков', photo: '', specialization: ['Ипотека', 'Недвижимость'], experience: 15, rating: 4.9, reviewCount: 189, pricePerSession: 6000, currency: 'RUB', availability: ['Ср', 'Пт'], bio: 'Эксперт по ипотечному кредитованию. Подбор программ, рефинансирование, what-if анализ.' },
];

export const demoChatMessages: ChatMessage[] = [
  { id: 'msg-1', role: 'assistant', content: 'Добро пожаловать в AI-консультант Monetrix. Я могу помочь вам с анализом инвестиций, финансовым планированием или вопросами комплаенса. Выберите режим или задайте вопрос.', timestamp: '2026-07-18T10:00:00Z', mode: 'invest' },
];

export const categoryBreakdown = [
  { name: 'Продукты', value: 38500, color: '#4318FF' },
  { name: 'Ипотека', value: 45200, color: '#7551FF' },
  { name: 'Транспорт', value: 9500, color: '#01B5D8' },
  { name: 'Подписки', value: 14468, color: '#05CD99' },
  { name: 'Покупки', value: 32700, color: '#FFB547' },
  { name: 'Рестораны', value: 8800, color: '#EE5D50' },
  { name: 'Прочее', value: 5800, color: '#868CFF' },
];

export const monthlyTrend = [
  { month: 'Янв', income: 185000, expenses: 139000 },
  { month: 'Фев', income: 185000, expenses: 147768 },
  { month: 'Мар', income: 190000, expenses: 142000 },
  { month: 'Апр', income: 195000, expenses: 135000 },
  { month: 'Май', income: 195000, expenses: 148000 },
  { month: 'Июн', income: 195000, expenses: 132000 },
  { month: 'Июл', income: 195000, expenses: 98300 },
];

export function formatCurrency(amount: number, currency: string = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// MCC reference data (real Mastercard MCC codes)
export const mccReference: Record<string, { description: string; category: string }> = {
  '0742': { description: 'Veterinary Services', category: 'Услуги' },
  '0763': { description: 'Agricultural Co-operatives', category: 'Сельское хозяйство' },
  '4121': { description: 'Taxicabs and Limousines', category: 'Транспорт' },
  '4131': { description: 'Bus Lines', category: 'Транспорт' },
  '4899': { description: 'Cable, Satellite and Pay Television/Radio', category: 'Подписки' },
  '5411': { description: 'Grocery Stores, Supermarkets', category: 'Продукты' },
  '5732': { description: 'Electronics Stores', category: 'Электроника' },
  '5814': { description: 'Fast Food Restaurants', category: 'Рестораны и кафе' },
  '5815': { description: 'Digital Goods: Media, Books, Movies, Music', category: 'Подписки' },
  '5912': { description: 'Drug Stores and Pharmacies', category: 'Здоровье' },
  '5999': { description: 'Miscellaneous and Specialty Retail Stores', category: 'Покупки' },
  '6012': { description: 'Financial Institutions - Merchandise/Services', category: 'Финансы' },
  '7832': { description: 'Motion Picture Theaters', category: 'Развлечения' },
  '7941': { description: 'Athletic Fields, Commercial Sports', category: 'Спорт' },
  '8011': { description: 'Doctors', category: 'Здоровье' },
  '8021': { description: 'Dentists, Orthodontists', category: 'Здоровье' },
};

// CBR exchange rates (real endpoint: https://www.cbr.ru/scripts/XML_daily.asp)
export const exchangeRates = {
  USD: { rate: 88.45, change: -0.28, date: '2026-07-18' },
  EUR: { rate: 100.12, change: 0.22, date: '2026-07-18' },
  CNY: { rate: 12.18, change: 0.03, date: '2026-07-18' },
  GBP: { rate: 114.78, change: -0.35, date: '2026-07-18' },
};
