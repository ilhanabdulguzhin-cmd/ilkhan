// Monetrix User Store — encrypted IndexedDB + localStorage fallback
// All data stays ONLY on the user's device. Nothing is sent anywhere.
"use client";

import { cryptoSet, cryptoGet } from "@/lib/crypto-store";
import { createClient } from "@/lib/supabase/client";

export type UserSegment = "solo" | "family" | "entrepreneur";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  onboarded: boolean;
  segment?: UserSegment;
  monthlyIncome?: number;
  mainGoal?: string;
  mainGoals?: string[];           // multi-select goals
  riskTolerance?: "conservative" | "moderate" | "aggressive";
  // Monthly expense buckets (set via voice/onboarding)
  monthlyRent?: number;
  monthlyFood?: number;
  monthlyTransport?: number;
  monthlyCredit?: number;
  monthlyUtilities?: number;
  monthlySavings?: number;
  creditDebt?: number;
  // Family extras
  familySize?: number;
  hasChildren?: boolean;
  childrenCount?: number;
  // Entrepreneur extras
  businessType?: string;
  // Extra context
  city?: string;
  employmentType?: "employee" | "selfemployed" | "entrepreneur" | "freelancer" | "retired" | "student";
  housingType?: "rent" | "own" | "mortgage" | "parents";
  hasCar?: boolean;
}

// ---- Analytics types ----

export interface LossItem {
  id: string;
  type: "subscription" | "impulse" | "growth" | "commission" | "overweight";
  title: string;
  description: string;
  amountMonthly: number;
  category?: string;
  actionLabel: string;
  actionLink: string;
}

export interface OpportunityItem {
  id: string;
  type: "deduction" | "cashback" | "tariff" | "benefit" | "optimize";
  title: string;
  description: string;
  potentialSaving: number;
  actionLabel: string;
  actionLink: string;
}

export interface ActionItem {
  id: string;
  title: string;
  effect: string;
  effectAmount: number;
  difficulty: "easy" | "medium" | "hard";
  deadline: string;
  actionLabel: string;
  actionLink: string;
  done: boolean;
}

export interface FinancialInsights {
  losses: LossItem[];
  opportunities: OpportunityItem[];
  actions: ActionItem[];
  totalLossMonthly: number;
  totalOpportunityYear: number;
  generatedAt: string;
}

export interface UserTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string;
  category: string;
  categoryIcon: string;
  type: "income" | "expense" | "transfer";
  source: "manual" | "csv" | "pdf";
  confidence: number;
}

export interface UserAccount {
  id: string;
  name: string;
  type: "bank" | "broker" | "wallet" | "cash";
  balance: number;
  currency: string;
  addedAt: string;
}

export interface UserDebt {
  id: string;
  name: string;
  type: "mortgage" | "consumer" | "credit_card" | "auto";
  balance: number;
  rate: number;
  monthlyPayment: number;
  remainingMonths: number;
  currency: string;
}

export interface UserGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  currency: string;
}

export interface UserData {
  profile: UserProfile;
  transactions: UserTransaction[];
  accounts: UserAccount[];
  debts: UserDebt[];
  goals: UserGoal[];
}

const STORAGE_KEY = "monetrix_user";
const USERS_KEY = "monetrix_users";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Stable per-email encryption key — persists across sessions in localStorage.
// This means the same device can always decrypt its own IndexedDB data.
function getStablePassword(email: string): string {
  if (typeof window === "undefined") return email + "_fallback";
  const saltKey = `monetrix_dk_${email}`;
  let salt = localStorage.getItem(saltKey);
  if (!salt) {
    salt = generateId() + generateId();
    localStorage.setItem(saltKey, salt);
  }
  return salt;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Get registered users (email + hash only, no sensitive data)
export function getUsers(): Record<string, { email: string; passwordHash: string; name: string }> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function registerUser(email: string, password: string, name: string): { success: boolean; error?: string } {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users[normalizedEmail]) {
    return { success: false, error: "Такой аккаунт уже есть. Попробуйте войти." };
  }

  users[normalizedEmail] = {
    email: normalizedEmail,
    passwordHash: simpleHash(password),
    name,
  };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const userData: UserData = {
    profile: {
      id: generateId(),
      email: normalizedEmail,
      name,
      createdAt: new Date().toISOString(),
      onboarded: false,
    },
    transactions: [],
    accounts: [],
    debts: [],
    goals: [],
  };

  // Save to localStorage immediately, then encrypt to IndexedDB async
  localStorage.setItem(`${STORAGE_KEY}_${normalizedEmail}`, JSON.stringify(userData));
  localStorage.setItem(STORAGE_KEY + "_current", normalizedEmail);

  // Async encrypt with stable per-email key
  const pw = getStablePassword(normalizedEmail);
  cryptoSet(`user_${normalizedEmail}`, userData, pw).catch(() => {});

  return { success: true };
}

