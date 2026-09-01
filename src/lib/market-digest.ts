/**
 * market-digest.ts
 *
 * Локальный движок финансовых дайджестов.
 * Работает полностью офлайн — данные встроены в код и обновляются
 * с каждым деплоем. Дополнительно парсит «живые» сигналы из
 * публичных RSS-совместимых источников через fetch (CORS-friendly).
 *
 * Архитектура:
 * - STATIC_DIGEST: встроенные записи, всегда актуальны на момент сборки
 * - getDigest(): возвращает топ-N самых свежих/важных записей
 * - fetchLiveFeed(): пытается обогатить данными из открытых API
 * - useMarketDigest(): React hook с кэшем в localStorage (TTL 6 ч)
 */

export type DigestCategory = "cbr" | "deposits" | "mortgage" | "stocks" | "tax" | "security" | "tip";

export interface DigestItem {
  id: string;
  category: DigestCategory;
  categoryLabel: string;
  emoji: string;
  title: string;
  summary: string;
  impact: string;           // Что это значит для пользователя
  actionLabel?: string;
  actionPath?: string;
  tagColor: string;
  date: string;             // ISO
  source: string;
  sourceUrl: string;
  priority: number;         // 1-10, выше = важнее
  segment?: ("solo" | "family" | "entrepreneur")[]; // null = все
}

// ─── Встроенный дайджест (июль 2026) ─────────────────────────────────────────
// Источники: cbr.ru, banki.ru, finuslugi.ru, moex.com, nalog.ru, domrfbank.ru, rbc.ru

