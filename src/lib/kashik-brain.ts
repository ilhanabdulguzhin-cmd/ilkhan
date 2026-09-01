// ─── Кэшик — Продвинутый финансовый AI ───────────────────────────────────────
// Актуальные данные: март 2026
// Работает полностью локально, без API ключей
// v2.0 — умный анализ произвольных данных, детальные расчёты

export interface KashikContext {
  message: string;
  scenario?: string;
  monthlyIncome?: number;
  totalBalance?: number;
  totalExpenses?: number;
  savingsRate?: number;
  topCategories?: string[];
  hasDebts?: boolean;
  debtTotal?: number;
  segment?: string;
  name?: string;
  history?: { role: string; content: string }[];
}

export interface CalcResult {
  title: string;
  rows: { label: string; value: string; highlight?: boolean; note?: string }[];
  tip?: string;
  links?: { label: string; url: string }[];
}

export interface ValueTip {
  emoji: string;
  title: string;
  saving: string;
  action: string;
  link?: string;
}

export interface ProductSuggestion {
  name: string;
  bank: string;
  type: string;
  benefit: string;
  highlight: string;
  url: string;
}

export interface KashikResponse {
  text: string;
  calcResult?: CalcResult;
  tips?: ValueTip[];
  products?: ProductSuggestion[];
}

// ─── Форматирование ──────────────────────────────────────────────────────────

const RU = (n: number) =>
  Math.abs(Math.round(n)).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
const PCT = (n: number) => n.toFixed(1) + "%";
const PCTF = (n: number) => n.toFixed(2) + "%";

function extractNumber(s: string): number | null {
  const clean = s.replace(/[\s\u00a0]/g, "").toLowerCase();
  const m = clean.match(/([\d.,]+)(млн|миллион|тыс|тысяч|к\b)?/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(",", "."));
  if (!n || isNaN(n)) return null;
  if (m[2] === "млн" || m[2] === "миллион") n *= 1_000_000;
  else if (m[2] === "тыс" || m[2] === "тысяч" || m[2] === "к") n *= 1_000;
  return n;
}

function extractNumbers(q: string): number[] {
  const re = /([\d\s]+(?:[.,][\d]+)?)\s*(млн|миллион|тыс|тысяч|к\b|₽|руб)?/gi;
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    const n = extractNumber(m[0]);
    if (n && n > 0 && n < 1e10) nums.push(n);
  }
  return [...new Set(nums)].sort((a, b) => b - a);
}