/** Create a demo account with pre-populated data for instant testing */
/** Demo data is kept only for internal previews and is never used by normal auth flows. */
export function createDemoAccount(): { success: boolean; email?: string; error?: string } {
  const demoEmail = "demo@monetrix.app";
  const demoPassword = "demo123";
  const demoName = "Демо-пользователь";

  // Remove existing demo account if present
  const users = getUsers();
  if (users[demoEmail]) {
    delete users[demoEmail];
    localStorage.removeItem(`${STORAGE_KEY}_${demoEmail}`);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Register demo user
  const existing = users[demoEmail];
  if (!existing) {
    users[demoEmail] = {
      email: demoEmail,
      passwordHash: simpleHash(demoPassword),
      name: demoName,
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Create rich demo data
  const now = new Date();
  const demoData: UserData = {
    profile: {
      id: generateId(),
      email: demoEmail,
      name: demoName,
      createdAt: now.toISOString(),
      onboarded: true,
      segment: "solo",
      monthlyIncome: 195000,
      mainGoal: "invest",
      mainGoals: ["invest", "save", "home"],
      riskTolerance: "moderate",
      city: "Москва",
      employmentType: "employee",
      housingType: "mortgage",
      hasCar: true,
      monthlyRent: 45200,
      monthlyFood: 38500,
      monthlyTransport: 9500,
      monthlyCredit: 45200,
      monthlySavings: 30000,
    },
    accounts: [
      { id: generateId(), name: "Сбер Дебетовая *4521", type: "bank" as const, balance: 312500, currency: "RUB", addedAt: new Date(Date.now() - 86400000 * 180).toISOString() },
      { id: generateId(), name: "Т-Банк Кредитная *8832", type: "bank" as const, balance: -38200, currency: "RUB", addedAt: new Date(Date.now() - 86400000 * 365).toISOString() },
      { id: generateId(), name: "Т-Инвестиции ИИС-3", type: "broker" as const, balance: 1870000, currency: "RUB", addedAt: new Date(Date.now() - 86400000 * 730).toISOString() },
      { id: generateId(), name: "Газпромбанк Накопительный 14,5%", type: "bank" as const, balance: 520000, currency: "RUB", addedAt: new Date(Date.now() - 86400000 * 90).toISOString() },
      { id: generateId(), name: "ЮMoney", type: "wallet" as const, balance: 18500, currency: "RUB", addedAt: new Date(Date.now() - 86400000 * 60).toISOString() },
      { id: generateId(), name: "Наличные", type: "cash" as const, balance: 45000, currency: "RUB", addedAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    ],
    transactions: generateDemoTransactions(),
    debts: [
      { id: generateId(), name: "Ипотека Сбербанк", type: "mortgage" as const, balance: 4150000, rate: 7.9, monthlyPayment: 45200, remainingMonths: 150, currency: "RUB" },
      { id: generateId(), name: "Кредитная карта Т-Банк", type: "credit_card" as const, balance: 38200, rate: 29.9, monthlyPayment: 5000, remainingMonths: 9, currency: "RUB" },
      { id: generateId(), name: "Автокредит ВТБ", type: "auto" as const, balance: 620000, rate: 12.5, monthlyPayment: 22100, remainingMonths: 30, currency: "RUB" },
    ],
    goals: [
      { id: generateId(), name: "Инвестировать", targetAmount: 3000000, currentAmount: 1870000, deadline: "2028-07-18", currency: "RUB" },
      { id: generateId(), name: "Подушка безопасности", targetAmount: 600000, currentAmount: 520000, deadline: "2026-12-31", currency: "RUB" },
    ],
  };

  localStorage.setItem(`${STORAGE_KEY}_${demoEmail}`, JSON.stringify(demoData));
  localStorage.setItem(STORAGE_KEY + "_current", demoEmail);

  // Async encrypt
  const pw = getStablePassword(demoEmail);
  cryptoSet(`user_${demoEmail}`, demoData, pw).catch(() => {});

  return { success: true, email: demoEmail };
}

function generateDemoTransactions(): UserTransaction[] {
  const now = new Date();
  const txs: UserTransaction[] = [];
  const merchants: Record<string, { cat: string; icon: string }> = {
    "Пятёрочка": { cat: "Продукты", icon: "🛒" },
    "Лента": { cat: "Продукты", icon: "🛒" },
    "Ашан": { cat: "Продукты", icon: "🛒" },
    "Магнит": { cat: "Продукты", icon: "🛒" },
    "OZON.RU": { cat: "Покупки", icon: "🛍️" },
    "Wildberries": { cat: "Покупки", icon: "🛍️" },
    "Яндекс.Еда": { cat: "Рестораны и кафе", icon: "☕" },
    "Кофе": { cat: "Рестораны и кафе", icon: "☕" },
    "СитиМобил": { cat: "Транспорт", icon: "🚗" },
    "Яндекс.Такси": { cat: "Транспорт", icon: "🚗" },
    "АЗС Лукойл": { cat: "Авто", icon: "⛽" },
    "Яндекс Плюс": { cat: "Подписки", icon: "🔄" },
    "Spotify": { cat: "Подписки", icon: "🔄" },
    "Netflix": { cat: "Подписки", icon: "🔄" },
    "iCloud+": { cat: "Подписки", icon: "🔄" },
    "World Class": { cat: "Спорт", icon: "🏋️" },
    "ChatGPT Plus": { cat: "Подписки", icon: "🔄" },
    "Аптека": { cat: "Здоровье", icon: "💊" },
    "DNS": { cat: "Электроника", icon: "💻" },
    "Сбербанк": { cat: "Кредиты", icon: "🏠" },
    "Т-Банк Комиссия": { cat: "Комиссии", icon: "💸" },
  };

  let id = 1;
  // Generate 3 months of transactions
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const month = now.getMonth() - monthOffset;
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Salary on 10th
    const salaryDay = Math.min(10, daysInMonth);
    const salaryDate = new Date(year, month, salaryDay);
    if (salaryDate <= now) {
      txs.push({
        id: `demo-tx-${id++}`,
        date: salaryDate.toISOString().split("T")[0],
        amount: 195000,
        currency: "RUB",
        description: "Зарплата ОО�� Техноком",
        merchant: "ООО Техноком",
        category: "Зарплата",
        categoryIcon: "💰",
        type: "income",
        source: "csv",
        confidence: 0.99,
      });
    }

    // Mortgage on 15th
    const mortgageDay = Math.min(15, daysInMonth);
    const mortgageDate = new Date(year, month, mortgageDay);
    if (mortgageDate <= now) {
      txs.push({
        id: `demo-tx-${id++}`,
        date: mortgageDate.toISOString().split("T")[0],
        amount: -45200,
        currency: "RUB",
        description: "Платёж по ипотеке",
        merchant: "Сбербанк",
        category: "Кредиты",
        categoryIcon: "🏠",
        type: "expense",
        source: "csv",
        confidence: 0.99,
      });
    }

    // Random transactions
    const numTxs = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numTxs; i++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const txDate = new Date(year, month, day);
      if (txDate > now || txDate.getTime() === salaryDate.getTime() || txDate.getTime() === mortgageDate.getTime()) continue;

      const keys = Object.keys(merchants);
      const merchant = keys[Math.floor(Math.random() * keys.length)];
      const { cat, icon } = merchants[merchant];
      const amounts: Record<string, number> = {
        "Продукты": -(1000 + Math.random() * 5000),
        "Покупки": -(2000 + Math.random() * 15000),
        "Рестораны и кафе": -(500 + Math.random() * 1500),
        "Транспорт": -(300 + Math.random() * 2000),
        "Авто": -(1500 + Math.random() * 3000),
        "Подписки": -Math.floor([990, 199, 1490, 299, 8500, 2990][Math.floor(Math.random() * 6)]),
        "Спорт": -8500,
        "Здоровье": -(1000 + Math.random() * 3000),
        "Электроника": -(5000 + Math.random() * 10000),
        "Комиссии": -500,
      };

      txs.push({
        id: `demo-tx-${id++}`,
        date: txDate.toISOString().split("T")[0],
        amount: amounts[cat] || -(1000 + Math.random() * 5000),
        currency: "RUB",
        description: merchant,
        merchant,
        category: cat,
        categoryIcon: icon,
        type: "expense",
        source: "csv",
        confidence: 0.9 + Math.random() * 0.1,
      });
    }

    // Extra income (freelance)
    const extraDay = 20 + Math.floor(Math.random() * 5);
    const extraDate = new Date(year, month, Math.min(extraDay, daysInMonth));
    if (extraDate <= now) {
      txs.push({
        id: `demo-tx-${id++}`,
        date: extraDate.toISOString().split("T")[0],
        amount: 15000 + Math.floor(Math.random() * 30000),
        currency: "RUB",
        description: "Фриланс проект",
        merchant: "P2P Перевод",
        category: "Переводы",
        categoryIcon: "🔄",
        type: "income",
        source: "csv",
        confidence: 0.95,
      });
    }
  }

  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

export function loginUser(email: string, password: string): { success: boolean; error?: string } {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) {
    return { success: false, error: "Аккаунт не найден. Создайте новый." };
  }
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, error: "Неверный пароль. Попробуйте ещё раз." };
  }

  localStorage.setItem(STORAGE_KEY + "_current", normalizedEmail);
  return { success: true };
}