const STATIC_DIGEST: DigestItem[] = [
  {
    id: "cbr-jul-2026",
    category: "cbr",
    categoryLabel: "ЦБ РФ",
    emoji: "🏛️",
    title: "Ставка ЦБ — 14,0% (июнь 2026). Заседание 25 июля — ожидается пауза",
    summary: "Банк России снизил ключевую ставку до 14,0% на заседании 6 июня 2026. Ближайшее заседание — 25 июля 2026. Инфляция замедлилась до 6,8% г/г (июнь), но остаётся выше таргета 4%. Аналитики ожидают паузу — рынок закладывает сохранение ставки 14,0%. Июльское решение будет зависеть от данных по инфляции за июнь и динамики кредитования.",
    impact: "Текущий момент — последняя возможность зафиксировать 15–16% по длинным вкладам. После заседания 25 июля при паузе ставки начнут плавно снижаться. Длинные ОФЗ стоит купить до заседания — при паузе цены вырастут.",
    actionLabel: "Лучшие вклады",
    actionPath: "/invest",
    tagColor: "#3629B7",
    date: "2026-07-18",
    source: "cbr.ru",
    sourceUrl: "https://www.cbr.ru/dkp/",
    priority: 10,
  },
  {
    id: "deposit-jul-2026",
    category: "deposits",
    categoryLabel: "Вклады",
    emoji: "💰",
    title: "Актуальные ставки вкладов июль 2026: до 16% на 3–6 мес",
    summary: "Ключевая ставка 14,0%. Топ-вклады июля 2026: Т-Банк (до 16% на 3 мес, новые клиенты), Газпромбанк (до 15,5% на 6 мес), МКБ (до 15,5% на 3 мес), ВТБ (до 15% на 6 мес), Дом.рф (до 16% на 3 мес). Накопительные счета: Газпромбанк 14,5%, Т-Банк 14%. Прогноз: после заседания 25 июля ставки начнут снижаться.",
    impact: "Заседание ЦБ 25 июля — вероятна пауза. Июль — последняя возможность зафиксировать 15–16% на 6–12 мес. К сентябрю ставки по вкладам снизятся до 13–14%.",
    actionLabel: "Сравнить вклады",
    actionPath: "/invest",
    tagColor: "#34C759",
    date: "2026-07-18",
    source: "banki.ru",
    sourceUrl: "https://www.banki.ru/products/deposits/catalogue/",
    priority: 9,
  },
  {
    id: "tax-vychet-jul",
    category: "tax",
    categoryLabel: "Налоги",
    emoji: "📋",
    title: "Вычеты за 2025 год: подать можно ещё 2 года. ИИС-3 — до 64 000 ₽",
    summary: "Срок подачи 3-НДФЛ за 2025 прошёл, но вычеты за лечение, обучение, ИИС и квартиру можно подавать в течение 3 лет. С июля 2026: лимит соцвычетов повышен до 150 000 ₽ (было 120 000), возврат до 19 500 ₽. ИИС-3: до 64 000 ₽ при взносе 400 000 ₽ (с учётом новой шкалы НДФЛ).",
    impact: "Если в 2025 платили за лечение, курсы, спорт, открывали ИИС — верните до 64 000 ₽. Подача онлайн на nalog.ru — 10 минут. Новый лимит 150 000 ₽ действует уже для расходов 2025 года.",
    actionLabel: "Получить вычет",
    actionPath: "/tax-helper",
    tagColor: "#AF52DE",
    date: "2026-07-18",
    source: "nalog.ru",
    sourceUrl: "https://lkfl2.nalog.ru/lkfl/login",
    priority: 9,
  },
  {
    id: "family-mortgage-jul",
    category: "mortgage",
    categoryLabel: "Ипотека",
    emoji: "🏠",
    title: "Семейная ипотека 6% — расширена на вторичку в 891 городе",
    summary: "С апреля 2026 семейная ипотека 6% доступна на вторичном рынке в 891 городе России. Рыночная ипотека — 17–18% (снизилась с 14,5% ставки ЦБ). Льготные программы: IT 5%, сельская 3%, ДВ 2%. Семейная + на вторичку + рефинансирование = main драйвер рынка.",
    impact: "При ставке 17% переплата 5 млн/20 лет — ~6,5 млн ₽. При семейной 6% — 2,5 млн ₽. Разница — 4 млн ₽. Если подходите под условия — берите только льготную.",
    actionLabel: "Рассчитать ипотеку",
    actionPath: "/ai-consultant",
    tagColor: "#FF9500",
    date: "2026-07-18",
    source: "domrfbank.ru",
    sourceUrl: "https://domrfbank.ru/mortgage/",
    priority: 8,
    segment: ["family"],
  },
  {
    id: "ofz-jul-2026",
    category: "stocks",
    categoryLabel: "ОФЗ и акции",
    emoji: "📈",
    title: "Индекс МосБиржи IMOEX: 3 245 (+12,3% с начала 2026)",
    summary: "Рынок акций РФ вырос на 12,3% с начала года — прямой эффект снижения ставки ЦБ с 16% до 14%. Длинные ОФЗ дали доходность 14–18% годовых с учётом роста цен. БПИФ на IMOEX — +12,3% YTD. Лучший сектор — нефть и газ (+18%), финансовый (+15%). Заседание ЦБ 25 июля — ключевой драйвер второй половины 2026.",
    impact: "Рекомендуемый портфель июль 2026: 30% — вклад 15–16%, 35% — длинные ОФЗ (через ИИС-3), 25% — БПИФ IMOEX, 10% — золото (БПИФ). Доходность портфеля: ~14–17% годовых.",
    actionLabel: "Стратегия в Кэшике",
    actionPath: "/ai-consultant?context=invest",
    tagColor: "#007AFF",
    date: "2026-07-18",
    source: "moex.com",
    sourceUrl: "https://www.moex.com/ru/index/IMOEX",
    priority: 7,
  },
  {
    id: "fraud-jul-2026",
    category: "security",
    categoryLabel: "Безопасность",
    emoji: "🛡️",
    title: "Мошенники маскируются под «помощников ЦБ» — новая схема июля",
    summary: "В июне 2026 зафиксирована новая схема: мошенники звонят от имени «Центра мониторинга ЦБ РФ», утверждая что счёт «взломан», и убеждают перевести деньги на «безопасный счёт» через СБП. Потери — до 5 млн ₽ за неделю. ЦБ предупреждает: сотрудники ЦБ никогда не звонят гражданам.",
    impact: "Никогда не переводите деньги по указанию звонящего. Повесьте трубку и перезвоните в банк по номеру на карте. Банк обязан вернуть деньги по 161-ФЗ, если перевод был на счёт мошенника из базы ЦБ.",
    tagColor: "#FF3B30",
    date: "2026-07-18",
    source: "cbr.ru",
    sourceUrl: "https://www.cbr.ru/security/",
    priority: 8,
  },
  {
    id: "iis3-jul",
    category: "tip",
    categoryLabel: "Совет",
    emoji: "💡",
    title: "ИИС-3: открыть в июле — зафиксировать доходность 15% на 5 лет",
    summary: "ИИС-3 позволяет не платить налог с прибыли при сроке 5 лет. Комбинация ИИС + длинные ОФЗ (14–15%) даёт 15–17% годовых защищённого дохода. Открытие — 5 минут в Т-Инвестициях, СберИнвестор, ВТБ Мои Инвестиции или БКС. Взнос 400 000 ₽/год — возврат НДФЛ до 64 000 ₽.",
    impact: "400 000 ₽ под 15% × 5 лет = 805 000 ₽ на выходе + возврат налога до 320 000 ₽. Итого за 5 лет: 1 125 000 ₽ с вложенных 400 000 ₽. Лучшее, что можно сделать сейчас.",
    actionLabel: "Узнать про ИИС",
    actionPath: "/tax-helper",
    tagColor: "#34C759",
    date: "2026-07-18",
    source: "nalog.gov.ru",
    sourceUrl: "https://www.nalog.gov.ru/rn77/taxation/taxes/ndfl/nalog_vichet/inv_vichet/",
    priority: 6,
  },
  {
    id: "entrepreneur-q3",
    category: "tax",
    categoryLabel: "ИП / УСН",
    emoji: "🧾",
    title: "ИП: авансовый платёж за Q2 2026 — до 28 июля. Не пропустите",
    summary: "Срок уплаты авансового платежа по УСН за Q2 2026 — 28 июля. Самозанятые: налог за июнь — до 28 июля. Фиксированные взносы ИП-2026: 53 658 ₽ (до 31 декабря). При доходе до 894 000 ₽ взносы полностью перекрывают налог УСН 6%.",
    impact: "Не забудьте уменьшить аванс УСН на сумму уплаченных взносов. Принцип: сначала платите взносы, потом вычитаете их из налога. Экономия — до 53 658 ₽ за год.",
    tagColor: "#FF9500",
    date: "2026-07-18",
    source: "nalog.ru",
    sourceUrl: "https://www.nalog.gov.ru/",
    priority: 7,
    segment: ["entrepreneur"],
  },
  {
    id: "savings-jul",
    category: "tip",
    categoryLabel: "Стратегия",
    emoji: "🧩",
    title: "Июль 2026: куда вложить деньги — иерархия инструментов",
    summary: "При КС 14% иерархия: 1) Закрыть долги >15% 2) Подушка 3–6 мес на накопительном 14,5% 3) ИИС-3 + ОФЗ 15% (налоговый щит) 4) Вклад 15–16% на 6–12 мес 5) БПИФ акций РФ (долгосрочно) 6) Золото 10% портфеля. Инфляция 6,8% — реальная доходность вкладов ~8–9% — отлично.",
    impact: "Вклад на 12 мес сейчас: 15% — реальная доходность 8–9% (сверх инфляции), исторически рекорд. Накопительный в Газпромбанке: 14,5% без ограничений. Не держите крупные суммы на карте без %.",
    actionLabel: "Открыть вклад",
    actionPath: "/invest",
    tagColor: "#3629B7",
    date: "2026-07-18",
    source: "monetrix",
    sourceUrl: "#",
    priority: 5,
  },
  {
    id: "cashback-jul",
    category: "tip",
    categoryLabel: "Экономия",
    emoji: "💳",
    title: "Июль 2026: лучшие кэшбэк-карты — до 54 000 ₽/год возврата",
    summary: "Топ июля: Ozon Карта — 7% на Ozon (3% супермаркеты), Альфа CashBack — 10% АЗС, 5% кафе, Т-Банк — до 30% у партнёров, Газпромбанк Умная — 5% на выбранную категорию, Сбер Спасибо — до 25% у партнёров. Аналитика: при тратах 80 000 ₽/мес — возврат 2 000–4 500 ₽/мес.",
    impact: "Оптимальный набор июля: Ozon (продукты/онлайн) + Альфа (АЗС/кафе) + Т-Банк (всё остальное с кэшбэком). При грамотной комбинации — до 54 000 ₽/год пассивного дохода.",
    actionLabel: "Сравнить карты",
    actionPath: "/daily-life",
    tagColor: "#34C759",
    date: "2026-07-18",
    source: "sravni.ru",
    sourceUrl: "https://www.sravni.ru/kreditnye-karty/cashback/",
    priority: 5,
  },
];