function years(q: string): number | null {
  const m = q.match(/(\d+)\s*лет/i);
  return m ? parseInt(m[1]) : null;
}
function months(q: string): number | null {
  const m = q.match(/(\d+)\s*(месяц|мес\.?)/i);
  return m ? parseInt(m[1]) : null;
}
function rate(q: string): number | null {
  const m =
    q.match(/под\s*([\d.,]+)\s*%?/i) ||
    q.match(/([\d.,]+)\s*%\s*(год|ставк|проц)/i) ||
    q.match(/([\d.,]+)\s*процент/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

// ─── Парсер произвольных финансовых данных ────────────────────────────────────

interface FreeFormData {
  income?: number;
  rent?: number;
  food?: number;
  transport?: number;
  credit?: number;           // ежемесячный платёж по кредиту
  creditDebt?: number;       // общий долг
  utilities?: number;
  savings?: number;
  balance?: number;
  other?: number;
  rawNumbers: number[];
}

function parseFreeForm(q: string): FreeFormData | null {
  const lq = q.toLowerCase();
  const data: FreeFormData = { rawNumbers: extractNumbers(q) };

  const extract = (pattern: RegExp): number | undefined => {
    const m = q.match(pattern);
    return m ? extractNumber(m[1] + (m[2] || "")) || undefined : undefined;
  };

  data.income = extract(/(зарплат[аеы]?|доход|зп|оклад)\s*([\d\s.,]+(?:тыс|к|млн)?)/i);
  data.rent = extract(/(аренда|аренд[аеы]?|съём|снима[еютю]|квартир[аеы]?\s*(?:за|стоит))\s*([\d\s.,]+(?:тыс|к|млн)?)/i);
  data.food = extract(/(ед[а-я]*|продукт[а-я]*|питани[а-я]*|пропитани[а-я]*)\s*([\d\s.,]+(?:тыс|к|млн)?)/i);
  data.transport = extract(/(транспорт|проезд|такси|бензин|топлив[а-я]*)\s*([\d\s.,]+(?:тыс|к|млн)?)/i);
  data.utilities = extract(/(коммунал[а-я]*|жкх|электр[а-я]*|свет|газ|вода)\s*([\d\s.,]+(?:тыс|к|млн)?)/i);
  data.balance = extract(/(остаток|накоплен[а-я]*|сбережен[а-я]*|на счёт[а-я]*|на карт[а-я]*)\s*([\d\s.,]+(?:тыс|к|млн)?)/i);

  // Кредит — ежемесячный платёж
  const creditMatch = q.match(/(кредит|займ|долг)[а-я]*\s*([\d\s.,]+(?:тыс|к|млн)?)\s*(?:\/\s*мес|в\s*мес|мес)/i);
  if (creditMatch) data.credit = extractNumber(creditMatch[2]) || undefined;

  // Общий долг
  const debtMatch = q.match(/(долг|кредит|задолженност)[а-я]*\s*([\d\s.,]+(?:тыс|к|млн)?)/i);
  if (debtMatch && !data.credit) data.creditDebt = extractNumber(debtMatch[2]) || undefined;

  const hasAny = data.income || data.rent || data.food || data.credit || data.balance;
  if (!hasAny) return null;
  return data;
}

// ─── Калькуляторы ─────────────────────────────────────────────────────────────

function calcMortgage(price: number, down: number, r: number, y: number): CalcResult {
  const loan = price - down;
  const mr = r / 100 / 12;
  const n = y * 12;
  const pmt = mr > 0 ? (loan * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) : loan / n;
  const total = pmt * n;
  const overpay = total - loan;

  // Сравнение со ставкой 20% (рыночная)
  const mr20 = 20 / 100 / 12;
  const pmt20 = (loan * mr20 * Math.pow(1 + mr20, n)) / (Math.pow(1 + mr20, n) - 1);
  const total20 = pmt20 * n;
  const overpay20 = total20 - loan;

  // Сравнение со ставкой 6% (семейная)
  const mr6 = 6 / 100 / 12;
  const pmt6 = (loan * mr6 * Math.pow(1 + mr6, n)) / (Math.pow(1 + mr6, n) - 1);
  const overpay6 = pmt6 * n - loan;

  const saving20 = r < 20 ? overpay20 - overpay : 0;

  const rows: CalcResult["rows"] = [
    { label: "Стоимость жилья", value: RU(price) },
    { label: `Первоначальный взнос (${Math.round((down / price) * 100)}%)`, value: RU(down) },
    { label: "Сумма кредита", value: RU(loan) },
    { label: "Ставка", value: PCT(r) + " годовых" },
    { label: "Ежемесячный платёж", value: RU(pmt), highlight: true },
    { label: "Всего выплат за " + y + " лет", value: RU(total) },
    { label: "Переплата", value: RU(overpay), note: Math.round((overpay / loan) * 100) + "% от суммы кредита" },
  ];

  // Добавляем сравнительную таблицу
  if (r !== 20) {
    rows.push({ label: "── Сравнение ставок ──", value: "" });
    rows.push({ label: `При текущей ставке ${PCT(r)}`, value: RU(pmt) + "/мес · переплата " + RU(overpay), highlight: r < 10 });
    if (r !== 6) rows.push({ label: "Семейная/IT ипотека 6%", value: RU(pmt6) + "/мес · переплата " + RU(overpay6), highlight: true });
    rows.push({ label: "Рыночная ипотека 20%", value: RU(pmt20) + "/мес · переплата " + RU(overpay20) });
    if (saving20 > 5000) {
      rows.push({ label: "Экономия при льготной ставке", value: "≈" + RU(saving20), highlight: true, note: "vs рыночной 20%" });
    }
  }

  return {
    title: `Ипотека ${RU(price)} · ${y} лет · ${PCT(r)}`,
    rows,
    tip:
      r <= 6
        ? `Льготная ставка — вы экономите ${RU(saving20)} по сравнению с рыночной 20%. Подавайте одновременно в 3-5 банков.`
        : r <= 10
        ? `Льготная ставка. При семейной ипотеке 6% платёж был бы ${RU(pmt6)}/мес — на ${RU(pmt - pmt6)} меньше.`
        : `Рыночная ставка. Семейная ипотека (6%) даёт платёж ${RU(pmt6)}/мес и экономит ${RU(overpay - overpay6)} на переплате.`,
    links: [
      { label: "Семейная ипотека — Сбербанк", url: "https://www.sberbank.ru/ru/person/credits/home/family" },
      { label: "Все льготные программы — ДОМ.РФ", url: "https://xn--d1aqf.xn--p1ai/mortgage/" },
      { label: "IT-ипотека — ВТБ", url: "https://www.vtb.ru/personal/ipoteka/it/" },
    ],
  };
}

function calcDeposit(amount: number, r: number, m: number): CalcResult {
  const simple = amount * (r / 100) * (m / 12);
  const compound = amount * Math.pow(1 + r / 100 / 12, m) - amount;
  const taxFreeIncome = 150000 * 0.15 * (m / 12);
  const tax = compound > taxFreeIncome ? Math.round((compound - taxFreeIncome) * 0.13) : 0;
  const netCompound = compound - tax;

  // Сравнение вариантов: 3 мес, 6 мес, 12 мес
  const c3 = amount * Math.pow(1 + r / 100 / 12, 3) - amount;
  const c6 = amount * Math.pow(1 + r / 100 / 12, 6) - amount;
  const c12 = amount * Math.pow(1 + r / 100 / 12, 12) - amount;

  return {
    title: `Вклад ${RU(amount)} · ${m} мес · ${PCT(r)}`,
    rows: [
      { label: "Сумма вклада", value: RU(amount) },
      { label: "Ставка", value: PCT(r) + " годовых" },
      { label: "Срок", value: m + " месяцев" },
      { label: "Доход простые %", value: RU(simple) },
      { label: "Доход с капитализацией", value: RU(compound), highlight: true, note: "+" + RU(compound - simple) + " за счёт сложного %" },
      { label: "НДФЛ 13%", value: tax > 0 ? "~" + RU(tax) : "Не облагается" },
      { label: "Чистый доход", value: RU(netCompound), highlight: true },
      { label: "Итого на счёте", value: RU(amount + netCompound) },
      { label: "Страховка АСВ", value: amount <= 1_400_000 ? "✅ Полностью" : "⚠️ > 1,4 млн — разделите" },
      { label: "── Варианты срока при " + PCT(r) + " ──", value: "" },
      { label: "3 месяца", value: RU(c3) },
      { label: "6 месяцев", value: RU(c6), highlight: m === 6 },
      { label: "12 месяцев", value: RU(c12), highlight: m === 12 },
    ],
    tip: `Капитализация приносит на ${RU(compound - simple)} больше. Зафиксируйте ставку сейчас — ЦБ снизил ставку до 14,5%, к концу 2026 ожидается 12–13%.`,
    links: [
      { label: "Сравнить вклады — Сравни.ру", url: "https://www.sravni.ru/vklady/" },
      { label: "Финуслуги ЦБ — маркетплейс вкладов", url: "https://finuslugi.ru/" },
      { label: "Газпромбанк — до 16%", url: "https://www.gazprombank.ru/personal/increase/deposits/" },
    ],
  };
}

function calcIIS(amount: number, annualIncome: number): CalcResult {
  const base = Math.min(amount, 400_000);
  const ndfl = Math.round(annualIncome * 0.13);
  const ret = Math.min(base * 0.13, ndfl, 52_000);
  const ofzYield = Math.round(amount * 0.155);
  const totalYear = ret + ofzYield;
  const eff = (totalYear / amount) * 100;

  // 3-летняя стратегия
  const total3 = ret * 3 + amount * (Math.pow(1.155, 3) - 1);

  return {
    title: "ИИС тип А — инвестиционный вычет",
    rows: [
      { label: "Взнос на ИИС", value: RU(amount) },
      { label: "Ваш НДФЛ за год", value: RU(ndfl) },
      { label: "Возврат НДФЛ (13%)", value: RU(ret), highlight: true, note: "придёт на карту" },
      { label: "Доход от ОФЗ ~15,5%", value: "≈" + RU(ofzYield) },
      { label: "Итого за год", value: RU(totalYear), highlight: true },
      { label: "Эффективная доходность год 1", value: PCT(eff), note: "вычет + инвестиционный доход" },
      { label: "Накопленный доход за 3 года", value: "≈" + RU(total3), highlight: true, note: "вычет ×3 + рост ОФЗ" },
      { label: "Минимальный срок", value: "3 года (иначе вычет вернуть)" },
    ],
    tip: "ИИС — лучший законный способ увеличить доходность: государство доплачивает 13% сверху. Открытие бесплатно за 5 минут.",
    links: [
      { label: "Открыть ИИС — Т-Инвестиции", url: "https://www.tbank.ru/invest/iis/" },
      { label: "Подать вычет онлайн — ФНС", url: "https://lkfl2.nalog.ru/lkfl/login" },
    ],
  };
}

function calcVychet(type: "med" | "edu" | "prop", amount: number, annualIncome: number): CalcResult {
  const ndfl = Math.round(annualIncome * 0.13);
  const limits: Record<string, number> = { med: 150_000, edu: 150_000, prop: 2_000_000 };
  const base = Math.min(amount, limits[type]);
  const ret = Math.min(base * 0.13, ndfl);
  const taxRate = annualIncome > 5_000_000 ? 18 : annualIncome > 2_400_000 ? 15 : 13;
  const retActual = Math.min(base * (taxRate / 100), ndfl);

  const titles: Record<string, string> = {
    med: "Вычет за лечение",
    edu: "Вычет за образование",
    prop: "Вычет за покупку жилья",
  };

  const extras: Record<string, { label: string; value: string; note?: string }[]> = {
    med: [
      { label: "Что принести", value: "Справка 289 + договор + чеки" },
      { label: "Дорогостоящее лечение", value: "Нет лимита! 100% расходов" },
    ],
    edu: [
      { label: "За ребёнка до 24 лет", value: "ещё +6 500 ₽/год" },
      { label: "Очная форма", value: "Обязательно для вычета за ребёнка" },
    ],
    prop: [
      { label: "Максимум за квартиру", value: "260 000 ₽", note: "единоразово" },
      { label: "Вычет по ипотечным %", value: "ещё до 390 000 ₽" },
      { label: "ИТОГО с ипотечным вычетом", value: "до 650 000 ₽", note: "на одного человека" },
      { label: "На двоих супругов", value: "до 1 300 000 ₽" },
    ],
  };

  return {
    title: titles[type] + " — возврат НДФЛ",
    rows: [
      { label: "Сумма расходов", value: RU(amount) },
      { label: `Лимит базы`, value: RU(limits[type]) },
      { label: "База для расчёта", value: RU(base) },
      { label: `Ставка НДФЛ (${taxRate}%)`, value: PCTF(taxRate) },
      { label: "Возврат НДФЛ", value: RU(retActual), highlight: true },
      ...(extras[type] || []),
    ],
    tip: "Подайте 3-НДФЛ онлайн на nalog.ru — займёт 5-10 минут. Деньги придут через 30-90 дней. Сохраняйте все чеки и договоры в папку.",
    links: [
      { label: "Личный кабинет ФНС", url: "https://lkfl2.nalog.ru/lkfl/login" },
      { label: "Инструкция по вычетам — Консультант+", url: "https://www.consultant.ru/law/ref/ju_dict/word/nalogovyj_vychet/" },
    ],
  };
}

function calcBudget(income: number, extraExpenses?: { rent?: number; food?: number; transport?: number; credit?: number; utilities?: number }): CalcResult {
  const rent = extraExpenses?.rent || 0;
  const food = extraExpenses?.food || 0;
  const transport = extraExpenses?.transport || 0;
  const credit = extraExpenses?.credit || 0;
  const utilities = extraExpenses?.utilities || 0;

  const knownExpenses = rent + food + transport + credit + utilities;
  const mandatory50 = income * 0.5;
  const wants30 = income * 0.3;
  const savings20 = income * 0.2;

  const actualSavings = Math.max(0, income - knownExpenses);
  const savingsRate = income > 0 ? (actualSavings / income) * 100 : 0;
  const monthsToPillow = savings20 > 0 ? Math.ceil((income * 3) / savings20) : 0;

  const rows: CalcResult["rows"] = [
    { label: "Ежемесячный доход", value: RU(income), highlight: true },
  ];

  if (knownExpenses > 0) {
    if (rent) rows.push({ label: "Аренда жилья", value: RU(rent) });
    if (food) rows.push({ label: "Продукты и питание", value: RU(food) });
    if (transport) rows.push({ label: "Транспорт", value: RU(transport) });
    if (utilities) rows.push({ label: "ЖКХ / коммунальные", value: RU(utilities) });
    if (credit) rows.push({ label: "Кредит/долги", value: RU(credit) });
    rows.push({ label: "Итого известных трат", value: RU(knownExpenses) });
    rows.push({ label: "Остаток (свободные деньги)", value: RU(actualSavings), highlight: true, note: PCT(savingsRate) + " от дохода" });
    rows.push({ label: "── Норма 50/30/20 ──", value: "" });
  }

  rows.push({ label: "Обязательные расходы (50%)", value: RU(mandatory50), note: "жильё, еда, транспорт, связь" });
  rows.push({ label: "Желания / личное (30%)", value: RU(wants30), note: "кафе, одежда, развлечения" });
  rows.push({ label: "Сбережения (20%)", value: RU(savings20), highlight: true });
  rows.push({ label: "Цель — подушка 3 мес", value: RU(income * 3) });
  if (monthsToPillow > 0) {
    rows.push({ label: "Срок накопления подушки", value: monthsToPillow + " мес при откладывании 20%" });
  }

  return {
    title: `Бюджет ${RU(income)}/мес${knownExpenses > 0 ? " — детальный анализ" : " — правило 50/30/20"}`,
    rows,
    tip: `Главный секрет: настройте автоперевод ${RU(savings20)} в день зарплаты. Деньги которых нет — не тратятся.`,
    links: [
      { label: "Накопительный счёт — Т-Банк", url: "https://www.tbank.ru/savings/" },
      { label: "Сравнить накопительные счета", url: "https://www.sravni.ru/nakopitelnyj-schet/" },
    ],
  };
}

function calcDebt(balance: number, r: number, payment: number): CalcResult {
  const mr = r / 100 / 12;

  // Базовый вариант
  let bal = balance, totalPaid = 0, m = 0;
  while (bal > 0 && m < 600) {
    const interest = bal * mr;
    const principal = payment - interest;
    if (principal <= 0) { m = 9999; break; }
    totalPaid += payment;
    bal = Math.max(0, bal - principal);
    m++;
  }

  // +20% к платежу
  const pmt120 = payment * 1.2;
  let bal2 = balance, total2 = 0, m2 = 0;
  while (bal2 > 0 && m2 < 600) {
    const i = bal2 * mr;
    const p = pmt120 - i;
    if (p <= 0) break;
    total2 += pmt120;
    bal2 = Math.max(0, bal2 - p);
    m2++;
  }

  // +50% к платежу
  const pmt150 = payment * 1.5;
  let bal3 = balance, total3 = 0, m3 = 0;
  while (bal3 > 0 && m3 < 600) {
    const i = bal3 * mr;
    const p = pmt150 - i;
    if (p <= 0) break;
    total3 += pmt150;
    bal3 = Math.max(0, bal3 - p);
    m3++;
  }

  const minPmt = Math.ceil(balance * mr + balance * 0.01);

  return {
    title: `Кредит ${RU(balance)} · ${PCT(r)} · платёж ${RU(payment)}/мес`,
    rows: [
      { label: "Сумма долга", value: RU(balance) },
      { label: "Ставка", value: PCT(r) + " годовых" },
      { label: "Текущий платёж", value: RU(payment) + "/мес" },
      { label: "Срок при текущем платеже", value: m >= 9999 ? "❌ Платёж < начисленных %" : m + " мес (" + (m / 12).toFixed(1) + " лет)", highlight: true },
      { label: "Всего выплат (текущий платёж)", value: m < 9999 ? RU(totalPaid) : "—" },
      { label: "Переплата %", value: m < 9999 ? RU(totalPaid - balance) : "—" },
      { label: "── Ускоренное погашение ──", value: "" },
      { label: `Платить +20% (${RU(pmt120)}/мес)`, value: m2 + " мес · экономия " + (m < 9999 ? (m - m2) + " мес" : "—"), highlight: true, note: m2 > 0 ? "Переплата: " + RU(total2 - balance) : "" },
      { label: `Платить +50% (${RU(pmt150)}/мес)`, value: m3 + " мес · экономия " + (m < 9999 ? (m - m3) + " мес" : "—"), highlight: true, note: m3 > 0 ? "Переплата: " + RU(total3 - balance) : "" },
      { label: "Минимальный платёж для погашения", value: RU(minPmt) + "/мес" },
    ],
    tip: "Стратегия лавина: минимум по всем долгам, максимум — на самый дорогой. Экономит больше всего на процентах.",
    links: [
      { label: "Рефинансирование — Т-Банк", url: "https://www.tbank.ru/loans/refinancing/" },
      { label: "Рефинансирование — Сбербанк", url: "https://www.sberbank.ru/ru/person/credits/money/refinancing" },
    ],
  };
}

// ─── Калькулятор пенсионного накопления ──────────────────────────────────────

function calcPension(monthlyContrib: number, years: number, r: number): CalcResult {
  const mr = r / 100 / 12;
  const n = years * 12;
  const fv = monthlyContrib * ((Math.pow(1 + mr, n) - 1) / mr);
  const fv2 = monthlyContrib * 2 * ((Math.pow(1 + mr, n) - 1) / mr);
  const fv3 = (monthlyContrib * 3) * ((Math.pow(1 + mr, n) - 1) / mr);
  const totalContrib = monthlyContrib * n;

  return {
    title: `Пенсионный капитал · ${RU(monthlyContrib)}/мес · ${years} лет · ${PCT(r)}`,
    rows: [
      { label: "Взнос в месяц", value: RU(monthlyContrib) },
      { label: "Ставка (ИИС+ОФЗ)", value: PCT(r) },
      { label: "Горизонт", value: years + " лет" },
      { label: "Всего вложите", value: RU(totalContrib) },
      { label: "Капитал к цели", value: RU(fv), highlight: true },
      { label: `Если откладывать × 2 (${RU(monthlyContrib * 2)}/мес)`, value: RU(fv2) },
      { label: `Если откладывать × 3 (${RU(monthlyContrib * 3)}/мес)`, value: RU(fv3) },
      { label: "Прибыль от инвестиций", value: RU(fv - totalContrib), highlight: true, note: "деньги делают деньги" },
    ],
    tip: `Главный закон: начните как можно раньше. Каждый год промедления стоит ${RU(monthlyContrib * 12 * years * 0.15 / 10)} накопленного капитала.`,
    links: [{ label: "Открыть ИИС — Т-Инвестиции", url: "https://www.tbank.ru/invest/iis/" }],
  };
}

// ─── Анализ произвольных финансовых данных пользователя ──────────────────────

function analyzeFreeFormData(fd: FreeFormData, ctx: KashikContext): KashikResponse {
  const income = fd.income || ctx.monthlyIncome || 0;
  if (!income) {
    return {
      text: "Вижу несколько цифр, но не нашёл доход. Уточните формат:\n\nзарплата 120 000, аренда 35 000, кредит 15 000/мес, остаток 80 000",
    };
  }

  const rent = fd.rent || 0;
  const food = fd.food || 0;
  const transport = fd.transport || 0;
  const credit = fd.credit || 0;
  const utilities = fd.utilities || 0;
  const balance = fd.balance || ctx.totalBalance || 0;

  const knownExpenses = rent + food + transport + credit + utilities;
  const free = income - knownExpenses;
  const savingsRate = income > 0 ? Math.round((free / income) * 100) : 0;
  const debtLoad = income > 0 ? Math.round((credit / income) * 100) : 0;

  const lines: string[] = [];
  lines.push(`**Анализ вашего бюджета** — вот что вижу:`);
  lines.push(`\n**Доход:** ${RU(income)}/мес`);

  if (knownExpenses > 0) {
    lines.push(`\n**Расходы:**`);
    if (rent) lines.push(`• Аренда: ${RU(rent)} (${Math.round((rent / income) * 100)}% дохода)`);
    if (food) lines.push(`• Еда: ${RU(food)} (${Math.round((food / income) * 100)}%)`);
    if (transport) lines.push(`• Транспорт: ${RU(transport)}`);
    if (utilities) lines.push(`• ЖКХ: ${RU(utilities)}`);
    if (credit) lines.push(`• Кредит: ${RU(credit)}/мес (${debtLoad}% дохода)`);
    lines.push(`• **Итого известных трат: ${RU(knownExpenses)}**`);
    lines.push(`• **Свободные деньги: ${RU(free)} (${savingsRate}% дохода)**`);
  }

  // Диагностика
  lines.push(`\n**Диагностика:**`);

  // Долговая нагрузка
  if (debtLoad > 50) {
    lines.push(`🔴 **Долговая нагрузка ${debtLoad}% — критически высокая.** Банки не одобряют кредиты при нагрузке > 50%. Нужна срочная стратегия снижения.`);
  } else if (debtLoad > 30) {
    lines.push(`🟡 **Долговая нагрузка ${debtLoad}%** — допустимо, но высоковато. Норма до 30%. Новые кредиты не рекомендуются.`);
  } else if (credit > 0) {
    lines.push(`✅ **Долговая нагрузка ${debtLoad}%** — в пределах нормы (до 30%).`);
  }

  // Аренда
  if (rent > 0) {
    const rentPct = Math.round((rent / income) * 100);
    if (rentPct > 35) lines.push(`🔴 **Аренда ${rentPct}% дохода** — выше нормы 30%. Рассмотрите переезд или покупку жилья (семейная ипотека 6%).`);
    else if (rentPct > 25) lines.push(`🟡 **Аренда ${rentPct}% дохода** — на верхней границе нормы.`);
    else lines.push(`✅ **Аренда ${rentPct}% дохода** — в норме.`);
  }

  // Норма сбережений
  if (savingsRate < 5) {
    lines.push(`🔴 **Норма сбережений ${savingsRate}%** — почти ничего не остаётся. Нужно сокращать расходы или повышать доход.`);
  } else if (savingsRate < 10) {
    lines.push(`🟡 **Норма сбережений ${savingsRate}%** — мало. Цель минимум 10%, хорошо 20%.`);
  } else if (savingsRate < 20) {
    lines.push(`🟢 **Норма сбережений ${savingsRate}%** — неплохо. Можно довести до 20%.`);
  } else {
    lines.push(`✅ **Норма сбережений ${savingsRate}%** — отлично! Выше среднего по России.`);
  }

  // Подушка безопасности
  if (balance > 0) {
    const pillowMonths = knownExpenses > 0 ? (balance / knownExpenses).toFixed(1) : "?";
    const pillowTarget = income * 3;
    if (balance < pillowTarget * 0.5) {
      lines.push(`🟡 **Подушка ${RU(balance)}** (~${pillowMonths} мес расходов). Цель: ${RU(pillowTarget)} (3 месяца дохода).`);
    } else if (balance < pillowTarget) {
      lines.push(`🟢 **Подушка ${RU(balance)}** — на пути к цели ${RU(pillowTarget)}.`);
    } else {
      lines.push(`✅ **Подушка ${RU(balance)}** — сформирована! Можно инвестировать излишек.`);
    }
  }

  // Конкретные рекомендации
  lines.push(`\n**Что делать прямо сейчас (по приоритету):**`);

  let step = 1;

  if (credit > 0 && debtLoad > 30) {
    lines.push(`${step++}. **Снизить долговую нагрузку.** При ${RU(credit)}/мес и ставке ~20% — проверьте рефинансирование. Если ставка ниже на 2%+ — выгодно.`);
  }

  if (free > 0) {
    const autoSave = Math.round(free * 0.5);
    lines.push(`${step++}. **Автоперевод ${RU(autoSave)}/мес** на накопительный счёт в день зарплаты (Газпромбанк 15%, Т-Банк 14,5%).`);
  }

  if (income > 0) {
    const iisRet = Math.min(52000, Math.round(income * 12 * 0.13));
    lines.push(`${step++}. **ИИС тип А** — государство вернёт ${RU(iisRet)}/год от вашего НДФЛ. Открытие бесплатное.`);
  }

  if (!rent && income > 80000) {
    lines.push(`${step++}. **Кешбэк-карты** — при тратах ~${RU(knownExpenses || income * 0.7)}/мес правильные карты вернут ${RU(Math.round((knownExpenses || income * 0.7) * 0.025))}/мес.`);
  }

  const calcResult = calcBudget(income, { rent, food, transport, credit, utilities });

  return {
    text: lines.join("\n"),
    calcResult,
    tips: getTips({ ...ctx, monthlyIncome: income, totalBalance: balance }),
    products: getProducts({ ...ctx, monthlyIncome: income, hasDebts: credit > 0, debtTotal: credit * 24 }, "budget"),
  };
}

// ─── База знаний ─────────────────────────────────────────────────────────────

const KB: Record<string, string> = {

mortgage: `**Ипотека в России — актуально март 2026**

**Льготные программы:**

🏠 **Семейная ипотека — 6%**
Семьи с детьми до 18 лет (с февраля 2026 — один кредит на семью)
Теперь доступна на **вторичном рынке** в 891 городе
Лимит: 12 млн ₽ (МСК/СПб), 6 млн ₽ (регионы)
Срок программы: до 2030 года

💻 **IT-ипотека — до 6%**
Сотрудники аккредитованных IT-компаний, зарплата от 150 000 ₽/мес
Лимит до 9 млн ₽, только первичка

🌾 **Сельская ипотека — 3%** (работники АПК, стаж 5+ лет, лимит 6 млн ₽)

❄️ **Дальневосточная/Арктическая — 2%** (ДФО и Арктика, до 35 лет)

**Рыночная ипотека:** от 19-22% при ключевой ставке 14,5%
Переплата на 5 млн / 20 лет: **~8-10 млн ₽** (против ~2,5 млн при 6%)

**Как рассчитать максимальный кредит:**
Платёж ≤ 40-50% дохода семьи. Доход 150 000/мес → максимальный платёж 60 000-75 000 ₽ → кредит ~6-7 млн под 6%

**Совет:** Подавайте в 3-5 банков одновременно — все запросы за 30 дней считаются одним для кредитной истории.`,

deposits: `**Вклады и накопительные счета — апрель 2026**

ЦБ снизил ключевую ставку до **14,5%** 25 апреля 2026 (третье снижение с пика 21% в октябре 2024). Ставки по вкладам будут снижаться в течение 1-2 недель.

**Актуальные ставки (banki.ru, апрель 2026):**

| Банк | Продукт | Ставка | Срок |
|------|---------|--------|------|
| Т-Банк | ОнлайнТоп | **до 17%** | 3 мес |
| Газпромбанк | Ваш выбор | **до 16,5%** | 6 мес |
| МКБ | МКБ.Преимущество+ | **16,5%** | 3 мес |
| ВТБ | Надёжный | **16,5%** | 6 мес |
| ПСБ | Мой доход | **16%** | 9 мес |
| Альфа-Банк | Альфа-Вклад | **16%** | 12 мес |

**Накопительные счета (деньги доступны в любой момент):**
• Газпромбанк: 15%/год
• Т-Банк: 14,5%/год
• Альфа-Банк: 15% первые 2 мес, потом ~11%

**Прогноз:** К концу 2026 ставки упадут до 12-13%. **Окно для фиксации закрывается — открывайте вклад на 6-12 мес прямо сейчас.**

**Страхование АСВ:** до 1 400 000 ₽ на один банк. Суммы больше — делите по банкам.

Источники: banki.ru, sravni.ru/vklady, finuslugi.ru`,

invest: `**Инвестиции — что делать после снижения КС 14,5% (апрель 2026)**

**Без риска:**
• **ОФЗ** — государственные облигации, 14-15%, торгуются на Мосбирже. При снижении КС — вырастут в цене
• **БПИФ Ликвидность (LQDT)** — фонд денежного рынка, ~14-14,5%, продаётся в любой момент
• **Накопительный счёт** — 14,5-15%, без риска

**Консервативно:**
• Корпоративные облигации (Газпром, Сбер, Лукойл): 15-17%
• БПИФ облигаций — диверсификация автоматически

**Умеренный риск (долгосрочно):**
• БПИФ акций — индекс МосБиржи (снижение ставки исторически толкает акции вверх)
• Горизонт: 5-10+ лет

**ИИС тип 3:** +13% к вложениям от государства (до 52 000 ₽/год на взнос до 400 000 ₽)

**Стратегия апрель 2026 (снижающаяся ставка):**
• 1. Зафиксировать вклад 16-17% на 12 мес — **прямо сейчас** (окно закрывается)
• 2. Купить длинные ОФЗ (10+ лет) через ИИС — вырастут при снижении ставки
• 3. БПИФ акций Мосбиржи — долгосрочно, при снижении ставок рынок растёт
• 4. Резерв 10% на накопительном счёте — ликвидность`,

taxes: `**Налоги и вычеты — полное руководство 2026**

**НДФЛ (прогрессивная шкала с 2025):**
• До 2 400 000 ₽/год (200 000 ₽/мес) → **13%**
• 2,4-5 млн → 15%
• 5-20 млн → 18%
• 20-50 млн → 20%
• Свыше 50 млн → 22%

Повышенный % только с суммы **сверх порога**.

**Социальные вычеты (суммарно до 150 000 ₽/год = до 19 500 ₽ возврата):**
• Лечение (стоматология, операции, анализы, лекарства по рецепту)
• Образование (курсы, университет, автошкола)
• Фитнес и спорт (секции с лицензией)

**Имущественный вычет при покупке жилья:**
• Основной: до 260 000 ₽ (база 2 млн)
• Ипотечные %: до 390 000 ₽ (база 3 млн)
• Итого: до **650 000 ₽** на человека (на двоих: до 1 300 000 ₽)

**ИИС тип А:** до 52 000 ₽/год

**Как подать (5 минут онлайн):**
1. lkfl2.nalog.ru → войти через Госуслуги
2. Декларации → 3-НДФЛ → автозаполнение
3. Загрузить справки, подписать ЭП (создаётся там же)
Деньги через 30-90 дней.`,

cashback: `**Лучшие карты для кешбэка — март 2026**

🛒 **Продукты/супермаркеты:**
• Ozon Карта (Ozon Банк) — 7% на Ozon + 3% супермаркеты, **бесплатно**
• Т-Банк Блэк — до 5% выбранные категории + 1% на всё
• Польза (Хоум Банк) — 3% на всё покупки

⛽ **АЗС и топливо:**
• Альфа CashBack — **10% на АЗС** (макс. 2 000 ₽/мес), бесплатно при обороте 10 000 ₽
• Газпромбанк Умная карта — 5% на топливо

🍽️ **Кафе и рестораны:**
• Альфа CashBack — **5% в кафе**
• Т-Банк — до 5% категория по выбору

🛍️ **Рассрочка без %:**
• Халва (Совкомбанк) — рассрочка 0% у 250 000+ партнёров, кешбэк 6%

**Стратегия максимальной выгоды:**
Ozon (продукты) + Альфа (АЗС + кафе) + любая 1% (остальное)
При тратах 80 000 ₽/мес → **2 000-4 500 ₽/мес = 24 000-54 000 ₽/год**`,

fraud: `**Мошенники — схемы 2026 и как защититься**

По данным ЦБ: в 2025 украдено **27 млрд ₽**, рост 30%.

**Топ-5 схем 2026:**

1. **Безопасный счёт** — ваши деньги в опасности, переведите на защищённый счёт. Банки и ЦБ НИКОГДА так не делают.

2. **Инвестиции с гарантией 30-50%** — фейковые платформы. Проверяйте лицензию на cbr.ru.

3. **Удалённый доступ** — просят установить TeamViewer, AnyDesk. После установки — деньги уходят.

4. **Компенсация/выигрыш** — требуют заплатить налог перед получением. Это всегда обман.

5. **Фишинг через маркетплейсы** — поддельные сообщения Ozon/WB с фейковой ссылкой.

**При звонке:** Кладите трубку. Перезвоните в банк по номеру с официального сайта.
Никогда не называйте: CVV, коды из СМС, полный номер карты.

**Если деньги ушли:**
1. Звонок в банк (24/7) — заявление о несанкционированной операции
2. Заявление в полицию
3. Банк обязан рассмотреть за 30 дней

Проверка лицензий: cbr.ru`,

fz115: `**115-ФЗ — блокировки счетов и как не попасть**

**Почему блокируют:**
• Много наличных операций без объяснения источника
• Транзиты: получил — сразу перевёл дальше
• Крупные суммы без соответствующей бизнес-истории
• Нерегулярный оборот не соответствует виду деятельности

**Порядок действий при блокировке:**
1. Запросить официальное основание
2. Подготовить: договоры, акты, счета-фактуры, декларации, выписки
3. Подать в банк — 10 рабочих дней на рассмотрение
4. Отказали → Межведомственная комиссия ЦБ: cbr.ru
5. Последнее — суд

**Как не попасть:**
• Комментарии к платежам должны совпадать с реальностью
• ИП/самозанятые: сохраняйте все чеки из Мой налог
• Не снимайте большие суммы наличных регулярно
• При обороте > 600 000 ₽/год — готовьтесь к запросам

Жалоба на банк: cbr.ru/reception или 8-800-300-30-00`,

debt: `**Стратегии выхода из долгов**

🔥 **Лавина** (математически выгоднее):
Минимум по всем → весь свободный платёж на долг с **наивысшей ставкой**
*Экономит больше всего на процентах*

❄️ **Снежный ком** (психологически проще):
Минимум по всем → весь свободный платёж на долг с **наименьшим остатком**
*Удобен если много мелких долгов*

**Рефинансирование — выгодно когда:**
• Разница ставок ≥ 2-3%
• Оставшийся срок ≥ 2 лет
• Нет штрафов за досрочное погашение

**Кредитные каникулы (ФЗ-106):**
• До 6 месяцев отсрочки при снижении дохода на 30%+
• Не портит кредитную историю
• Заявление в банк — без суда

**Нормы долговой нагрузки:**
• Комфортно: до 30% дохода
• Допустимо: до 50%
• Критично: > 50% — нужна срочная стратегия`,

budget: `**Как управлять бюджетом — конкретные советы**

**Правило 50/30/20:**
• 50% → обязательные: жильё, еда, транспорт, связь, коммуналка
• 30% → желания: кафе, одежда, развлечения, хобби
• 20% → сбережения и инвестиции

**Главный секрет:** Сначала отложи, потом трать.
Автоперевод в день зарплаты → деньги которых нет не будут потрачены.

**5 способов сэкономить без страданий:**
1. **Кешбэк-карты** — 2 000-4 500 ₽/мес пассивно при правильном выборе
2. **Аудит подписок** — повторяющиеся списания в выписке: 1 500-3 000 ₽/мес призраков
3. **Продукты по списку** — закупка раз в неделю строго по списку: -15-20% расходов
4. **Сравнение цен** — Яндекс.Маркет, Ozon, WB перед покупкой: -10-30%
5. **Лимиты по категориям** — выберите одну больную категорию и ограничьте

**Финансовая подушка:**
Цель: 3-6 месяцев расходов. Где: накопительный счёт (14,5%+) или короткие ОФЗ.`,

cushion: `**Финансовая подушка безопасности**

**Сколько нужно:**
• Минимум: 3 месяца расходов
• Оптимально: 6 месяцев
• Для предпринимателей: 6-12 месяцев

**Где хранить:**
• Накопительный счёт (Газпромбанк 15%, Т-Банк 14,5%) — доступны в любой момент
• Короткие ОФЗ (15-16%) — чуть выше доходность, вывод 1-3 дня
• НЕ в акциях — могут упасть именно когда нужны

**Как накопить быстро:**
1. Автоперевод 10-20% в день зарплаты
2. Все случайные деньги (премии, подарки) → на счёт
3. Назовите счёт Свобода

Это не инвестиции — это страховка. Трогать только при потере дохода, срочном лечении или критическом ремонте.`,

pension: `**Пенсия — как накопить самостоятельно**

Государственная пенсия: ~22 000 ₽/мес в среднем. Нужен личный капитал.

**Инструменты:**

**1. ИИС тип А + ОФЗ** — лучший старт:
• Государство возвращает 13% = до 52 000 ₽/год
• ОФЗ ~14-15% — деньги растут
• Эффективная доходность: 20-28% в первые 3 года

**2. Долгосрочные инвестиции:**
• БПИФ акций — 15-20%/год исторически на горизонте 10+ лет
• Реинвестируйте дивиденды — это ускоряет рост

**Правило сложного %:**
5 000 ₽/мес × 30 лет при 14,5% → **~22 млн ₽**
15 000 ₽/мес × 30 лет при 14,5% → **~67 млн ₽**

Начните с маленького — главное начать сегодня, а не когда будет больше денег.`,

entrepreneur: `**Самозанятость и ИП — налоги и учёт 2026**

**Самозанятый (НПД):**
• 4% с физлиц, 6% от юрлиц/ИП
• Лимит: 2 400 000 ₽/год
• Страховые взносы: НЕТ
• Приложение Мой налог — каждый платёж регистрировать

**ИП на УСН Доходы 6%:**
• Фиксированные взносы 2026: ~53 000 ₽/год
• При доходе до 880 000 ₽: взносы вычитаются из налога (налог = 0!)
• +1% с дохода свыше 300 000 ₽/год

**Сравнение при доходе 1 500 000 ₽/год:**
• Самозанятый (от физлиц): 60 000 ₽ налогов
• ИП УСН 6%: 37 000 ₽ налог + 53 000 ₽ взносы = 90 000 ₽

Самозанятость выгоднее при доходе до ~1,5 млн/год от физлиц.`,

family: `**Семейные льготы и маткапитал 2026**

**Материнский капитал:**
• На 1-го ребёнка: 677 000 ₽
• На 2-го и последующих: +218 000 ₽ (итого 895 000 ₽)
• Использование: ипотека, образование, пенсия мамы

**Стандартный налоговый вычет для родителей:**
• 1-й и 2-й ребёнок: 1 400 ₽/мес (уменьшает НДФЛ на 182 ₽/мес)
• 3-й и более: 3 000 ₽/мес
• Ребёнок-инвалид: 12 000 ₽/мес
Подайте заявление работодателю — это бесплатно и автоматически

**Семейная ипотека 6%** — детям до 18 лет → вы в программе

**Единое пособие на детей до 17 лет** — зависит от дохода семьи
Проверьте право на Госуслугах — возможно получаете не всё

**Компенсации на детский сад:** 20-70% (зависит от региона)
**Сертификат допобразования:** до 30 000 ₽/год на кружки`,

};

// ═══════════════════════════════════════════════════════════════════════════════
// ║  ML-POWERED FINANCIAL ENGINES  ║
// ║  Monte Carlo · Health Scoring · Portfolio · Risk · Tax Optimizer         ║
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Monte Carlo Simulation for Investment Forecasting ────────────────────
// Симулирует тысячи случайных сценариев рыночной доходности
// для прогноза вероятных исходов инвестиций

interface MonteCarloResult {
  median: number;
  optimistic: number;
  pessimistic: number;
  scenarios: { pct: number; value: number }[];
  successRate: number;
}

function monteCarloSimulation(
  initialAmount: number,
  monthlyContrib: number,
  years: number,
  expectedReturn: number,
  volatility: number,
  goalAmount?: number
): MonteCarloResult {
  const N_SIMULATIONS = 5000;
  const mr = expectedReturn / 100 / 12;
  const vol = volatility / 100 / Math.sqrt(12);
  const n = years * 12;
  const finalValues: number[] = [];
  for (let sim = 0; sim < N_SIMULATIONS; sim++) {
    let value = initialAmount;
    for (let m = 0; m < n; m++) {
      const monthlyReturn = mr + vol * gaussianRandom();
      value = value * (1 + monthlyReturn) + monthlyContrib;
    }
    finalValues.push(value);
  }
  finalValues.sort((a, b) => a - b);
  const median = finalValues[Math.floor(N_SIMULATIONS * 0.5)];
  const optimistic = finalValues[Math.floor(N_SIMULATIONS * 0.9)];
  const pessimistic = finalValues[Math.floor(N_SIMULATIONS * 0.1)];
  const successRate = goalAmount
    ? (finalValues.filter(v => v >= goalAmount).length / N_SIMULATIONS) * 100
    : 100;
  return {
    median, optimistic, pessimistic,
    scenarios: [
      { pct: 5, value: finalValues[Math.floor(N_SIMULATIONS * 0.05)] },
      { pct: 10, value: pessimistic },
      { pct: 25, value: finalValues[Math.floor(N_SIMULATIONS * 0.25)] },
      { pct: 50, value: median },
      { pct: 75, value: finalValues[Math.floor(N_SIMULATIONS * 0.75)] },
      { pct: 90, value: optimistic },
      { pct: 95, value: finalValues[Math.floor(N_SIMULATIONS * 0.95)] },
    ],
    successRate,
  };
}

function gaussianRandom(): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// ─── 2. ML-like Financial Health Scoring ──────────────────────────────────────

interface HealthScore {
  total: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  factors: { name: string; score: number; weight: number; status: "green" | "yellow" | "red"; detail: string }[];
  recommendations: string[];
}

function computeFinancialHealth(ctx: KashikContext): HealthScore | null {
  const inc = ctx.monthlyIncome || 0;
  const bal = ctx.totalBalance || 0;
  const exp = ctx.totalExpenses || 0;
  const sr = ctx.savingsRate ?? -1;
  const hasDebts = ctx.hasDebts;
  const debtTotal = ctx.debtTotal || 0;
  if (!inc && !bal) return null;
  const factors: HealthScore["factors"] = [];
  const recommendations: string[] = [];

  // Factor 1: Savings rate
  let srScore = 0;
  if (sr < 0) srScore = 40;
  else if (sr >= 20) { srScore = 100; factors.push({ name: "Норма сбережений", score: 100, weight: 30, status: "green", detail: `${sr}% — отлично` }); }
  else if (sr >= 15) { srScore = 80; factors.push({ name: "Норма сбережений", score: 80, weight: 30, status: "green", detail: `${sr}% — хорошо` }); }
  else if (sr >= 10) { srScore = 60; factors.push({ name: "Норма сбережений", score: 60, weight: 30, status: "yellow", detail: `${sr}% — можно улучшить` }); }
  else if (sr >= 5) { srScore = 35; factors.push({ name: "Норма сбережений", score: 35, weight: 30, status: "red", detail: `${sr}% — низко` }); }
  else { srScore = 15; factors.push({ name: "Норма сбережений", score: 15, weight: 30, status: "red", detail: `${sr}% — критично` }); }
  if (srScore < 50) recommendations.push("Настройте автоперевод 20% дохода на накопительный счёт");

  // Factor 2: Cushion
  let cushionScore = 0;
  if (inc > 0) {
    const cm = bal / inc;
    if (cm >= 6) { cushionScore = 100; factors.push({ name: "Подушка", score: 100, weight: 25, status: "green", detail: `${cm.toFixed(1)} мес.` }); }
    else if (cm >= 3) { cushionScore = 80; factors.push({ name: "Подушка", score: 80, weight: 25, status: "green", detail: `${cm.toFixed(1)} мес.` }); }
    else if (cm >= 1.5) { cushionScore = 55; factors.push({ name: "Подушка", score: 55, weight: 25, status: "yellow", detail: `${cm.toFixed(1)} мес.` }); }
    else if (cm >= 0.5) { cushionScore = 30; factors.push({ name: "Подушка", score: 30, weight: 25, status: "red", detail: `${cm.toFixed(1)} мес.` }); }
    else { cushionScore = 10; factors.push({ name: "Подушка", score: 10, weight: 25, status: "red", detail: "Отсутствует" }); }
    if (cushionScore < 50) recommendations.push("Сформируйте подушку безопасности 3-6 мес.");
  } else {
    cushionScore = 40;
    factors.push({ name: "Подушка", score: 40, weight: 25, status: "yellow", detail: "Нет данных" });
  }

  // Factor 3: Debt
  let debtScore = 100;
  if (hasDebts && inc > 0) {
    const dti = (debtTotal / (inc * 12)) * 100;
    if (dti <= 10) { debtScore = 90; factors.push({ name: "Долги", score: 90, weight: 20, status: "green", detail: `${dti.toFixed(0)}%` }); }
    else if (dti <= 25) { debtScore = 70; factors.push({ name: "Долги", score: 70, weight: 20, status: "green", detail: `${dti.toFixed(0)}%` }); }
    else if (dti <= 40) { debtScore = 50; factors.push({ name: "Долги", score: 50, weight: 20, status: "yellow", detail: `${dti.toFixed(0)}%` }); }
    else if (dti <= 60) { debtScore = 30; factors.push({ name: "Долги", score: 30, weight: 20, status: "red", detail: `${dti.toFixed(0)}%` }); }
    else { debtScore = 10; factors.push({ name: "Долги", score: 10, weight: 20, status: "red", detail: `${dti.toFixed(0)}%` }); }
    if (debtScore < 50) recommendations.push("Рассмотрите рефинансирование для снижения ставки");
  } else {
    factors.push({ name: "Долги", score: 100, weight: 20, status: "green", detail: "Нет долгов" });
  }

  // Factor 4: Income stability
  const isScore = inc > 100000 ? 85 : inc > 50000 ? 70 : inc > 0 ? 55 : 30;
  factors.push({ name: "Доход", score: isScore, weight: 15, status: isScore >= 70 ? "green" : isScore >= 50 ? "yellow" : "red", detail: inc > 0 ? `~${RU(inc)}/мес` : "Нет данных" });

  // Factor 5: Category awareness
  const cats = ctx.topCategories || [];
  const catScore = cats.length >= 3 ? 80 : cats.length > 0 ? 60 : 40;
  factors.push({ name: "Контроль", score: catScore, weight: 10, status: catScore >= 70 ? "green" : catScore >= 50 ? "yellow" : "red", detail: cats.length >= 3 ? `${cats.length} категорий` : "Нет данных" });

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const total = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
  const grade: HealthScore["grade"] = total >= 90 ? "A+" : total >= 80 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : total >= 35 ? "D" : "F";
  return { total, grade, factors, recommendations };
}

// ─── 3. Portfolio Optimization ────────────────────────────────────────────────

interface PortfolioAllocation {
  instrument: string;
  percent: number;
  expectedReturn: number;
  risk: "low" | "medium" | "high";
  description: string;
  amount: number;
}

function optimizePortfolio(
  amount: number,
  riskTolerance: "conservative" | "moderate" | "aggressive" = "moderate",
  timeHorizonYears: number = 3
): { allocations: PortfolioAllocation[]; expectedReturn: number; expectedAmount: number; recommendation: string } {
  const portfolios: Record<string, PortfolioAllocation[]> = {
    conservative: [
      { instrument: "Вклад до 16%", percent: 50, expectedReturn: 16, risk: "low", description: "АСВ 1,4 млн", amount: 0 },
      { instrument: "ОФЗ (длинные)", percent: 30, expectedReturn: 15, risk: "low", description: "ОФЗ 26248, 26238", amount: 0 },
      { instrument: "БПИФ на IMOEX", percent: 15, expectedReturn: 18, risk: "medium", description: "Дивиденды + рост", amount: 0 },
      { instrument: "Золото", percent: 5, expectedReturn: 12, risk: "medium", description: "Защита", amount: 0 },
    ],
    moderate: [
      { instrument: "Вклад до 16%", percent: 30, expectedReturn: 16, risk: "low", description: "АСВ 1,4 млн", amount: 0 },
      { instrument: "ОФЗ (длинные)", percent: 35, expectedReturn: 15, risk: "low", description: "ОФЗ 26248", amount: 0 },
      { instrument: "БПИФ на IMOEX", percent: 25, expectedReturn: 18, risk: "medium", description: "Широкий рынок", amount: 0 },
      { instrument: "Золото", percent: 10, expectedReturn: 12, risk: "medium", description: "Хедж", amount: 0 },
    ],
    aggressive: [
      { instrument: "Вклад до 16%", percent: 15, expectedReturn: 16, risk: "low", description: "Подушка", amount: 0 },
      { instrument: "БПИФ на IMOEX", percent: 50, expectedReturn: 18, risk: "medium", description: "Акции РФ", amount: 0 },
      { instrument: "ОФЗ (длинные)", percent: 20, expectedReturn: 15, risk: "low", description: "Стабильный доход", amount: 0 },
      { instrument: "Золото", percent: 10, expectedReturn: 12, risk: "medium", description: "Диверсификация", amount: 0 },
      { instrument: "Крипто", percent: 5, expectedReturn: 25, risk: "high", description: "Высокий риск", amount: 0 },
    ],
  };
  const portfolio = portfolios[riskTolerance];
  const allocWithAmounts = portfolio.map(a => ({ ...a, amount: Math.round(amount * a.percent / 100) }));
  const expectedReturn = allocWithAmounts.reduce((s, a) => s + a.expectedReturn * a.percent / 100, 0);
  const expectedAmount = Math.round(amount * Math.pow(1 + expectedReturn / 100, timeHorizonYears));
  const labels: Record<string, string> = { conservative: "Консервативный", moderate: "Сбалансированный", aggressive: "Агрессивный" };
  return {
    allocations: allocWithAmounts, expectedReturn, expectedAmount,
    recommendation: `${labels[riskTolerance]} портфель\n\nДоходность: ${expectedReturn.toFixed(1)}% годовых\nЧерез ${timeHorizonYears} года: ${RU(amount)} → ${RU(expectedAmount)} (+${RU(expectedAmount - amount)})`,
  };
}

// ─── 4. Retirement Planner ────────────────────────────────────────────────────

interface RetirementPlan {
  currentAge: number; retirementAge: number; monthlyNeed: number;
  currentSavings: number; monthlyContribution: number;
  totalByRetirement: MonteCarloResult;
  inflationAdjustedNeed: number; monthlyIncomeFromCapital: number; isFeasible: boolean;
}

function planRetirement(
  currentAge: number, targetAge: number, currentMonthlyExpenses: number,
  currentSavings: number, monthlyContrib: number,
  expectedReturn: number = 15, inflationRate: number = 6.8
): RetirementPlan {
  const yearsToRetirement = targetAge - currentAge;
  const inflationAdjNeed = currentMonthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetirement);
  const totalCapitalNeeded = inflationAdjNeed * 12 * 25;
  const mc = monteCarloSimulation(currentSavings, monthlyContrib, yearsToRetirement, expectedReturn, 15, totalCapitalNeeded);
  const monthlyIncome = mc.median * 0.04 / 12;
  return { currentAge, retirementAge: targetAge, monthlyNeed: currentMonthlyExpenses, currentSavings, monthlyContribution: monthlyContrib, totalByRetirement: mc, inflationAdjustedNeed: inflationAdjNeed, monthlyIncomeFromCapital: monthlyIncome, isFeasible: mc.successRate > 50 };
}

// ─── 5. Debt Optimization ─────────────────────────────────────────────────────

interface DebtOptimization {
  avalanche: { months: number; totalPaid: number; overpayment: number; order: string[] };
  snowball: { months: number; totalPaid: number; overpayment: number; order: string[] };
  recommendation: string; savingsAvalanche: number;
}

function optimizeDebts(debts: { name: string; balance: number; rate: number; minPayment: number }[]): DebtOptimization {
  function simulate(ordered: typeof debts): { months: number; totalPaid: number; overpayment: number } {
    const active = ordered.map(d => ({ ...d }));
    const totalDebt = ordered.reduce((s, d) => s + d.balance, 0);
    let month = 0, totalPaid = 0;
    while (active.length > 0 && month < 600) {
      month++;
      for (let i = 0; i < active.length; i++) {
        const d = active[i];
        const interest = d.balance * (d.rate / 100 / 12);
        const payment = d.minPayment;
        totalPaid += Math.min(payment, d.balance + interest);
        d.balance = Math.max(0, d.balance + interest - payment);
      }
      const stillActive = active.filter(d => d.balance > 0);
      active.length = 0;
      active.push(...stillActive);
    }
    return { months: month, totalPaid, overpayment: totalPaid - totalDebt };
  }
  const avalanche = simulate([...debts].sort((a, b) => b.rate - a.rate));
  const snowball = simulate([...debts].sort((a, b) => a.balance - b.balance));
  return {
    avalanche: { ...avalanche, order: [...debts].sort((a, b) => b.rate - a.rate).map(d => d.name) },
    snowball: { ...snowball, order: [...debts].sort((a, b) => a.balance - b.balance).map(d => d.name) },
    recommendation: `Лавина экономит ${RU(Math.max(0, snowball.overpayment - avalanche.overpayment))} против Снежного кома`,
    savingsAvalanche: Math.max(0, snowball.overpayment - avalanche.overpayment),
  };
}

// ─── 6. Risk Assessment Engine ────────────────────────────────────────────────────

function assessRisk(ctx: KashikContext): { total: number; level: "low" | "medium" | "high" | "critical"; factors: { name: string; severity: number; description: string }[]; recommendations: string[] } {
  const inc = ctx.monthlyIncome || 0;
  const exp = ctx.totalExpenses || 0;
  const bal = ctx.totalBalance || 0;
  const hasDebts = ctx.hasDebts;
  const debtTotal = ctx.debtTotal || 0;
  const sr = ctx.savingsRate ?? -1;
  const factors: { name: string; severity: number; description: string }[] = [];
  const recommendations: string[] = [];
  let totalRisk = 0;

  if (hasDebts && inc > 0) {
    const dti = (debtTotal / (inc * 12)) * 100;
    if (dti > 50) { factors.push({ name: "Долг >50%", severity: 90, description: `${dti.toFixed(0)}%` }); totalRisk += 90; }
    else if (dti > 30) { factors.push({ name: "Долг >30%", severity: 60, description: `${dti.toFixed(0)}%` }); totalRisk += 60; }
  }
  if (sr >= 0 && sr < 5) { factors.push({ name: "Нет сбережений", severity: 80, description: `${sr}%` }); totalRisk += 80; }
  if (inc > 0) {
    const cushion = bal / inc;
    if (cushion < 1) { factors.push({ name: "Нет подушки", severity: 75, description: "<1 мес" }); totalRisk += 75; }
  }
  if (inc > 0 && exp > inc) { factors.push({ name: "Дефицит бюджета", severity: 95, description: `${RU(exp - inc)}/мес` }); totalRisk += 95; }
  if (factors.length === 0) { factors.push({ name: "Базовый риск", severity: 10, description: "Стабильно" }); totalRisk = 10; }

  totalRisk = Math.min(100, Math.round(totalRisk / Math.max(1, factors.length)));
  if (totalRisk >= 70) recommendations.push("Срочно: сократите расходы, увеличьте подушку, реструктуризируйте долги");
  if (totalRisk < 70 && totalRisk >= 40) recommendations.push("Требуется оптимизация: проверьте долги и норму сбережений");
  if (totalRisk < 40) recommendations.push("Финансовое положение стабильно. Рассмотрите инвестиции.");

  const level = totalRisk >= 70 ? "critical" as const : totalRisk >= 50 ? "high" as const : totalRisk >= 30 ? "medium" as const : "low" as const;
  return { total: totalRisk, level, factors, recommendations };
}

// ─── 7. Tax Optimization ──────────────────────────────────────────────────────

function optimizeTaxes(annualIncome: number): { totalSaving: number; deductions: { name: string; saving: number }[]; recommendations: string[] } {
  const taxRate = annualIncome > 5_000_000 ? 18 : annualIncome > 2_400_000 ? 15 : 13;
  const ndfl = Math.round(annualIncome * taxRate / 100);
  const deductions = [
    { name: "Социальный (лечение/обучение/спорт)", saving: Math.round(Math.min(150_000 * taxRate / 100, ndfl)) },
    { name: "Имущественный (покупка жилья)", saving: Math.round(Math.min(2_000_000 * taxRate / 100, ndfl)) },
    { name: "ИИС тип А (взнос до 400 000 ₽)", saving: Math.round(Math.min(400_000 * taxRate / 100, ndfl)) },
  ];
  const totalSaving = deductions.reduce((s, d) => s + d.saving, 0);
  return {
    totalSaving, deductions,
    recommendations: [
      `Ставка НДФЛ: ${taxRate}%`,
      `Максимальный возврат: до ${RU(totalSaving)}/год`,
      "Подать 3-НДФЛ онлайн на nalog.ru",
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ║  END ML-POWERED ENGINES  ║
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Конверсационный движок ──────────────────────────────────────────────────

interface ParsedIntent {
  type: string;
  nums: number[];
  r: number | null;
  y: number | null;
  m: number | null;
  confidence: number;
}

function parse(q: string, scenario: string): ParsedIntent {
  const lq = q.toLowerCase();
  const nums = extractNumbers(q);
  const rVal = rate(q);
  const yVal = years(q);
  const mVal = months(q);

  const checks: [string, RegExp, number][] = [
    ["calc_mortgage", /ипотек|рассчит.*жил|ежемес.*платёж.*жильё|расч.*кредит.*квартир|mortgage/i, 0.9],
    ["calc_deposit", /вклад|депозит|положить.*банк|накопит.*счёт|заработаю.*вклад/i, 0.85],
    ["calc_iis", /иис|инвест.*счёт|ндфл.*инвест|вычет.*иис|ис.тип/i, 0.9],
    ["calc_tax_med", /вычет.*лечен|возврат.*мед|налог.*лечен|вычет.*стомат|вычет.*аптек/i, 0.9],
    ["calc_tax_edu", /вычет.*обуч|вычет.*образо|налог.*курс|вычет.*универ|вычет.*автошкол/i, 0.9],
    ["calc_tax_prop", /вычет.*квартир|имущественн.*вычет|возврат.*покупк.*недвиж|вычет.*жильё/i, 0.9],
    ["calc_debt", /погаш.*кредит|выплатить.*долг|сколько.*плат.*кредит|калькул.*долг/i, 0.85],
    ["calc_budget", /бюджет.*зарплат|распред.*доход|правило.*50|раздели.*доход/i, 0.85],
    ["calc_pension", /пенси.*накоп|копить.*пенси|пенсионн.*капитал|накоп.*старост|через.*лет.*капит/i, 0.85],
    ["calc_health_score", /здоров.*финанс|финанс.*здоров|оцен.*финанс|скоринг|финанс.*рейтинг|мой.*рейтинг|health.*score/i, 0.85],
    ["calc_portfolio", /портфел.*оптим|распредел.*капитал|диверсифицир|куда.*вложить.*[0-9]|стратегия.*инвест/i, 0.85],
    ["calc_retirement", /пенси.*план|сколько.*надо.*пенси|пенси.*расчёт|пенсион.*возраст/i, 0.85],
    ["calc_risk", /риск.*анализ|финанс.*риск|оцен.*риск|насколько.*риск/i, 0.85],
    ["calc_monte_carlo", /монте.*карло|прогноз.*инвест|симуляц.*рынок|вероятност.*доход/i, 0.9],
    ["calc_tax_optimize", /оптимиз.*налог|налог.*оптим|минимиз.*налог|как.*уменьш.*налог/i, 0.85],
    ["info_mortgage", /ипотек|семейн.*ипотек|ит.ипотек|льготн.*ипотек|дальневост/i, 0.75],
    ["info_deposits", /вклад|ставк.*банк|куда.*деньги.*положить|накопит|лучш.*вклад/i, 0.75],
    ["info_invest", /инвестиц|офз|бпиф|акци.*биржа|куда.*вложить|вложить.*деньги/i, 0.75],
    ["info_cashback", /кешбэк|cashback|лучш.*карт|карт.*банк|выбр.*карту/i, 0.75],
    ["info_fraud", /мошенник|скам|обманул|украли.*деньги|позвонили.*банк|развод/i, 0.85],
    ["info_fz115", /115.фз|блокир.*счёт|заблок.*банк|115 фз|115фз/i, 0.9],
    ["info_taxes", /налог|ндфл|вычет|3.ндфл|декларац|прогресс.*шкал/i, 0.75],
    ["info_debt", /долг|кредит.*стратег|рефинанс|погашен.*план|долгов.*нагруз|кредитн.*каник/i, 0.75],
    ["info_budget", /бюджет|экономить|откладывать|сберег|подушк.*безопас/i, 0.75],
    ["info_cushion", /подушка.*безопас|резерв.*деньг|финанс.*запас|накоп.*подушк/i, 0.85],
    ["info_pension", /пенси/i, 0.85],
    ["info_entrepreneur", /самозанят|ип\b|индивид.*предприн|налог.*ип|нпд\b|усн\b/i, 0.85],
    ["info_family", /маткапитал|материнск.*капитал|детск.*пособи|семейн.*льгот|единое.*пособ/i, 0.85],
    ["analyze_me", /анализ.*мои|мои.*финанс|оцени.*расход|куда.*уход.*деньги|мой.*бюджет/i, 0.9],
    ["analyze_savings", /сколько.*откладывать|могу.*откладывать|мой.*доход|что.*с.*деньгами/i, 0.85],
    ["advice_general", /./, 0.1],
  ];

  const boosts: Record<string, string[]> = {
    mortgage: ["calc_mortgage", "info_mortgage"],
    deposit: ["calc_deposit", "info_deposits"],
    invest: ["calc_iis", "info_invest", "calc_portfolio", "calc_monte_carlo"],
    tax: ["calc_tax_med", "calc_tax_edu", "calc_tax_prop", "calc_iis", "info_taxes", "calc_tax_optimize"],
    debt: ["calc_debt", "info_debt"],
    budget: ["calc_budget", "info_budget", "info_cushion", "calc_health_score"],
    fraud: ["info_fraud"],
    fz115: ["info_fz115"],
    cashback: ["info_cashback"],
  };

  let best: ParsedIntent = { type: "advice_general", nums, r: rVal, y: yVal, m: mVal, confidence: 0.1 };
  for (const [type, re, base] of checks) {
    if (re.test(lq)) {
      let conf = base;
      if ((boosts[scenario] || []).includes(type)) conf = Math.min(1, conf + 0.15);
      if (conf > best.confidence) best = { type, nums, r: rVal, y: yVal, m: mVal, confidence: conf };
    }
  }
  return best;
}

// ─── Персональный анализ ──────────────────────────────────────────────────────

function personalAnalysis(ctx: KashikContext): string {
  const inc = ctx.monthlyIncome || 0;
  const bal = ctx.totalBalance || 0;
  const exp = ctx.totalExpenses || 0;
  const sr = ctx.savingsRate || 0;
  const cats = ctx.topCategories || [];
  const hasDebts = ctx.hasDebts;
  const debtTotal = ctx.debtTotal || 0;

  if (!inc && !bal) {
    return `Загрузите выписку из банка или заполните данные вручную — тогда я дам персональный анализ с конкретными цифрами.\n\nПока могу отвечать на любые вопросы о финансах, считать ипотеку, вклады, вычеты.`;
  }

  const lines: string[] = [];
  if (inc) {
    lines.push(`**Доход:** ${RU(inc)}/мес`);
    if (sr < 5) lines.push(`🔴 **Норма сбережений ${sr}% — критически низкая.** Цель минимум 10%, хорошо 20%+.`);
    else if (sr < 15) lines.push(`🟡 **Норма сбережений ${sr}%** — ниже нормы (норма 15-20%). Есть резерв для роста.`);
    else lines.push(`✅ **Норма сбережений ${sr}% — отлично!** Выше среднего по России.`);
  }

  if (bal) {
    const target = inc * 3;
    if (bal < target * 0.5) {
      lines.push(`🟡 **Подушка ${RU(bal)}** — мало (цель ${RU(target)}). Открыть накопительный счёт 14,5-15% и автопополнять.`);
    } else if (bal < target) {
      lines.push(`🟢 **Подушка ${RU(bal)}** — на пути к цели ${RU(target)}.`);
    } else {
      lines.push(`✅ **Подушка ${RU(bal)}** — сформирована. Пора думать об инвестициях!`);
    }
  }

  if (hasDebts && debtTotal > 0) {
    lines.push(`💳 **Долги: ${RU(debtTotal)}** — рефинансирование или стратегия лавина сократят переплату.`);
  }

  if (cats.length > 0) {
    lines.push(`\n**Топ расходов:** ${cats.join(", ")}`);
    const catTips = cats.flatMap((c) => {
      const lc = c.toLowerCase();
      if (/кафе|ресторан|доставк.*ед/i.test(lc)) return [`• ${c}: Альфа CashBack 5% вернёт часть обратно`];
      if (/продукт|магазин|супермарк/i.test(lc)) return [`• ${c}: Ozon карта — 3-7% кешбэк`];
      if (/транспорт|такси|азс|топлив/i.test(lc)) return [`• ${c}: Альфа CashBack 10% на АЗС = до 2 000 ₽/мес`];
      if (/подписк/i.test(lc)) return [`• ${c}: Проведите аудит — часть может быть лишней`];
      return [];
    });
    if (catTips.length > 0) lines.push(catTips.join("\n"));
  }

  lines.push("\n**Что сделать прямо сейчас:**");
  let step = 1;
  if (sr < 15 && inc) lines.push(`${step++}. Настройте автоперевод **${RU(inc * 0.15)}/мес** на накопительный счёт`);
  if (!bal || bal < inc * 1.5) lines.push(`${step++}. Откройте накопительный счёт Газпромбанк (15%) или Т-Банк (14,5%)`);
  if (inc) {
    const iisBenefit = Math.min(52000, Math.round(inc * 12 * 0.13));
    lines.push(`${step++}. ИИС тип А — государство вернёт **${RU(iisBenefit)}/год** при взносе ${RU(Math.min(400000, inc * 4))}`);
  }

  return lines.join("\n");
}

// ─── Генератор советов ─────────────────────────────────────────────────────────

function getTips(ctx: KashikContext): ValueTip[] {
  const tips: ValueTip[] = [];
  const inc = ctx.monthlyIncome || 0;
  const bal = ctx.totalBalance || 0;
  const cats = ctx.topCategories || [];

  if (inc > 0) {
    tips.push({
      emoji: "💳",
      title: "Кешбэк под ваши траты",
      saving: "+" + RU(Math.round(inc * 0.025)) + "/мес",
      action: "Ozon+Альфа CashBack: продукты 3%, АЗС 10%, кафе 5%",
      link: "https://www.sravni.ru/kreditnye-karty/cashback/",
    });
    const iisRet = Math.min(52000, Math.round(inc * 12 * 0.13));
    tips.push({
      emoji: "🏦",
      title: "ИИС: государство доплатит",
      saving: "+" + RU(iisRet) + "/год",
      action: "Откройте ИИС и внесите " + RU(Math.min(400000, inc * 3)) + " — вернут НДФЛ",
      link: "https://www.tbank.ru/invest/iis/",
    });
  }
  if (bal > 100000) {
    tips.push({
      emoji: "📈",
      title: "Деньги на счёте работают",
      saving: "+" + RU(Math.round(bal * 0.155 / 12)) + "/мес",
      action: RU(bal) + " под 15% = " + RU(Math.round(bal * 0.155 / 12)) + "/мес пассивно",
      link: "https://finuslugi.ru/",
    });
  }
  tips.push({
    emoji: "📱",
    title: "Аудит подписок",
    saving: "+1 000–3 000 ₽/мес",
    action: "Найдите повторяющиеся списания в выписке и отключите неиспользуемые",
  });
  if (cats.some((c) => /кафе|доставк/i.test(c))) {
    tips.push({
      emoji: "🍳",
      title: "Готовьте дома 3x/неделю",
      saving: "+3 000–6 000 ₽/мес",
      action: "Замена 3 доставок в неделю домашней едой — один из самых эффективных способов",
    });
  }
  if (ctx.hasDebts && (ctx.debtTotal || 0) > 100000) {
    tips.push({
      emoji: "🔄",
      title: "Рефинансирование долга",
      saving: "до 30% переплаты",
      action: "Долг " + RU(ctx.debtTotal || 0) + " — проверьте предложения рефинансирования",
      link: "https://www.tbank.ru/loans/refinancing/",
    });
  }
  return tips.slice(0, 4);
}

function getProducts(ctx: KashikContext, intent: string): ProductSuggestion[] {
  const prods: ProductSuggestion[] = [];
  const cats = ctx.topCategories || [];
  const s = ctx.segment || "solo";

  if (intent.includes("deposit") || intent.includes("budget")) {
    prods.push({ name: "Вклад МКБ.Преимущество+", bank: "МКБ", type: "Вклад", benefit: "17,5% годовых, 3 мес", highlight: "Одна из лучших текущих ставок", url: "https://mkb.ru/personal/deposits/srochnye-vklady/mkb-preimushchestvo" });
  }
  if (intent.includes("invest") || intent.includes("iis")) {
    prods.push({ name: "ИИС — возврат до 52 000 ₽/год", bank: "Т-Инвестиции", type: "Инвестиции", benefit: "Государство платит 13%", highlight: "Открытие за 5 минут", url: "https://www.tbank.ru/invest/iis/" });
  }
  if (intent.includes("cashback") || cats.some((c) => /продукт|магазин|ozon|озон/i.test(c))) {
    prods.push({ name: "Карта Ozon", bank: "Ozon Банк", type: "Дебетовая карта", benefit: "7% на Ozon, 3% супермаркеты", highlight: "Бесплатная навсегда", url: "https://www.ozon.ru/card/" });
  }
  if (intent.includes("cashback") || cats.some((c) => /азс|топлив|транспорт/i.test(c))) {
    prods.push({ name: "CashBack", bank: "Альфа-Банк", type: "Дебетовая карта", benefit: "10% АЗС, 5% кафе", highlight: "Бесплатно при обороте 10 000 ₽", url: "https://alfabank.ru/everyday/cards/cash-back/" });
  }
  if (intent.includes("mortgage") || s === "family") {
    prods.push({ name: "Семейная ипотека 6%", bank: "Сбербанк", type: "Ипотека", benefit: "В 3 раза меньше переплата", highlight: "Дети до 18 лет — вы в программе", url: "https://www.sberbank.ru/ru/person/credits/home/family" });
  }
  if (ctx.hasDebts && (ctx.debtTotal || 0) > 100000) {
    prods.push({ name: "Рефинансирование", bank: "Т-Банк", type: "Кредит", benefit: "Объединить долги по одной ставке", highlight: "Решение за 5 минут онлайн", url: "https://www.tbank.ru/loans/refinancing/" });
  }
  if (intent.includes("general") || intent.includes("budget")) {
    prods.push({ name: "Накопительный счёт", bank: "Газпромбанк", type: "Счёт", benefit: "До 16% без ограничений", highlight: "Пополнение и снятие без потери %", url: "https://www.gazprombank.ru/personal/increase/deposits/" });
  }
  return prods.slice(0, 3);
}

// ─── Конверсационная генерация ответа ────────────────────────────────────────

function buildContext(ctx: KashikContext): string {
  const parts: string[] = [];
  if (ctx.name) parts.push(ctx.name);
  if (ctx.segment === "family") parts.push("семья");
  if (ctx.segment === "entrepreneur") parts.push("ИП/предприниматель");
  if (ctx.monthlyIncome) parts.push("доход " + RU(ctx.monthlyIncome) + "/мес");
  if (ctx.savingsRate !== undefined && ctx.savingsRate > 0) parts.push("сбережения " + ctx.savingsRate + "%");
  if (ctx.topCategories?.length) parts.push("траты: " + ctx.topCategories.slice(0, 2).join(", "));
  return parts.length > 0 ? "[" + parts.join(" | ") + "]" : "";
}

function getConversationTone(history: { role: string; content: string }[]): "first" | "continue" {
  return history.length > 2 ? "continue" : "first";
}

function followUpContext(history: { role: string; content: string }[]): string {
  if (!history.length) return "";
  const lastUser = [...history].reverse().find((h) => h.role === "user");
  return lastUser ? lastUser.content.toLowerCase() : "";
}

function buildPersonalNote(ctx: KashikContext, intent: string): string {
  const inc = ctx.monthlyIncome || 0;
  const notes: string[] = [];

  if (intent === "info_deposits" && inc > 0) {
    const monthly = Math.round(inc * 0.15 * 12 * 0.155 / 12);
    notes.push(`**Вам лично:** При откладывании ${RU(inc * 0.15)}/мес под 15% — через год ${RU(monthly)}/мес пассивного дохода.`);
  }
  if (intent === "info_invest" && inc > 0) {
    const iisRet = Math.min(52000, Math.round(inc * 12 * 0.13));
    notes.push(`**Вам лично:** ИИС тип А вернёт ${RU(iisRet)}/год от вашего НДФЛ.`);
  }
  if (intent === "info_taxes" && inc > 0) {
    notes.push(`**Вам лично:** При доходе ${RU(inc)}/мес можете вернуть до ${RU(Math.min(52000, Math.round(inc * 12 * 0.13)))}/год через ИИС + вычеты за лечение/обучение.`);
  }
  if (intent === "info_mortgage" && ctx.segment === "family") {
    notes.push(`**Вам лично:** У вас семья → право на **Семейную ипотеку 6%**.`);
  }
  if (intent === "info_cashback" && ctx.topCategories?.length) {
    notes.push(`**Вам лично:** Ваши траты (${ctx.topCategories.slice(0, 2).join(", ")}) — подберу карту именно под это, спросите.`);
  }
  return notes.join("\n");
}

export function kashikRespond(ctx: KashikContext): KashikResponse {
  const q = ctx.message.trim();
  const lq = q.toLowerCase();
  const scenario = ctx.scenario || "general";
  const history = ctx.history || [];
  const name = ctx.name ? ctx.name : "";
  const tone = getConversationTone(history);
  const prevQ = followUpContext(history);

  // ── 1. Определяем Intent ──────────────────────────────────────────────────
  const intent = parse(q, scenario);
  const { nums, r, y, m: mo } = intent;

  // ── 2. Произвольные финансовые данные (свободная форма) ───────────────────
  // Детектируем если пользователь вводит несколько финансовых параметров
  const freeFormData = parseFreeForm(q);
  const hasFreeFormIndicators = freeFormData &&
    (
      (freeFormData.income && freeFormData.rent) ||
      (freeFormData.income && freeFormData.credit) ||
      (freeFormData.income && freeFormData.food) ||
      (freeFormData.income && freeFormData.balance) ||
      // много чисел + финансовые ключевые слова
      (nums.length >= 2 && /зарплат|доход|расход|аренд|кредит|остаток/i.test(q))
    );

  if (hasFreeFormIndicators && freeFormData) {
    return analyzeFreeFormData(freeFormData, ctx);
  }

  // ── 3. Персональный анализ ────────────────────────────────────────────────
  if (intent.type === "analyze_me" || intent.type === "analyze_savings") {
    return { text: personalAnalysis(ctx), tips: getTips(ctx), products: getProducts(ctx, intent.type) };
  }

  // ── 4. Калькуляторы ───────────────────────────────────────────────────────

  if (intent.type === "calc_mortgage") {
    const price = nums[0] || (ctx.monthlyIncome ? ctx.monthlyIncome * 80 : 5_000_000);
    const rVal = r || 6;
    const yVal = y || 20;
    const downPct =
      /(\d+)\s*%\s*(взнос|первонач)/i.test(q)
        ? parseInt(q.match(/(\d+)\s*%/i)![1]) / 100
        : 0.2;
    const down = nums.length > 1 && nums[1] < price ? nums[1] : price * downPct;
    const loan = price - down;
    const calc = calcMortgage(price, down, rVal, yVal);
    const mr = rVal / 100 / 12;
    const n = yVal * 12;
    const pmt = mr > 0 ? (loan * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) : loan / n;
    const neededIncome = Math.round(pmt * 2.5);

    // Семейная ипотека для сравнения
    const mr6 = 6 / 100 / 12;
    const pmt6 = (loan * mr6 * Math.pow(1 + mr6, n)) / (Math.pow(1 + mr6, n) - 1);

    let text = "";
    if (rVal <= 6) {
      text = `**Льготная ставка ${PCT(rVal)}** — очень выгодно!\n\n`;
      text += `Ежемесячный платёж: **${RU(pmt)}/мес**\n`;
      text += `Для одобрения нужен доход от **${RU(neededIncome)}/мес** (платёж ≤ 40% дохода).\n\n`;
      if (rVal === 6) text += `Программы: **Семейная ипотека** (дети до 18 лет) или **IT-ипотека** (аккредитованные IT-компании). Подавайте через Сбербанк, ВТБ или ДОМ.РФ.\n\nПреимущество перед рыночной ставкой 20% — в таблице ниже ↓`;
    } else if (rVal >= 18) {
      text = `Ставка **${PCT(rVal)}** — это рыночная, дорого.\n\n`;
      text += `Платёж: **${RU(pmt)}/мес**. В таблице — сравнение с льготными программами ↓\n\n`;
      text += `**Что делать:**\n`;
      if (ctx.segment === "family") text += `• У вас семья → **Семейная ипотека 6%**: платёж ${RU(pmt6)}/мес — экономия ${RU(pmt - pmt6)}/мес!\n`;
      text += `• IT-сектор → IT-ипотека 6%\n`;
      text += `• Дождитесь снижения ставки ЦБ (прогноз 13-14% к концу 2026) — затем рефинансируйтесь`;
    } else {
      text = `Ипотека **${RU(price)}** на **${yVal} лет** под **${PCT(rVal)}**:\n\n`;
      text += `• Платёж: **${RU(pmt)}/мес**\n`;
      text += `• Нужный доход: **${RU(neededIncome)}/мес**\n`;
      text += `• Сравнение со ставкой 6% (льготная) и 20% (рыночная) — в таблице ниже ↓`;
    }

    return { text, calcResult: calc, products: getProducts(ctx, "mortgage") };
  }

  if (intent.type === "calc_deposit") {
    const amount = nums[0] || 500_000;
    const rVal = r || 15.5;
    const mVal = mo || (y ? y * 12 : 6);
    const calc = calcDeposit(amount, rVal, mVal);
    const compound = amount * Math.pow(1 + rVal / 100 / 12, mVal) - amount;

    const text =
      `**${RU(amount)}** на **${mVal} мес** под **${PCT(rVal)}** принесут **${RU(compound)}** с капитализацией.\n\n` +
      `**Где открыть сейчас:**\n` +
      `• МКБ — **17,5%**, 3 мес (одно из лучших предложений)\n` +
      `• Газпромбанк — **до 16%**, новые клиенты\n` +
      `• Локо-Банк промо (Финуслуги) — **до 25%**, до 50 000 ₽, новые клиенты\n` +
      `• Финуслуги.ру — маркетплейс ЦБ, можно найти лучшие ставки\n\n` +
      `⚡ **Важно:** ЦБ снизил ставку до 14,5% 25 апреля 2026. Ставки по вкладам идут вниз. Зафиксируйте на 6-12 мес сейчас — в таблице сравнение по срокам ↓`;

    return { text, calcResult: calc };
  }

  if (intent.type === "calc_iis") {
    const amount = nums[0] || 400_000;
    const annualIncome = ctx.monthlyIncome ? ctx.monthlyIncome * 12 : nums[1] || 600_000;
    const calc = calcIIS(amount, annualIncome);
    const ret = Math.min(Math.min(amount, 400_000) * 0.13, annualIncome * 0.13, 52_000);

    const text =
      `ИИС тип А — это **${RU(ret)}/год бесплатно от государства** (возврат уплаченного НДФЛ).\n\n` +
      `**Пошаговый план:**\n` +
      `1. Откройте ИИС — Т-Инвестиции, Сбербанк, ВТБ (бесплатно, ~5 минут)\n` +
      `2. Внесите до **400 000 ₽** на счёт\n` +
      `3. Купите ОФЗ (~15-16% годовых) — деньги работают\n` +
      `4. В январе следующего года: lkfl2.nalog.ru → 3-НДФЛ → 5 минут\n` +
      `5. Через 30-90 дней **${RU(ret)} придут на карту**\n\n` +
      `**Стратегия 3 лет:** взносы каждый год → 3 вычета + рост ОФЗ. Суммарно в таблице ↓`;

    return { text, calcResult: calc };
  }

  if (
    intent.type === "calc_tax_med" ||
    intent.type === "calc_tax_edu" ||
    intent.type === "calc_tax_prop"
  ) {
    const amount = nums[0] || 80_000;
    const annualIncome = ctx.monthlyIncome ? ctx.monthlyIncome * 12 : 600_000;
    const typeMap: Record<string, "med" | "edu" | "prop"> = {
      calc_tax_med: "med",
      calc_tax_edu: "edu",
      calc_tax_prop: "prop",
    };
    const type = typeMap[intent.type];
    const calc = calcVychet(type, amount, annualIncome);
    const ret = Math.min(Math.min(amount, type === "prop" ? 2_000_000 : 150_000) * 0.13, annualIncome * 0.13);

    const contextNote = ctx.monthlyIncome
      ? `При вашем доходе ${RU(ctx.monthlyIncome)}/мес (НДФЛ ~${RU(Math.round(ctx.monthlyIncome * 12 * 0.13))}/год) `
      : "";

    const typeLabels = { med: "лечение", edu: "образование", prop: "покупку жилья" };
    const text =
      `${contextNote}Вычет за **${typeLabels[type]}**: вернут **${RU(ret)} на карту**.\n\n` +
      `**Как подать онлайн за 5 минут:**\n` +
      `1. lkfl2.nalog.ru → войти через Госуслуги\n` +
      `2. Раздел Декларации → Подать 3-НДФЛ\n` +
      `3. Автозаполнение из данных работодателя (обычно всё уже есть)\n` +
      `4. Загрузить справки и договоры\n` +
      `5. Подписать — деньги через 30-90 дней\n\n` +
      (type === "prop" ? `💡 Если покупали в ипотеку — добавьте вычет по процентам: ещё до **390 000 ₽** отдельно!` : `💡 Собирайте все чеки и договоры в одну папку — потребуются при подаче.`);

    return { text, calcResult: calc };
  }

  if (intent.type === "calc_debt") {
    const balance = nums[0] || ctx.debtTotal || 300_000;
    const rVal = r || 20;
    const payment = nums.length > 1
      ? nums.filter((n) => n < balance).sort((a, b) => a - b)[0] || Math.round(balance * 0.03)
      : Math.round(balance * 0.03);
    const calc = calcDebt(balance, rVal, payment);

    // Оценка переплаты при разных стратегиях
    const mr = rVal / 100 / 12;
    let bal = balance, totalPaid = 0, m = 0;
    while (bal > 0 && m < 600) {
      const i = bal * mr;
      const p = payment - i;
      if (p <= 0) { m = 999; break; }
      totalPaid += payment;
      bal = Math.max(0, bal - p);
      m++;
    }

    const pmt150 = payment * 1.5;
    let bal3 = balance, total3 = 0, m3 = 0;
    while (bal3 > 0 && m3 < 600) {
      const i = bal3 * mr;
      const p = pmt150 - i;
      if (p <= 0) break;
      total3 += pmt150;
      bal3 = Math.max(0, bal3 - p);
      m3++;
    }

    const text =
      `Долг **${RU(balance)}** под **${PCT(rVal)}**, платёж **${RU(payment)}/мес**.\n\n` +
      (m < 999 ? `Срок погашения: **${m} мес** (${(m / 12).toFixed(1)} лет), переплата **${RU(totalPaid - balance)}**.\n\n` : `⚠️ **Платёж не покрывает начисленные проценты** — долг только растёт! Нужен платёж минимум ${RU(Math.ceil(balance * mr + 1))}.\n\n`) +
      `**2 стратегии выхода:**\n\n` +
      `🔥 **Лавина** (экономит больше $):\nМинимум по всем долгам → весь свободный платёж на самый дорогой (наивысшая ставка). Когда погасили — переключаетесь на следующий.\n\n` +
      `❄️ **Снежный ком** (психологически проще):\nМинимум по всем → максимум на наименьший остаток. Быстрые победы мотивируют.\n\n` +
      (m < 999 && m3 > 0 ? `💡 Если платить **+50% (${RU(pmt150)}/мес)** — закроете за **${m3} мес**, сэкономите ${m - m3} мес и **${RU(totalPaid - total3)}** на процентах.\n\n` : "") +
      `**Рефинансирование выгодно** если другой банк даёт ставку на 2%+ ниже. Смотрите: Т-Банк, Сбербанк, ВТБ.`;

    return { text, calcResult: calc };
  }

  if (intent.type === "calc_budget") {
    const income = nums[0] || ctx.monthlyIncome || 100_000;
    const calc = calcBudget(income);
    const monthsToPillow = Math.ceil((income * 3) / (income * 0.2));
    const text =
      `Бюджет **${RU(income)}/мес** по правилу 50/30/20:\n\n` +
      `**Ключевое правило:** Настройте автоперевод **${RU(income * 0.2)}** в день зарплаты на накопительный счёт. Деньги которых нет — не тратятся.\n\n` +
      `При этом финансовая подушка 3 мес (${RU(income * 3)}) сформируется за **${monthsToPillow} мес**.\n\n` +
      `**Дальше:**\n` +
      `• После подушки → **ИИС** (государство вернёт ${RU(Math.min(52000, Math.round(income * 12 * 0.13)))}/год)\n` +
      `• Подберите **кешбэк-карту** под основные категории трат → +${RU(Math.round(income * 0.025))}/мес пассивно`;

    return { text, calcResult: calc, tips: getTips(ctx) };
  }

  if (intent.type === "calc_pension") {
    const contrib = nums[0] || (ctx.monthlyIncome ? Math.round(ctx.monthlyIncome * 0.1) : 10_000);
    const yrs = y || 20;
    const rVal = r || 15;
    const calc = calcPension(contrib, yrs, rVal);

    const text =
      `Пенсионная стратегия: откладывать **${RU(contrib)}/мес** на **${yrs} лет** под **${PCT(rVal)}**:\n\n` +
      `За счёт сложного процента — деньги делают деньги. Через ${yrs} лет капитал в таблице ↓\n\n` +
      `**Лучший инструмент для старта:** ИИС тип А + ОФЗ\n` +
      `• Государство возвращает 13% в год (до 52 000 ₽)\n` +
      `• Деньги вложены в ОФЗ (~15-16%)\n` +
      `• Эффективная доходность первые 3 года: 25-30%\n\n` +
      `**Главный закон:** Начните сегодня. Каждый год промедления — это потеря нескольких миллионов на горизонте.`;

    return { text, calcResult: calc };
  }

  // ── ML-Powered New Engines ────────────────────────────────────────────────

  if (intent.type === "calc_health_score" || intent.type === "analyze_me") {
    const health = computeFinancialHealth(ctx);
    if (health) {
      const gradeColors: Record<string, string> = { "A+": "✅", "A": "✅", "B": "🟢", "C": "🟡", "D": "🔴", "F": "❌" };
      const lines: string[] = [];
      lines.push(`**📊 Финансовый рейтинг: ${gradeColors[health.grade]} ${health.grade} (${health.total}/100)**\n`);
      lines.push(`| Фактор | Оценка | Статус |`);
      lines.push(`|--------|--------|--------|`);
      for (const f of health.factors) {
        const emoji = f.status === "green" ? "✅" : f.status === "yellow" ? "🟡" : "🔴";
        lines.push(`| ${f.name} | ${f.score}/100 | ${emoji} ${f.detail} |`);
      }
      lines.push(`\n**Рекомендации:**`);
      health.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      if (!health.recommendations.length) lines.push("Всё отлично! Продолжайте в том же духе.");

      const risk = assessRisk(ctx);
      lines.push(`\n**Уровень риска:** ${risk.level === "low" ? "Низкий ✅" : risk.level === "medium" ? "Средний 🟡" : risk.level === "high" ? "Высокий 🔴" : "Критический ❌"}`);
      risk.recommendations.forEach(r => lines.push(`• ${r}`));

      return { text: lines.join("\n"), tips: getTips(ctx), products: getProducts(ctx, "budget") };
    }
  }

  if (intent.type === "calc_portfolio") {
    const amount = nums[0] || ctx.totalBalance || 500_000;
    const riskLevel = ctx.segment === "conservative" ? "conservative" as const
      : (ctx.segment === "aggressive" ? "aggressive" as const : "moderate" as const);
    const portfolio = optimizePortfolio(amount, riskLevel, 3);
    const lines: string[] = [];
    lines.push(`**📈 Оптимальный портфель для ${RU(amount)}**\n`);
    lines.push(portfolio.recommendation);
    lines.push(`\n**Распределение:**`);
    for (const a of portfolio.allocations) {
      const emoji = a.risk === "low" ? "✅" : a.risk === "medium" ? "🟡" : "🔴";
      lines.push(`• ${emoji} **${a.instrument}** — ${a.percent}% (${RU(a.amount)}) — ${a.description}`);
    }
    return { text: lines.join("\n") };
  }

  if (intent.type === "calc_retirement") {
    const age = parseInt(q.match(/(\d+)\s*лет/i)?.[1] || "30");
    const targetAge = parseInt(q.match(/(?:выйт[иь]|пенси[яи])\s*(?:в\s*)?(\d+)/i)?.[1] || "60");
    const monthlyExp = ctx.totalExpenses ?
      Math.round(ctx.totalExpenses / Math.max(1, ctx.history?.length || 1)) :
      nums[1] || (ctx.monthlyIncome ? ctx.monthlyIncome * 0.7 : 50000);
    const savings = ctx.totalBalance || 0;
    const contrib = nums[0] || (ctx.monthlyIncome ? Math.round(ctx.monthlyIncome * 0.15) : 15000);

    const plan = planRetirement(age, targetAge, monthlyExp, savings, contrib);
    const lines: string[] = [];
    lines.push(`**🧓 Пенсионный план: ${age} → ${targetAge} лет (${targetAge - age} лет накопления)**\n`);
    lines.push(`**Текущие расходы:** ${RU(monthlyExp)}/мес`);
    lines.push(`**С поправкой на инфляцию (6.8%):** ${RU(Math.round(plan.inflationAdjustedNeed))}/мес (к выходу на пенсию)`);
    lines.push(`**Нужный капитал:** ${RU(Math.round(plan.inflationAdjustedNeed * 12 * 25))}`);
    lines.push(`\n**Результат Monte Carlo (${5000} симуляций):**`);
    lines.push(`• Оптимистичный (90%): ${RU(Math.round(plan.totalByRetirement.optimistic))}`);
    lines.push(`• Медианный (50%): **${RU(Math.round(plan.totalByRetirement.median))}**`);
    lines.push(`• Пессимистичный (10%): ${RU(Math.round(plan.totalByRetirement.pessimistic))}`);
    lines.push(`• Доход с капитала: **${RU(Math.round(plan.monthlyIncomeFromCapital))}/мес** (правило 4%)`);
    lines.push(`• Вероятность успеха: **${Math.round(plan.totalByRetirement.successRate)}%**`);
    lines.push(`\n${plan.isFeasible ? "✅ Цель ДОСТИЖИМА при текущей стратегии" : "❌ Цель НЕ ДОСТИЖИМА — увеличьте взносы или продлите срок"}`);
    lines.push(`\n💡 **Совет:** Каждый год промедления снижает пенсионный капитал на 12-18% из-за упущенного сложного процента.`);
    return { text: lines.join("\n") };
  }

  if (intent.type === "calc_risk") {
    const risk = assessRisk(ctx);
    const riskEmoji = risk.level === "low" ? "✅" : risk.level === "medium" ? "🟡" : risk.level === "high" ? "🔴" : "❌";
    const lines: string[] = [];
    lines.push(`**⚠️ Оценка финансовых рисков**\n`);
    lines.push(`**Уровень: ${riskEmoji} ${risk.level === "low" ? "Низкий" : risk.level === "medium" ? "Средний" : risk.level === "high" ? "Высокий" : "Критический"} (${risk.total}/100)**`);
    if (risk.factors.length) {
      lines.push(`\n**Факторы риска:**`);
      for (const f of risk.factors) {
        const bar = "█".repeat(Math.round(f.severity / 10)) + "░".repeat(10 - Math.round(f.severity / 10));
        lines.push(`• ${f.name}: ${bar} (${f.severity}/100) — ${f.description}`);
      }
    }
    lines.push(`\n**Рекомендации:**`);
    risk.recommendations.forEach(r => lines.push(`• ${r}`));
    return { text: lines.join("\n") };
  }

  if (intent.type === "calc_monte_carlo") {
    const amount = nums[0] || 500_000;
    const monthly = nums[1] || (ctx.monthlyIncome ? Math.round(ctx.monthlyIncome * 0.2) : 10000);
    const yrs = y || 10;
    const ret = r || 15;
    const mc = monteCarloSimulation(amount, monthly, yrs, ret, 20);
    const lines: string[] = [];
    lines.push(`**🎲 Monte Carlo симуляция: ${RU(amount)} + ${RU(monthly)}/мес × ${yrs} лет**\n`);
    lines.push(`Параметры: ожидаемая доходность ${ret}%, волатильность 20%\n`);
    lines.push(`**Результаты ${5000} симуляций:**`);
    for (const s of mc.scenarios) {
      lines.push(`• ${s.pct}% перцентиль: **${RU(Math.round(s.value))}**`);
    }
    lines.push(`\n**Интерпретация:**`);
    lines.push(`• В 50% сценариев капитал составит ≥ ${RU(Math.round(mc.median))}`);
    lines.push(`• В 90% сценариев капитал составит ≥ ${RU(Math.round(mc.scenarios.find(s => s.pct === 10)!.value))}`);
    lines.push(`• Только в 5% сценариев капитал < ${RU(Math.round(mc.scenarios.find(s => s.pct === 5)!.value))}`);
    lines.push(`\n💡 **Вывод:** Долгосрочное инвестирование сглаживает волатильность. Чем длиннее горизонт, тем надёжнее результат.`);
    return { text: lines.join("\n") };
  }

  if (intent.type === "calc_tax_optimize") {
    const annualIncome = ctx.monthlyIncome ? ctx.monthlyIncome * 12 : nums[0] || 1_200_000;
    const tax = optimizeTaxes(annualIncome);
    const lines: string[] = [];
    lines.push(`**📋 Налоговая оптимизация**\n`);
    lines.push(`Доход: **${RU(annualIncome)}/год** · Ставка: **${tax.deductions[0].saving > 0 ? "" : ""}НДФЛ ${tax.recommendations[0]}**`);
    lines.push(`\n**Доступные вычеты:**`);
    for (const d of tax.deductions) {
      lines.push(`• ${d.name}: возврат **до ${RU(d.saving)}**`);
    }
    lines.push(`\n**Максимальный возврат: ${RU(tax.totalSaving)}/год**`);
    lines.push(`\n**Что делать:**`);
    tax.recommendations.slice(1).forEach(r => lines.push(`• ${r}`));
    return { text: lines.join("\n") };
  }

  // ── 5. Информационные ответы ──────────────────────────────────────────────

  const kbMap: Record<string, string> = {
    info_mortgage: "mortgage",
    info_deposits: "deposits",
    info_invest: "invest",
    info_cashback: "cashback",
    info_fraud: "fraud",
    info_fz115: "fz115",
    info_taxes: "taxes",
    info_debt: "debt",
    info_budget: "budget",
    info_cushion: "cushion",
    info_pension: "pension",
    info_entrepreneur: "entrepreneur",
    info_family: "family",
  };

  if (kbMap[intent.type]) {
    const kbText = KB[kbMap[intent.type]];
    const personalNote = buildPersonalNote(ctx, intent.type);
    return {
      text: kbText + (personalNote ? "\n\n" + personalNote : ""),
      tips: getTips(ctx),
      products: getProducts(ctx, intent.type),
    };
  }

  // ── 6. Конверсационный fallback ───────────────────────────────────────────

  return {
    text: conversationalFallback(ctx, q, lq, prevQ, tone, name, nums, scenario),
    tips: getTips(ctx),
    products: getProducts(ctx, scenario),
  };
}

function conversationalFallback(
  ctx: KashikContext,
  q: string,
  lq: string,
  prevQ: string,
  tone: string,
  name: string,
  nums: number[],
  scenario: string,
): string {
  if (/привет|здравствуй|добрый|хай|хей/i.test(lq)) {
    const greeting = name ? `Привет, ${name}!` : "Привет!";
    return `${greeting} Я Кэшик — финансовый советник.\n\nМогу посчитать ипотеку, вклады, налоговые вычеты, проанализировать ваш бюджет, объяснить про инвестиции и кешбэк.\n\nМожно вводить произвольные данные прямо в сообщение:\nзарплата 120к, аренда 35к, кредит 15к/мес, остаток 80к — разберу и дам детальный анализ.`;
  }

  if (/спасибо|спс|благодар/i.test(lq)) {
    return `Пожалуйста${name ? `, ${name}` : ""}! Если появятся ещё вопросы — пишите. Финансовые решения лучше принимать с цифрами, а не интуицией.`;
  }

  if (/что.*умеешь|что.*можешь|помоги|как.*работаешь/i.test(lq)) {
    return `**Умею:**\n\n**Считать (с подробными таблицами):**\n• Ипотека — платёж, переплата, сравнение льготных и рыночной ставок\n• Вклад — доход с капитализацией, сравнение сроков\n• Налоговые вычеты — ИИС, лечение, обучение, квартира\n• Бюджет — 50/30/20, детальный анализ трат\n• Долги — стратегия погашения, сравнение лавина/снежный ком\n• Пенсионный капитал — сколько накопится за N лет\n\n**Анализировать произвольные данные:**\nПросто напишите: зарплата 120к, аренда 35к, кредит 15к/мес — дам полный анализ с диагностикой и рекомендациями.\n\n**Объяснять:**\n• Льготные ипотечные программы\n• Инвестиции (ОФЗ, БПИФ, ИИС)\n• Кешбэк-карты под ваши категории\n• Защита от мошенников, 115-ФЗ\n\nСпрашивайте!`;
  }

  if (/с чего.*начать|новичок|начинающ|первый.*шаг/i.test(lq)) {
    const inc = ctx.monthlyIncome;
    return `**5 первых шагов в личных финансах:**\n\n1. **Подушка безопасности** — ${inc ? RU(inc * 3) : "3 мес расходов"} на накопительном счёте (Газпромбанк 16%)\n2. **Правило 50/30/20** — автоперевод 20% в день зарплаты\n3. **Аудит подписок** — найдите призраков, 1 500-3 000 ₽/мес в среднем\n4. **Кешбэк-карты** — Ozon (продукты 3-7%) + Альфа CashBack (АЗС 10%, кафе 5%)\n5. **ИИС** — если есть официальный НДФЛ, государство вернёт до 52 000 ₽/год\n\nНачните с первого — он самый важный. Что из этого уже есть?`;
  }

  if (/инфляция|инфляц/i.test(lq)) {
    return `**Инфляция в России — апрель 2026:**\n\n25 апреля ЦБ снизил ставку до **14,5%** — третье снижение с октябрьского пика 21%. Инфляция замедляется.\nПрогноз ЦБ на 2026: 5-6% г/г, цель 4% к 2027.\n\n**Что это значит для вас:**\n• Вклады под 16-17% — реальный доход **выше инфляции на ~10%**\n• Ставки по вкладам начнут снижаться в мае — фиксируйте прямо сейчас\n• Рыночная ипотека постепенно дешевеет\n\nИсточник: cbr.ru/dkp, rosstat.gov.ru`;
  }

  if (/ключ.*ставка|ставка цб|цб.*ставк/i.test(lq)) {
    return `**Ключевая ставка ЦБ — актуально на 25 апреля 2026:**\n\n✅ ЦБ **снизил** ставку с 15% до **14,5%** — третье снижение с октябрьского пика 21%.\nПрогноз аналитиков на конец 2026: 12-13%.\n\n**Что делать прямо сейчас:**\n• **Вклады** — срочно фиксируйте 16-17% на 6-12 мес. Банки снизят ставки в течение 1-2 недель.\n• **Длинные ОФЗ** — отличный момент: при снижении КС до 12% тело вырастет на 15-25%.\n• **Ипотека** — рыночная постепенно упадёт. При снижении до 12-13% выгодно рефинансироваться.\n\nИсточник: cbr.ru/press/pr/ · 25.04.2026`;
  }

  if (/рубл|курс.*долл|курс.*евро|валют/i.test(lq)) {
    return `Я специализируюсь на финансовом планировании, а не на курсах валют.\n\n**По теме защиты от девальвации:**\n• ОФЗ-ИН (индексированные на инфляцию) — защита от обесценивания\n• Диверсификация: часть в вкладах, часть в облигациях, часть в акциях\n• Реальные активы (недвижимость) как долгосрочная защита\n\nЧто именно интересует?`;
  }

  // Если вводят цифры — умно реагируем
  if (nums.length === 1 && nums[0] > 10000) {
    const n = nums[0];
    const nStr = n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + " млн" : RU(n);

    if (n > 500_000 && scenario === "mortgage") {
      return `Вы указали ${nStr}. Считаю как сумму ипотеки?\n\nНапишите подробнее: ипотека ${nStr} на 20 лет под 6% — рассчитаю платёж, переплату и сравню со всеми ставками.`;
    }
    if (n < 10_000_000) {
      return `Вы указали **${nStr}**. Что с этой суммой?\n\n• вклад ${nStr} на 6 мес — рассчитаю доход с разными ставками\n• ипотека ${nStr} — платёж и сравнение программ\n• куда вложить ${nStr} — инструменты с расчётом доходности\n• кредит ${nStr} под 20% — стратегия погашения`;
    }
  }

  // Если несколько чисел — предлагаем анализ
  if (nums.length >= 2) {
    return `Вижу несколько чисел в сообщении. Хотите детальный анализ бюджета?\n\nНапишите в таком формате:\nзарплата ${RU(nums[0])}, аренда XXX, расходы XXX — разберу всё по статьям, найду возможности экономии и дам конкретные рекомендации.`;
  }

  const personalContext =
    ctx.monthlyIncome || ctx.totalBalance
      ? `\n\nВижу ваши данные — задайте конкретный вопрос и дам персональные расчёты.`
      : "";

  return `Задайте вопрос конкретнее — дам точный ответ с расчётами.\n\n**Что умею:**\n• ипотека 4 млн на 20 лет под 6% — полный расчёт + сравнение ставок\n• зарплата 120к, аренда 35к, кредит 15к/мес — детальный анализ бюджета\n• вклад 300 000 на 3 мес — доход и где лучшая ставка\n• вычет за лечение 60 000 — возврат НДФЛ\n• куда вложить 200 000 — инструменты с доходностью\n• долг 500 000 под 20%, плачу 20 000/мес — стратегия погашения${personalContext}`;
}