export function logoutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY + "_current");
  // Note: stable encryption key (monetrix_dk_*) is intentionally kept so
  // the user can log back in and still decrypt their IndexedDB data.
}

export function getCurrentUser(): UserData | null {
  if (typeof window === "undefined") return null;
  const currentEmail = localStorage.getItem(STORAGE_KEY + "_current");
  if (!currentEmail) return null;
  const raw = localStorage.getItem(`${STORAGE_KEY}_${currentEmail}`);
  return raw ? JSON.parse(raw) : null;
}

// Async version that tries encrypted DB first
export async function getCurrentUserEncrypted(): Promise<UserData | null> {
  if (typeof window === "undefined") return null;
  const currentEmail = localStorage.getItem(STORAGE_KEY + "_current");
  if (!currentEmail) return null;

  try {
    const pw = getStablePassword(currentEmail);
    const encrypted = await cryptoGet<UserData>(`user_${currentEmail}`, pw);
    if (encrypted) return encrypted;
  } catch {}

  // Fallback to localStorage
  const raw = localStorage.getItem(`${STORAGE_KEY}_${currentEmail}`);
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEY + "_current");
}

/** Load the authenticated user's financial snapshot from Supabase. */
export async function loadRemoteUserData(userId: string): Promise<UserData | null> {
  if (typeof window === "undefined") return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_financial_snapshots")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.data) return null;
  return data.data as UserData;
}