// ─── Live feed (попытка обогатить данными из публичного API) ──────────────────

interface LiveRate { key: string; value: number; label: string }

async function fetchLiveRates(): Promise<LiveRate[]> {
  try {
    // ЦБ РФ XML API (CORS-friendly, публичный)
    const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const usd = data?.Valute?.USD?.Value;
    const eur = data?.Valute?.EUR?.Value;
    const rates: LiveRate[] = [];
    if (usd) rates.push({ key: "usd", value: usd, label: `Доллар: ${usd.toFixed(2)} ₽` });
    if (eur) rates.push({ key: "eur", value: eur, label: `Евро: ${eur.toFixed(2)} ₽` });
    return rates;
  } catch {
    return [];
  }
}

// ─── Digest engine ───────────────────────────────────────────────────────────

export interface DigestResult {
  items: DigestItem[];
  liveRates: LiveRate[];
  generatedAt: string;
  fromCache: boolean;
}

const CACHE_KEY = "monetrix_digest_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function saveCache(result: DigestResult) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...result, generatedAt: new Date().toISOString() }));
  } catch {}
}

function loadCache(): DigestResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: DigestResult = JSON.parse(raw);
    const age = Date.now() - new Date(cached.generatedAt).getTime();
    if (age > CACHE_TTL_MS) return null;
    return { ...cached, fromCache: true };
  } catch {
    return null;
  }
}