/** Persist the authenticated user's financial snapshot with RLS-scoped upsert. */
export async function saveRemoteUserData(userId: string, data: UserData): Promise<void> {
  if (typeof window === "undefined") return;
  const supabase = createClient();
  await supabase.from("user_financial_snapshots").upsert(
    { user_id: userId, data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}

export function saveUserData(data: UserData): void {
  if (typeof window === "undefined") return;
  const currentEmail = localStorage.getItem(STORAGE_KEY + "_current");
  if (!currentEmail) return;
  localStorage.setItem(`${STORAGE_KEY}_${currentEmail}`, JSON.stringify(data));

  // Also encrypt to IndexedDB with stable per-email key
  const pw = getStablePassword(currentEmail);
  cryptoSet(`user_${currentEmail}`, data, pw).catch(() => {});
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const data = getCurrentUser();
  if (!data) return;
  data.profile = { ...data.profile, ...updates };
  saveUserData(data);
}

export function addTransaction(tx: Omit<UserTransaction, "id">): void {
  const data = getCurrentUser();
  if (!data) return;
  data.transactions.push({ ...tx, id: generateId() });
  saveUserData(data);
}

export function addTransactions(txs: Omit<UserTransaction, "id">[]): void {
  const data = getCurrentUser();
  if (!data) return;
  for (const tx of txs) {
    data.transactions.push({ ...tx, id: generateId() });
  }
  saveUserData(data);
}

export function addAccount(acc: Omit<UserAccount, "id" | "addedAt">): void {
  const data = getCurrentUser();
  if (!data) return;
  data.accounts.push({ ...acc, id: generateId(), addedAt: new Date().toISOString() });
  saveUserData(data);
}

export function addDebt(debt: Omit<UserDebt, "id">): void {
  const data = getCurrentUser();
  if (!data) return;
  data.debts.push({ ...debt, id: generateId() });
  saveUserData(data);
}

export function addGoal(goal: Omit<UserGoal, "id">): void {
  const data = getCurrentUser();
  if (!data) return;
  data.goals.push({ ...goal, id: generateId() });
  saveUserData(data);
}

export function deleteTransaction(id: string): void {
  const data = getCurrentUser();
  if (!data) return;
  data.transactions = data.transactions.filter((t) => t.id !== id);
  saveUserData(data);
}

export function deleteAccount(id: string): void {
  const data = getCurrentUser();
  if (!data) return;
  data.accounts = data.accounts.filter((a) => a.id !== id);
  saveUserData(data);
}

export function deleteDebt(id: string): void {
  const data = getCurrentUser();
  if (!data) return;
  data.debts = data.debts.filter((d) => d.id !== id);
  saveUserData(data);
}

export function deleteGoal(id: string): void {
  const data = getCurrentUser();
  if (!data) return;
  data.goals = data.goals.filter((g) => g.id !== id);
  saveUserData(data);
}

// CSV parser for bank statements
export function parseCSVTransactions(csvText: string): Omit<UserTransaction, "id">[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const results: Omit<UserTransaction, "id">[] = [];

  const cols = header.split(/[,;\t]/);
  const dateIdx = cols.findIndex((c) => /дата|date/.test(c));
  const amountIdx = cols.findIndex((c) => /сумма|amount|sum/.test(c));
  const descIdx = cols.findIndex((c) => /описание|description|назначение|merchant|получатель/.test(c));
  const categoryIdx = cols.findIndex((c) => /категория|category/.test(c));

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/);
    if (parts.length < 2) continue;

    const rawAmount = parseFloat(
      (parts[amountIdx >= 0 ? amountIdx : 1] || "0").replace(/\s/g, "").replace(",", ".")
    );
    if (isNaN(rawAmount)) continue;

    const description = (parts[descIdx >= 0 ? descIdx : 2] || "").trim();
    const dateStr = (parts[dateIdx >= 0 ? dateIdx : 0] || "").trim();
    const category = categoryIdx >= 0 ? (parts[categoryIdx] || "").trim() : guessCategory(description);

    let parsedDate: string;
    try {
      const ddmmyyyy = dateStr.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
      if (ddmmyyyy) {
        parsedDate = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
      } else {
        parsedDate = new Date(dateStr).toISOString().split("T")[0];
      }
    } catch {
      parsedDate = new Date().toISOString().split("T")[0];
    }

    results.push({
      date: parsedDate,
      amount: rawAmount,
      currency: "RUB",
      description,
      merchant: description,
      category: category || "Другое",
      categoryIcon: getCategoryIcon(category || "Другое"),
      type: rawAmount > 0 ? "income" : "expense",
      source: "csv",
      confidence: 0.85,
    });
  }

  return results;
}

function guessCategory(description: string): string {
  const lower = description.toLowerCase();
  if (/продукт|магазин|пятёрочка|пятерочка|лента|перекрёсток|дикси|ашан|metro|spar/i.test(lower)) return "Продукты";
  if (/ресторан|кафе|coffee|starbucks|макдональдс|бургер|суши/i.test(lower)) return "Кафе и рестораны";
  if (/uber|такси|яндекс.такси|каршеринг|метро|транспорт/i.test(lower)) return "Транспорт";
  if (/аптека|медицина|доктор|клиника|стоматолог/i.test(lower)) return "Здоровье";
  if (/подписка|netflix|spotify|yandex\.plus|youtube|icloud/i.test(lower)) return "Подписки";
  if (/зарплата|salary|доход|гонорар|перевод от/i.test(lower)) return "Зарплата";
  if (/ипотека|кредит|платёж по|погашение/i.test(lower)) return "Кредиты";
  if (/комиссия|fee|обслуживание/i.test(lower)) return "Комиссии";
  if (/ozon|wildberries|aliexpress|amazon|покупка/i.test(lower)) return "Покупки";
  if (/одежда|zara|h&m|uniqlo/i.test(lower)) return "Одежда";
  if (/бензин|azs|лукойл|газпром|заправка/i.test(lower)) return "Авто";
  return "Другое";
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Продукты": "🛒",
    "Кафе и рестораны": "☕",
    "Транспорт": "🚗",
    "Здоровье": "💊",
    "Подписки": "🔄",
    "Зарплата": "💰",
    "Кредиты": "🏠",
    "Комиссии": "💸",
    "Покупки": "🛍️",
    "Одежда": "👔",
    "Авто": "⛽",
    "Развлечения": "🎬",
    "Образование": "📚",
    "Переводы": "🔄",
    "Электроника": "💻",
    "Спорт": "🏋️",
    "Другое": "📋",
  };
  return icons[category] || "📋";
}

// ---- Financial Analytics Engine ----