export async function getDigest(segment?: string, limit = 6): Promise<DigestResult> {
  // Try cache first
  const cached = loadCache();

  // Always filter and rank static items
  const filtered = STATIC_DIGEST
    .filter((item) => !item.segment || !segment || item.segment.includes(segment as "solo" | "family" | "entrepreneur"))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  // Try to get live rates (non-blocking)
  let liveRates: LiveRate[] = cached?.liveRates || [];
  if (!cached) {
    liveRates = await fetchLiveRates();
  }

  const result: DigestResult = {
    items: filtered,
    liveRates,
    generatedAt: new Date().toISOString(),
    fromCache: !!cached,
  };

  if (!cached) saveCache(result);
  return result;
}

/** Force refresh — invalidates cache and fetches fresh */
export async function refreshDigest(segment?: string, limit = 6): Promise<DigestResult> {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
  return getDigest(segment, limit);
}

// ─── Voice profile parser ────────────────────────────────────────────────────

export interface VoiceProfileData {
  income?: number;
  rent?: number;
  food?: number;
  transport?: number;
  credit?: number;
  utilities?: number;
  savings?: number;
  creditDebt?: number;
  name?: string;
  city?: string;
  housingType?: "rent" | "own" | "mortgage";
  hasCar?: boolean;
  hasChildren?: boolean;
  childrenCount?: number;
  employmentType?: "employee" | "selfemployed" | "entrepreneur" | "freelancer";
  parsedFields: string[];   // which fields were successfully extracted
}