export function computeInsights(data: UserData): FinancialInsights {
  const txs = data.transactions;
  const profile = data.profile;
  const monthlyIncome = profile.monthlyIncome || 0;

  const losses: LossItem[] = [];
  const opportunities: OpportunityItem[] = [];
  const actions: ActionItem[] = [];

  if (txs.length === 0) {
    return {
      losses: [],
      opportunities: getGenericOpportunities(profile),
      actions: getStartActions(),
      totalLossMonthly: 0,
      totalOpportunityYear: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // --- Group by category ---
  const catTotals: Record<string, number> = {};
  const catMonths: Record<string, Record<string, number>> = {};
  const expenses = txs.filter((t) => t.amount < 0);
  const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

  expenses.forEach((t) => {
    const cat = t.category || "Другое";
    catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
    const month = t.date.substring(0, 7);
    if (!catMonths[cat]) catMonths[cat] = {};
    catMonths[cat][month] = (catMonths[cat][month] || 0) + Math.abs(t.amount);
  });

  const months = [...new Set(txs.map((t) => t.date.substring(0, 7)))].sort();
  const numMonths = Math.max(months.length, 1);

  // 1. Subscriptions
  const subTxs = expenses.filter((t) => t.category === "Подписки");
  if (subTxs.length >= 2) {
    const subTotal = subTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const subMonthly = subTotal / numMonths;
    losses.push({
      id: "subs",
      type: "subscription",
      title: `${subTxs.length} подписок на ${Math.round(subMonthly).toLocaleString("ru-RU")} ₽/мес`,
      description: `Возможно, часть из них вы не используете регулярно. Отмените ненужные — и сразу почувствуете разницу.`,
      amountMonthly: subMonthly,
      category: "Подписки",
      actionLabel: "Проверить подписки",
      actionLink: "/subscriptions",
    });
  }

  // 2. Commissions / bank fees
  const comTxs = expenses.filter((t) => t.category === "Комиссии");
  if (comTxs.length > 0) {
    const comTotal = comTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const comMonthly = comTotal / numMonths;
    losses.push({
      id: "fees",
      type: "commission",
      title: `Банковские комиссии — ${Math.round(comMonthly).toLocaleString("ru-RU")} ₽/мес`,
      description: `Вы платите банку за переводы или обслуживание. Многие банки дают бесплатные переводы — стоит переключиться.`,
      amountMonthly: comMonthly,
      category: "Комиссии",
      actionLabel: "Оптимизировать",
      actionLink: "/ai-consultant",
    });
  }

  // 3. Category growth (last month vs avg)
  if (months.length >= 2) {
    const lastMonth = months[months.length - 1];
    const prevMonths = months.slice(0, -1);
    Object.entries(catMonths).forEach(([cat, byMonth]) => {
      const lastVal = byMonth[lastMonth] || 0;
      const prevAvg = prevMonths.reduce((s, m) => s + (byMonth[m] || 0), 0) / prevMonths.length;
      if (prevAvg > 0 && lastVal > prevAvg * 1.25 && lastVal > 500) {
        const growth = Math.round(((lastVal - prevAvg) / prevAvg) * 100);
        losses.push({
          id: `growth_${cat}`,
          type: "growth",
          title: `${cat} выросли на ${growth}% за последний месяц`,
          description: `В прошлом месяце вы потратили на ${cat} на ${Math.round(lastVal - prevAvg).toLocaleString("ru-RU")} ₽ больше обычного. Стоит разобраться почему.`,
          amountMonthly: lastVal - prevAvg,
          category: cat,
          actionLabel: "Посмотреть операции",
          actionLink: "/transactions",
        });
      }
    });
  }

  // 4. Category overweight (> 30% of expenses)
  if (totalExpenses > 0) {
    Object.entries(catTotals).forEach(([cat, total]) => {
      const share = total / totalExpenses;
      if (share > 0.30 && cat !== "Зарплата" && cat !== "Кредиты" && cat !== "Переводы") {
        const monthly = total / numMonths;
        losses.push({
          id: `overweight_${cat}`,
          type: "overweight",
          title: `${cat} занимает ${Math.round(share * 100)}% всех расходов`,
          description: `Это много. Попробуйте сократить эту категорию на 10–15% — это ${Math.round(monthly * 0.12).toLocaleString("ru-RU")} ₽ экономии в месяц.`,
          amountMonthly: monthly * 0.12,
          category: cat,
          actionLabel: "Проанализировать",
          actionLink: "/transactions",
        });
      }
    });
  }

  // 5. Delivery / food delivery impulse
  const deliveryTxs = expenses.filter((t) =>
    /доставк|delivery|яндекс.?еда|самокат|сберм|vprok|деливери|везёт|достависта|кухня|готовая еда/i.test(t.description + " " + t.merchant)
  );
  if (deliveryTxs.length >= 3) {
    const delMonthly = deliveryTxs.reduce((s, t) => s + Math.abs(t.amount), 0) / numMonths;
    losses.push({
      id: "delivery",
      type: "impulse",
      title: `Доставка еды — ${Math.round(delMonthly).toLocaleString("ru-RU")} ₽/мес`,
      description: `${deliveryTxs.length} заказов еды на дом. Если готовить дома хотя бы чаще — экономия составит до 35% этой суммы.`,
      amountMonthly: delMonthly * 0.35,
      category: "Кафе и рестораны",
      actionLabel: "Посмотреть",
      actionLink: "/transactions",
    });
  }

  // 6. ATM cash withdrawals (115-FZ risk + lost cashback)
  const cashTxs = expenses.filter((t) =>
    /снятие|банкомат|atm|наличн|cash/i.test(t.description + " " + t.merchant)
  );
  if (cashTxs.length > 0) {
    const cashMonthly = cashTxs.reduce((s, t) => s + Math.abs(t.amount), 0) / numMonths;
    const cashbackLost = cashMonthly * 0.02;
    losses.push({
      id: "cash_atm",
      type: "commission",
      title: `Снятие наличных — ${Math.round(cashMonthly).toLocaleString("ru-RU")} ₽/мес`,
      description: `Платя картой вместо наличных, вы получаете кешбэк (~2%). Это ${Math.round(cashbackLost).toLocaleString("ru-RU")} ₽ упущенной выгоды в месяц.`,
      amountMonthly: cashbackLost,
      category: "Комиссии",
      actionLabel: "Подобрать карту",
      actionLink: "/products",
    });
  }

  // 7. High café/restaurant spending
  const cafeTotal = (catTotals["Кафе и рестораны"] || 0) + (catTotals["Рестораны и кафе"] || 0);
  if (cafeTotal > 0) {
    const cafeMonthly = cafeTotal / numMonths;
    const income0 = monthlyIncome || (txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) / numMonths);
    if (income0 > 0 && cafeMonthly / income0 > 0.15) {
      losses.push({
        id: "cafe_overspend",
        type: "overweight",
        title: `Кафе и рестораны — ${Math.round(cafeMonthly).toLocaleString("ru-RU")} ₽/мес`,
        description: `Это ${Math.round((cafeMonthly / income0) * 100)}% дохода. Небольшое сокращение даст ${Math.round(cafeMonthly * 0.2).toLocaleString("ru-RU")} ₽ экономии ежемесячно.`,
        amountMonthly: cafeMonthly * 0.2,
        category: "Кафе и рестораны",
        actionLabel: "Смотреть операции",
        actionLink: "/transactions",
      });
    }
  }

  // --- Opportunities ---
  const income = monthlyIncome || (txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) / numMonths);

  // Tax deduction
  const healthTxs = expenses.filter((t) => t.category === "Здоровье");
  if (healthTxs.length > 0 || profile.segment === "family") {
    opportunities.push({
      id: "tax_health",
      type: "deduction",
      title: "Налоговый вычет за лечение",
      description: "Если вы платили за лечение, вы можете вернуть 13% НДФЛ. Максимум 15 600 ₽ в год — нужно только подать декларацию.",
      potentialSaving: 15600,
      actionLabel: "Как получить",
      actionLink: "/tax-helper",
    });
  }

  if (income > 50000) {
    opportunities.push({
      id: "iis",
      type: "deduction",
      title: "Инвестиционный вычет (ИИС)",
      description: "Открыв ИИС и внеся до 400 000 ₽, вы получите возврат 13% — до 52 000 ₽ в год. Деньги при этом не исчезают.",
      potentialSaving: Math.min(income * 12 * 0.04, 52000),
      actionLabel: "Узнать больше",
      actionLink: "/tax-helper",
    });
  }

  // Cashback optimization
  opportunities.push({
    id: "cashback",
    type: "cashback",
    title: "Выгодный кешбэк по категориям",
    description: `Ваша главная категория расходов — ${Object.entries(catTotals).sort(([,a],[,b])=>b-a)[0]?.[0] || "Продукты"}. Подберите карту с повышенным кешбэком именно по ней — экономия до 3–5%.`,
    potentialSaving: Math.round((totalExpenses / numMonths) * 0.03 * 12),
    actionLabel: "Подобрать карту",
    actionLink: "/ai-consultant",
  });

  if (profile.segment === "family" || profile.hasChildren) {
    opportunities.push({
      id: "family_benefit",
      type: "benefit",
      title: "Семейные льготы и выплаты",
      description: "Семьи с детьми имеют право на детские пособия, вычет на ребёнка, льготную ипотеку и другие меры поддержки.",
      potentialSaving: 50000,
      actionLabel: "Проверить льготы",
      actionLink: "/tax-helper",
    });
  }

  if (profile.segment === "entrepreneur") {
    opportunities.push({
      id: "biz_deduct",
      type: "deduction",
      title: "Налоговые вычеты для ИП/самозанятых",
      description: "Как самозанятый или ИП, вы можете уменьшить налоговую базу на профессиональные расходы. Не упускайте эту возможность.",
      potentialSaving: Math.round(income * 0.06 * 12),
      actionLabel: "Разобраться",
      actionLink: "/tax-helper",
    });
  }

  // --- Actions (top 5) ---
  const sortedLosses = [...losses].sort((a, b) => b.amountMonthly - a.amountMonthly);

  sortedLosses.slice(0, 2).forEach((loss, i) => {
    actions.push({
      id: `action_loss_${i}`,
      title: loss.actionLabel + ` (${loss.category || "расходы"})`,
      effect: `Экономия до ${Math.round(loss.amountMonthly).toLocaleString("ru-RU")} ₽/мес`,
      effectAmount: loss.amountMonthly,
      difficulty: "easy",
      deadline: "Сейчас",
      actionLabel: loss.actionLabel,
      actionLink: loss.actionLink,
      done: false,
    });
  });

  opportunities.slice(0, 2).forEach((opp, i) => {
    actions.push({
      id: `action_opp_${i}`,
      title: opp.title,
      effect: `Потенциал ${Math.round(opp.potentialSaving).toLocaleString("ru-RU")} ₽/год`,
      effectAmount: opp.potentialSaving / 12,
      difficulty: "medium",
      deadline: "В этом месяце",
      actionLabel: opp.actionLabel,
      actionLink: opp.actionLink,
      done: false,
    });
  });

  // Always add "upload more data" if < 20 transactions
  if (txs.length < 20) {
    actions.push({
      id: "upload_more",
      title: "Загрузить полную выписку за 3 месяца",
      effect: "Точность анализа вырастет в 3 раза",
      effectAmount: 0,
      difficulty: "easy",
      deadline: "Сейчас",
      actionLabel: "Загрузить",
      actionLink: "/upload",
      done: false,
    });
  }

  const totalLossMonthly = losses.reduce((s, l) => s + l.amountMonthly, 0);
  const totalOpportunityYear = opportunities.reduce((s, o) => s + o.potentialSaving, 0);

  return {
    losses,
    opportunities,
    actions,
    totalLossMonthly,
    totalOpportunityYear,
    generatedAt: new Date().toISOString(),
  };
}