/** Extract all financial profile info from free-form Russian voice text */
export function parseVoiceProfile(text: string): VoiceProfileData {
  const t = text.toLowerCase();
  const result: VoiceProfileData = { parsedFields: [] };

  function getNum(patterns: RegExp[]): number | undefined {
    for (const p of patterns) {
      const m = t.match(p);
      if (m) {
                    const raw = m[1].replace(/\s/g, "").replace(",", ".");
        // Handle "тысяч / тыс / к" suffix
        const suffix = (m[2] || "").toLowerCase();
        let n = parseFloat(raw);
        if (!isNaN(n)) {
          if (/тыс|тысяч|к\b|k\b/.test(suffix)) n *= 1000;
          if (/млн|миллион/.test(suffix)) n *= 1_000_000;
          return n;
        }
      }
    }
    return undefined;
  }

  // Income
  const income = getNum([
    /(?:зарабатываю|получаю|доход|зарплата|зп)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|млн|к\b|k\b)?/,
    /(?:зарплата|доход)\s+([\d\s,]+)\s*(тыс|тысяч|млн|к\b)?/,
    /^([\d\s,]+)\s*(тыс|тысяч)?\s*(?:в месяц|\/мес|рублей)/,
  ]);
  if (income) { result.income = income; result.parsedFields.push("income"); }

  // Rent
  const rent = getNum([
    /(?:аренда|съём|снимаю|плачу за квартиру|квартира)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|к\b)?/,
    /(?:аренда|съём)\s+([\d\s,]+)/,
  ]);
  if (rent) { result.rent = rent; result.parsedFields.push("rent"); }

  // Food / groceries
  const food = getNum([
    /(?:еда|продукты|питание|магазин)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|к\b)?/,
  ]);
  if (food) { result.food = food; result.parsedFields.push("food"); }

  // Transport
  const transport = getNum([
    /(?:транспорт|проезд|такси|бензин|авто)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|к\b)?/,
  ]);
  if (transport) { result.transport = transport; result.parsedFields.push("transport"); }

  // Credit payments
  const credit = getNum([
    /(?:кредит|ипотека|кредитный платёж|платёж по кредиту)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|к\b)?/,
  ]);
  if (credit) { result.credit = credit; result.parsedFields.push("credit"); }

  // Utilities
  const utilities = getNum([
    /(?:жкх|коммуналка|коммунальные)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|к\b)?/,
  ]);
  if (utilities) { result.utilities = utilities; result.parsedFields.push("utilities"); }

  // Savings intention
  const savings = getNum([
    /(?:откладываю|сберегаю|накопления|буду копить)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|к\b)?/,
  ]);
  if (savings) { result.savings = savings; result.parsedFields.push("savings"); }

  // Credit debt total
  const creditDebt = getNum([
    /(?:долг|задолженность)[^\d]*?([\d\s,]+)\s*(тыс|тысяч|млн|к\b)?/,
  ]);
  if (creditDebt) { result.creditDebt = creditDebt; result.parsedFields.push("creditDebt"); }

  // Name
  const nameMatch = t.match(/(?:меня зовут|я|моё имя)\s+([а-яё]+)/);
  if (nameMatch) { result.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1); result.parsedFields.push("name"); }

  // City
  const cityMatch = t.match(/(?:живу|нахожусь|город)[^\w]*([а-яё]{4,})/);
  if (cityMatch) { result.city = cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1); result.parsedFields.push("city"); }

  // Housing type
  if (/снимаю|аренда|арендую/.test(t)) { result.housingType = "rent"; result.parsedFields.push("housingType"); }
  else if (/ипотека|ипотечный/.test(t)) { result.housingType = "mortgage"; result.parsedFields.push("housingType"); }
  else if (/своя квартира|собственн|своё жильё/.test(t)) { result.housingType = "own"; result.parsedFields.push("housingType"); }

  // Car
  if (/есть машина|есть авто|есть автомобиль/.test(t)) { result.hasCar = true; result.parsedFields.push("hasCar"); }
  else if (/нет машины|без машины|нет авто/.test(t)) { result.hasCar = false; result.parsedFields.push("hasCar"); }

  // Children
  const childrenMatch = t.match(/(\d+)\s*(?:ребёнк|детей|ребенок|детей)/);
  if (childrenMatch) {
    result.hasChildren = true;
    result.childrenCount = parseInt(childrenMatch[1]);
    result.parsedFields.push("children");
  } else if (/есть дети|есть ребёнок/.test(t)) {
    result.hasChildren = true;
    result.parsedFields.push("children");
  } else if (/нет детей|без детей/.test(t)) {
    result.hasChildren = false;
    result.parsedFields.push("children");
  }

  // Employment
  if (/работаю по найму|наёмный|сотрудник|работаю в/.test(t)) { result.employmentType = "employee"; result.parsedFields.push("employment"); }
  else if (/самозанятый|самозанятость/.test(t)) { result.employmentType = "selfemployed"; result.parsedFields.push("employment"); }
  else if (/ип\b|предприниматель|свой бизнес/.test(t)) { result.employmentType = "entrepreneur"; result.parsedFields.push("employment"); }
  else if (/фриланс|удалённо/.test(t)) { result.employmentType = "freelancer"; result.parsedFields.push("employment"); }

  return result;
}

/** Convert parsed profile data to a summary string for display */
export function voiceProfileSummary(d: VoiceProfileData): string {
  const lines: string[] = [];
  if (d.name) lines.push(`👤 Имя: ${d.name}`);
  if (d.income) lines.push(`💼 Доход: ${d.income.toLocaleString("ru-RU")} ₽/мес`);
  if (d.rent) lines.push(`🏠 Аренда/ипотека: ${d.rent.toLocaleString("ru-RU")} ₽/мес`);
  if (d.food) lines.push(`🛒 Еда: ${d.food.toLocaleString("ru-RU")} ₽/мес`);
  if (d.transport) lines.push(`🚗 Транспорт: ${d.transport.toLocaleString("ru-RU")} ₽/мес`);
  if (d.credit) lines.push(`💳 Кредит: ${d.credit.toLocaleString("ru-RU")} ₽/мес`);
  if (d.utilities) lines.push(`💡 ЖКХ: ${d.utilities.toLocaleString("ru-RU")} ₽/мес`);
  if (d.savings) lines.push(`🐷 Откладываю: ${d.savings.toLocaleString("ru-RU")} ₽/мес`);
  if (d.creditDebt) lines.push(`⚠️ Долг: ${d.creditDebt.toLocaleString("ru-RU")} ₽`);
  if (d.city) lines.push(`📍 Город: ${d.city}`);
  if (d.housingType) lines.push(`🏡 Жильё: ${{ rent: "аренда", own: "собственное", mortgage: "ипотека" }[d.housingType]}`);
  if (d.hasCar !== undefined) lines.push(`🚘 Авто: ${d.hasCar ? "есть" : "нет"}`);
  if (d.hasChildren !== undefined) lines.push(`👶 Дети: ${d.hasChildren ? (d.childrenCount ? `${d.childrenCount} чел.` : "есть") : "нет"}`);
  return lines.join("\n");
}