function getGenericOpportunities(profile: UserProfile): OpportunityItem[] {
  const opps: OpportunityItem[] = [
    {
      id: "tax_standard",
      type: "deduction",
      title: "Налоговый вычет за лечение и обучение",
      description: "Если вы платили за лечение или учёбу, можно вернуть 13% НДФЛ — до 15 600 ₽ в год.",
      potentialSaving: 15600,
      actionLabel: "Как получить",
      actionLink: "/tax-helper",
    },
    {
      id: "cashback_generic",
      type: "cashback",
      title: "Выбрать карту с лучшим кешбэком",
      description: "Правильная карта с кешбэком 2–5% по нужным категориям может приносить до 5 000 ₽ в месяц.",
      potentialSaving: 36000,
      actionLabel: "Подобрать",
      actionLink: "/ai-consultant",
    },
  ];
  if (profile.segment === "family" || profile.hasChildren) {
    opps.push({
      id: "family_benefit",
      type: "benefit",
      title: "Семейные пособия и льготы",
      description: "Детские выплаты, льготная ипотека, вычет на ребёнка — проверьте, что вы получаете всё положенное.",
      potentialSaving: 50000,
      actionLabel: "Проверить",
      actionLink: "/tax-helper",
    });
  }
  return opps;
}

function getStartActions(): ActionItem[] {
  return [
    {
      id: "upload_csv",
      title: "Загрузить выписку из банка",
      effect: "Мгновенный анализ всех расходов",
      effectAmount: 0,
      difficulty: "easy",
      deadline: "Сейчас",
      actionLabel: "Загрузить CSV",
      actionLink: "/upload",
      done: false,
    },
    {
      id: "add_manual",
      title: "Добавить первые операции вручную",
      effect: "Начать вести бюджет с нуля",
      effectAmount: 0,
      difficulty: "easy",
      deadline: "Сейчас",
      actionLabel: "Добавить",
      actionLink: "/upload",
      done: false,
    },
    {
      id: "check_tax",
      title: "Проверить право на налоговый вычет",
      effect: "Потенциальный возврат до 52 000 ₽",
      effectAmount: 0,
      difficulty: "medium",
      deadline: "До апреля",
      actionLabel: "Проверить",
      actionLink: "/tax-helper",
      done: false,
    },
  ];
}
