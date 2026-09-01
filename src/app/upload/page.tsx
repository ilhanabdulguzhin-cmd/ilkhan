"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import {
  addTransactions,
  addTransaction,
  parseCSVTransactions,
  getCategoryIcon,
  type UserTransaction,
} from "@/lib/user-store";
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  PenLine,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Info,
  Calendar,
  QrCode,
  ScanLine,
  Mic,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { SmartInputBar, type ReceiptData, type QRData } from "@/components/smart-input-bar";
import { VoiceButton } from "@/components/voice-button";
import { parseVoiceProfile, voiceProfileSummary, type VoiceProfileData } from "@/lib/market-digest";
import { updateProfile } from "@/lib/user-store";

type Tab = "upload" | "scan" | "voice" | "manual" | "history";

const CATEGORIES = [
  { name: "Продукты",          icon: "🛒" },
  { name: "Рестораны и кафе",  icon: "☕" },
  { name: "Транспорт",         icon: "🚌" },
  { name: "Здоровье",          icon: "💊" },
  { name: "Подписки",          icon: "📱" },
  { name: "Зарплата",          icon: "💼" },
  { name: "Кредиты",           icon: "🏦" },
  { name: "Покупки",           icon: "🛍️" },
  { name: "Одежда",            icon: "👕" },
  { name: "Авто",              icon: "🚗" },
  { name: "Развлечения",       icon: "🎬" },
  { name: "Образование",       icon: "📚" },
  { name: "Переводы",          icon: "↔️" },
  { name: "Электроника",       icon: "💻" },
  { name: "Спорт",             icon: "🏃" },
  { name: "ЖКХ",               icon: "🏠" },
  { name: "Прочее",            icon: "📌" },
];

const BANK_CSV_GUIDES = [
  {
    bank: "Сбербанк",
    color: "#21A038",
    steps: [
      "Откройте Сбербанк Онлайн (sberbank.ru или приложение)",
      "Перейдите в История операций по нужному счёту",
      'Нажмите кнопку "Скачать" / "Выгрузить" → выберите CSV или Excel',
      "Загрузите скачанный файл сюда",
    ],
    url: "https://online.sberbank.ru",
  },
  {
    bank: "Т-Банк (Тинькофф)",
    color: "#FFDD2D",
    textColor: "#000",
    steps: [
      'В приложении Т-Банк: Ещё → Операции → иконка выгрузки',
      'На сайте tbank.ru: Счета → карточка счёта → "Выписка"',
      "Выберите период и формат CSV",
      "Загрузите файл сюда",
    ],
    url: "https://www.tbank.ru",
  },
  {
    bank: "Альфа-Банк",
    color: "#EF3124",
    steps: [
      "Войдите в Альфа-Онлайн (alfabank.ru)",
      "Откройте нужный счёт → Выписка",
      "Выберите период, формат CSV, нажмите Скачать",
      "Загрузите файл сюда",
    ],
    url: "https://alfabank.ru",
  },
  {
    bank: "ВТБ",
    color: "#003087",
    steps: [
      "Откройте ВТБ Онлайн (online.vtb.ru или приложение)",
      "Перейдите в Мои продукты → выберите счёт",
      'Выписка → период → "Скачать в CSV"',
      "Загрузите файл сюда",
    ],
    url: "https://online.vtb.ru",
  },
];

export default function UploadPage() {
  const { userData, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // CSV upload state
  const [csvParsed, setCsvParsed] = useState<Omit<UserTransaction, "id">[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSaved, setCsvSaved] = useState(false);

  // Scan result state (receipt OCR / QR)
  const [scanResult, setScanResult] = useState<{ receipt?: ReceiptData; qr?: QRData; text?: string } | null>(null);

  // Voice profile state
  const [voiceText, setVoiceText] = useState("");
  const [voiceParsed, setVoiceParsed] = useState<VoiceProfileData | null>(null);
  const [voiceSaved, setVoiceSaved] = useState(false);

  // Manual entry state
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCategory, setManualCategory] = useState("Прочее");
  const [manualType, setManualType] = useState<"expense" | "income">("expense");
  const [manualSaved, setManualSaved] = useState(false);

  // Quick-add history for manual
  const [recentManual, setRecentManual] = useState<Omit<UserTransaction, "id">[]>([]);

  const handleFile = useCallback((file: File) => {
    setCsvError("");
    setCsvSaved(false);
    setCsvParsed([]);
    if (file.size > 10 * 1024 * 1024) {
      setCsvError("Файл слишком большой. Максимальный размер — 10 МБ.");
      return;
    }
    const isSupported = /\.(csv|tsv|txt)$/i.test(file.name) || ["text/csv", "text/tab-separated-values", "text/plain"].includes(file.type);
    if (!isSupported) {
      setCsvError("Поддерживаются только CSV, TSV и TXT-выписки. PDF и изображения можно обработать во вкладке Сканер.");
      return;
    }
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { setCsvError("Не удалось прочитать файл"); return; }
      const parsed = parseCSVTransactions(text);
      if (parsed.length === 0) {
        setCsvError("Не удалось распознать транзакции. Убедитесь, что CSV содержит колонки: дата, сумма, описание");
        return;
      }
      setCsvParsed(parsed);
    };
    reader.readAsText(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const saveCsvTransactions = () => {
    if (csvParsed.length === 0) return;
    addTransactions(csvParsed);
    refresh();
    setCsvSaved(true);
  };

  const resetCsv = () => {
    setCsvParsed([]);
    setCsvFileName("");
    setCsvError("");
    setCsvSaved(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /** Called when SmartInputBar delivers receipt data — pre-fill manual form */
  const handleReceiptScan = useCallback((receipt: ReceiptData) => {
    setScanResult({ receipt });
    // Pre-fill manual form
    setManualDesc(receipt.merchant || "Чек");
    if (receipt.total != null) setManualAmount(String(receipt.total));
    if (receipt.date) setManualDate(receipt.date);
    setActiveTab("manual");
  }, []);

  /** Called when SmartInputBar delivers QR data */
  const handleQRScan = useCallback((qr: QRData) => {
    setScanResult({ qr });
    if (qr.merchant) setManualDesc(qr.merchant);
    if (qr.amount) setManualAmount(String(qr.amount));
    if (qr.date) setManualDate(qr.date);
    setActiveTab("manual");
  }, []);

  const saveManualTransaction = () => {
    const amount = parseFloat(manualAmount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(amount) || !manualDesc.trim()) return;
    const finalAmount = manualType === "expense" ? -Math.abs(amount) : Math.abs(amount);

    const tx: Omit<UserTransaction, "id"> = {
      date: manualDate,
      amount: finalAmount,
      currency: "RUB",
      description: manualDesc,
      merchant: manualDesc,
      category: manualCategory,
      categoryIcon: getCategoryIcon(manualCategory),
      type: manualType,
      source: "manual",
      confidence: 1.0,
    };

    addTransaction(tx);
    refresh();
    setManualSaved(true);
    setRecentManual((prev) => [tx, ...prev].slice(0, 5));
    setManualAmount("");
    setManualDesc("");
    setTimeout(() => setManualSaved(false), 2000);
  };

  const totalIncome = csvParsed.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = csvParsed.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const recentUploads = userData?.transactions.filter((t) => t.source === "csv" || t.source === "manual") || [];

  const saveVoiceProfile = () => {
    if (!voiceParsed) return;
    const updates: Record<string, unknown> = {};
    if (voiceParsed.income)      updates.monthlyIncome  = voiceParsed.income;
    if (voiceParsed.rent)        updates.monthlyRent    = voiceParsed.rent;
    if (voiceParsed.food)        updates.monthlyFood    = voiceParsed.food;
    if (voiceParsed.transport)   updates.monthlyTransport = voiceParsed.transport;
    if (voiceParsed.credit)      updates.monthlyCredit  = voiceParsed.credit;
    if (voiceParsed.utilities)   updates.monthlyUtilities = voiceParsed.utilities;
    if (voiceParsed.savings)     updates.monthlySavings = voiceParsed.savings;
    if (voiceParsed.creditDebt)  updates.creditDebt     = voiceParsed.creditDebt;
    if (voiceParsed.city)        updates.city           = voiceParsed.city;
    if (voiceParsed.housingType) updates.housingType    = voiceParsed.housingType;
    if (voiceParsed.hasCar !== undefined) updates.hasCar = voiceParsed.hasCar;
    if (voiceParsed.hasChildren !== undefined) updates.hasChildren = voiceParsed.hasChildren;
    if (voiceParsed.childrenCount) updates.childrenCount = voiceParsed.childrenCount;
    if (voiceParsed.employmentType) updates.employmentType = voiceParsed.employmentType;
    if (voiceParsed.name) updates.name = voiceParsed.name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateProfile(updates as any);
    refresh();
    setVoiceSaved(true);
    setTimeout(() => setVoiceSaved(false), 3000);
  };

  const TABS = [
    { id: "upload" as Tab,  label: "CSV-файл",     icon: FileSpreadsheet },
    { id: "scan"   as Tab,  label: "Сканер",        icon: ScanLine },
    { id: "voice"  as Tab,  label: "Голос",          icon: Mic },
    { id: "manual" as Tab,  label: "Вручную",       icon: PenLine },
    { id: "history" as Tab, label: "История",       icon: FileText },
  ];

  return (
    <AppShell>
      <div className="space-y-5 max-w-[900px]">
        <div>
          <h2 className="text-2xl font-bold">Загрузка данных</h2>
          <p className="text-sm text-[#8E8E93] mt-1">
            Загрузите CSV-выписку, скриншот чека или добавьте вручную
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#F5F5F7] flex-wrap sm:flex-nowrap w-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-[#303030] shadow-sm"
                  : "text-[#8E8E93] hover:text-[#303030]"
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── CSV Upload ── */}
        {activeTab === "upload" && (
          <div className="space-y-4">
            {csvParsed.length === 0 && !csvSaved ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`relative p-8 sm:p-12 md:p-16 text-center cursor-pointer transition-all duration-300 ${
                      dragOver ? "bg-[#3629B7]/5 border-2 border-dashed border-[#3629B7]/40" : "hover:bg-[#F5F5F7]"
                    }`}
                  >
                    <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[#3629B7]/5 blur-3xl pointer-events-none" />
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#3629B7]/10 to-[#4a3dd4]/10 flex items-center justify-center mb-5 border border-[#3629B7]/10">
                        <UploadIcon className="w-9 h-9 text-[#3629B7]" />
                      </div>
                      <p className="text-lg font-semibold mb-2">Перетащите CSV-файл сюда</p>
                      <p className="text-sm text-[#8E8E93] mb-5">или нажмите для выбора файла</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3629B7]/10 text-[#3629B7] text-sm font-medium">
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV — Сбербанк, Т-Банк, Альфа, ВТБ и другие
                      </div>
                    </div>
                    <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={onFileChange} className="hidden" />
                  </div>
                </CardContent>
              </Card>
            ) : csvSaved ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full bg-[#34C759]/20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-[#34C759] flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Транзакции сохранены!</h3>
                  <p className="text-sm text-[#8E8E93] mb-6">{csvParsed.length} операций из {csvFileName}</p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={resetCsv} variant="outline" className="rounded-xl">
                      <UploadIcon className="w-4 h-4 mr-2" /> Загрузить ещё
                    </Button>
                    <Button onClick={() => window.location.href = "/"} className="rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white">
                      Перейти в дашборд <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3629B7]/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-[#3629B7]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{csvFileName}</p>
                          <p className="text-xs text-[#8E8E93]">{csvParsed.length} транзакций распознано</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetCsv} className="text-[#8E8E93]">
                        <RotateCcw className="w-4 h-4 mr-1" /> Сбросить
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-[#34C759]/5 border border-[#34C759]/10">
                        <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-[#34C759]" /><span className="text-xs text-[#8E8E93]">Доходы</span></div>
                        <p className="text-lg font-bold text-[#34C759]">+{totalIncome.toLocaleString("ru-RU")} ₽</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10">
                        <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-[#FF3B30]" /><span className="text-xs text-[#8E8E93]">Расходы</span></div>
                        <p className="text-lg font-bold text-[#FF3B30]">-{totalExpense.toLocaleString("ru-RU")} ₽</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#3629B7]/5 border border-[#3629B7]/10">
                        <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-[#3629B7]" /><span className="text-xs text-[#8E8E93]">Категорий</span></div>
                        <p className="text-lg font-bold text-[#3629B7]">{new Set(csvParsed.map((t) => t.category)).size}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-0">
                    <div className="px-5 py-3 border-b bg-[#F5F5F7]">
                      <span className="text-xs font-medium text-[#8E8E93]">Предпросмотр ({csvParsed.length} транзакций)</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {csvParsed.slice(0, 50).map((t, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-[#F5F5F7] transition-colors">
                          <span className="text-lg w-8 text-center">{t.categoryIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.description || "—"}</p>
                            <p className="text-xs text-[#8E8E93]">{t.category} · {t.date}</p>
                          </div>
                          <p className={`text-sm font-semibold shrink-0 ${t.amount > 0 ? "text-[#34C759]" : ""}`}>
                            {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("ru-RU")} ₽
                          </p>
                        </div>
                      ))}
                      {csvParsed.length > 50 && (
                        <div className="px-5 py-3 text-center text-xs text-[#8E8E93]">... и ещё {csvParsed.length - 50} транзакций</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Button onClick={saveCsvTransactions} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] text-white font-semibold shadow-lg shadow-[#3629B7]/20 text-base">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Сохранить {csvParsed.length} транзакций
                </Button>
              </div>
            )}

            {csvError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20">
                <AlertCircle className="w-5 h-5 text-[#FF3B30] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#FF3B30]">Ошибка парсинга</p>
                  <p className="text-xs text-[#FF3B30]/80 mt-0.5">{csvError}</p>
                </div>
              </div>
            )}

            {/* Bank guides */}
            {csvParsed.length === 0 && !csvSaved && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#303030] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#3629B7]" />
                  Как скачать выписку из банка:
                </p>
                {BANK_CSV_GUIDES.map((guide) => (
                  <Card key={guide.bank} className="overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#F5F5F7] transition-colors"
                      onClick={() => setExpandedGuide(expandedGuide === guide.bank ? null : guide.bank)}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: guide.color, color: guide.textColor || "#fff" }}
                      >
                        {guide.bank.split(" ")[0].slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[#303030] flex-1">{guide.bank}</span>
                      <span className="text-xs text-[#8E8E93]">{expandedGuide === guide.bank ? "Скрыть" : "Инструкция"}</span>
                    </button>
                    {expandedGuide === guide.bank && (
                      <div className="px-4 pb-4 space-y-2 border-t border-[#F5F5F7]">
                        {guide.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 pt-3">
                            <div className="w-5 h-5 rounded-full bg-[#3629B7]/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-[#3629B7]">{i + 1}</span>
                            </div>
                            <p className="text-sm text-[#8E8E93] leading-relaxed">{step}</p>
                          </div>
                        ))}
                        <a
                          href={guide.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs text-[#3629B7] underline font-medium"
                        >
                          Открыть {guide.bank} онлайн →
                        </a>
                      </div>
                    )}
                  </Card>
                ))}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#3629B7]" /> Формат файла
                    </p>
                    <div className="p-3 rounded-lg bg-[#F5F5F7] font-mono text-xs space-y-0.5">
                      <p className="text-[#8E8E93]"># Стандартный формат:</p>
                      <p>Дата,Сумма,Описание,Категория</p>
                      <p>01.02.2026,-1500,Пятёрочка,Продукты</p>
                      <p>01.02.2026,150000,Зарплата ООО Компания,Зарплата</p>
                    </div>
                    <p className="text-xs text-[#8E8E93] mt-2">Разделители: запятая, точка с запятой, табуляция. Даты: ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── Smart Scanner Tab ── */}
        {activeTab === "scan" && (
          <div className="space-y-4">
            {/* Privacy notice */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/15">
              <span className="text-[#34C759] text-sm shrink-0 mt-0.5">🔒</span>
              <p className="text-xs text-[#34C759] leading-relaxed">
                <strong>100% конфиденциально:</strong> всё обрабатывается прямо в браузере — OCR, QR, голос. Ничего не отправляется на сервер.
              </p>
            </div>

            {/* Three scanner cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Voice */}
              <Card className="relative overflow-hidden border-[#E5E5EA] hover:border-[#FF3B30]/30 transition-colors group">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center group-hover:bg-[#FF3B30]/20 transition-colors">
                    <Mic className="w-7 h-7 text-[#FF3B30]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#303030]">Голосовой ввод</p>
                    <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">Продиктуйте расход голосом</p>
                  </div>
                  <div className="flex justify-center">
                    <VoiceButton
                      onConfirm={(text) => {
                        const amtMatch = text.match(/(\d[\d\s,.']*)\s*(?:₽|руб|р\.?)/i);
                        if (amtMatch) setManualAmount(amtMatch[1].replace(/\s/g, ""));
                        setManualDesc(text.replace(/(\d[\d\s,.]*)\s*(?:₽|руб|р\.?)/gi, "").trim() || text);
                        setActiveTab("manual");
                      }}
                      variant="primary"
                      size="lg"
                      label="Говорить"
                    />
                  </div>
                  <p className="text-[10px] text-[#C7C7CC]">Нажмите и говорите</p>
                </CardContent>
              </Card>

              {/* QR scanner */}
              <Card className="relative overflow-hidden border-[#E5E5EA] hover:border-[#3629B7]/30 transition-colors group">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#3629B7]/10 flex items-center justify-center group-hover:bg-[#3629B7]/20 transition-colors">
                    <QrCode className="w-7 h-7 text-[#3629B7]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#303030]">QR-код чека</p>
                    <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">Сканируйте QR с бумажного или электронного чека</p>
                  </div>
                  <SmartInputBar
                    onText={() => {}}
                    onQR={handleQRScan}
                    className="flex justify-center"
                  />
                  <p className="text-[10px] text-[#C7C7CC]">Нажмите ⬛ и наведите камеру</p>
                </CardContent>
              </Card>

              {/* Receipt OCR */}
              <Card className="relative overflow-hidden border-[#E5E5EA] hover:border-[#FF9500]/30 transition-colors group">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF9500]/10 flex items-center justify-center group-hover:bg-[#FF9500]/20 transition-colors">
                    <ScanLine className="w-7 h-7 text-[#FF9500]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#303030]">Фото чека (OCR)</p>
                    <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">Сфотографируйте чек — данные заполнятся автоматически</p>
                  </div>
                  <SmartInputBar
                    onText={() => {}}
                    onReceipt={handleReceiptScan}
                    className="flex justify-center"
                  />
                  <p className="text-[10px] text-[#C7C7CC]">Нажмите 🧾 и загрузите фото</p>
                </CardContent>
              </Card>
            </div>

            {/* Last scan result indicator */}
            {scanResult && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20">
                <CheckCircle2 className="w-5 h-5 text-[#34C759] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#34C759]">
                    {scanResult.receipt ? "Чек распознан!" : scanResult.qr ? "QR-код отсканирован!" : "Данные получены!"}
                  </p>
                  <p className="text-xs text-[#8E8E93] truncate">
                    {scanResult.receipt
                      ? `${scanResult.receipt.merchant || "—"} · ${scanResult.receipt.total != null ? `${scanResult.receipt.total} ₽` : ""}`
                      : scanResult.qr
                      ? `${scanResult.qr.merchant || "Платёж"} · ${scanResult.qr.amount ? `${scanResult.qr.amount} ₽` : ""}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("manual")}
                  className="text-xs font-semibold text-[#3629B7] shrink-0"
                >
                  Редактировать →
                </button>
              </div>
            )}

            <Card className="bg-[#F5F5F7] border-0">
              <CardContent className="p-4 space-y-2.5">
                <p className="text-xs font-semibold text-[#303030]">Советы для лучшего распознавания:</p>
                {[
                  { icon: "📸", text: "Чек: держите ровно, яркое освещение, вся сумма в кадре" },
                  { icon: "📱", text: "QR: наведите камеру — сканирует автоматически без нажатий" },
                  { icon: "🎤", text: "Голос: говорите чётко — потратил 1500 рублей на продукты" },
                  { icon: "✅", text: "После сканирования форма заполняется сама — вам только проверить" },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0">{tip.icon}</span>
                    <p className="text-xs text-[#8E8E93] leading-relaxed">{tip.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Voice Profile Tab ── */}
        {activeTab === "voice" && (
          <div className="space-y-4">
            {/* Intro */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] text-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                    <Mic className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">Голосовой финансовый профиль</h3>
                    <p className="text-sm text-white/80 leading-relaxed">
                      Расскажите о своих финансах своими словами — Кэшик сам распознает доходы, расходы и ситуацию. Чем больше деталей, тем точнее советы.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example prompts */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Пример фразы — скопируйте или скажите своё:</p>
                <div className="space-y-2">
                  {[
                    { text: "Зарабатываю 120 тысяч, снимаю квартиру за 40 тысяч, на еду уходит 25 тысяч, транспорт 5 тысяч, кредит 15 тысяч в месяц, нет детей", fields: ["доход", "аренда", "еда", "транспорт", "кредит", "дети"] },
                    { text: "Доход 200 тысяч, ипотека 55 тысяч, двое детей, машина есть, коммуналка 8 тысяч, хочу откладывать 20 тысяч", fields: ["доход", "ипотека", "дети", "авто", "ЖКХ", "накопления"] },
                    { text: "Я предприниматель, зарабатываю около 300 тысяч, расходы на бизнес и себя, долг по кредиту 500 тысяч", fields: ["доход", "тип занятости", "долг"] },
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setVoiceText(ex.text.replace(/|/g, ""));
                        const parsed = parseVoiceProfile(ex.text);
                        setVoiceParsed(parsed.parsedFields.length ? parsed : null);
                        setVoiceSaved(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-[#F5F5F7] hover:bg-[#3629B7]/5 border border-transparent hover:border-[#3629B7]/20 transition-all group"
                    >
                      <p className="text-xs text-[#303030] leading-relaxed mb-2 italic group-hover:text-[#3629B7]">{ex.text}</p>
                      <div className="flex flex-wrap gap-1">
                        {ex.fields.map((f) => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[#3629B7]/8 text-[#3629B7] font-medium">{f}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Input area with voice button */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-[#303030]">Ваш финансовый профиль</Label>
                  <VoiceButton
                    onConfirm={(text) => {
                      setVoiceText((prev) => (prev ? prev + " " + text : text).trim());
                      const parsed = parseVoiceProfile((voiceText + " " + text).trim());
                      setVoiceParsed(parsed.parsedFields.length ? parsed : null);
                      setVoiceSaved(false);
                    }}
                    size="md"
                    label="Говорить"
                  />
                </div>
                <textarea
                  rows={4}
                  placeholder="Нажмите кнопку 🎤 справа и скажите или напишите здесь: Зарабатываю 150 тысяч, снимаю квартиру за 45 тысяч, на еду уходит 30 тысяч..."
                  value={voiceText}
                  onChange={(e) => {
                    setVoiceText(e.target.value);
                    const parsed = parseVoiceProfile(e.target.value);
                    setVoiceParsed(parsed.parsedFields.length ? parsed : null);
                    setVoiceSaved(false);
                  }}
                  className="w-full text-sm rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] p-3 resize-none focus:outline-none focus:border-[#3629B7]/50 focus:ring-2 focus:ring-[#3629B7]/10 leading-relaxed text-[#303030] placeholder:text-[#C7C7CC]"
                />

                {/* Parsed result */}
                {voiceParsed && voiceParsed.parsedFields.length > 0 && (
                  <div className="rounded-xl border border-[#34C759]/25 bg-[#34C759]/5 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[#34C759]/15 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                      <span className="text-xs font-semibold text-[#34C759]">
                        Распознано {voiceParsed.parsedFields.length} {voiceParsed.parsedFields.length === 1 ? "поле" : voiceParsed.parsedFields.length < 5 ? "поля" : "полей"}
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {voiceProfileSummary(voiceParsed).split("\n").map((line, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#303030] bg-white rounded-lg px-3 py-2 border border-[#E5E5EA]">
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                    {/* Budget quick-analysis */}
                    {voiceParsed.income && (
                      <div className="px-4 pb-3">
                        {(() => {
                          const inc = voiceParsed.income!;
                          const expenses = (voiceParsed.rent || 0) + (voiceParsed.food || 0) + (voiceParsed.transport || 0) + (voiceParsed.credit || 0) + (voiceParsed.utilities || 0);
                          const free = inc - expenses;
                          const debtLoad = voiceParsed.credit ? Math.round((voiceParsed.credit / inc) * 100) : null;
                          return (
                            <div className="mt-2 p-3 rounded-lg bg-[#3629B7]/8 space-y-1.5">
                              <p className="text-xs font-semibold text-[#3629B7]">💡 Быстрый анализ:</p>
                              {expenses > 0 && <p className="text-xs text-[#303030]">📊 Известные расходы: <strong>{expenses.toLocaleString("ru-RU")} ₽</strong> из <strong>{inc.toLocaleString("ru-RU")} ₽</strong></p>}
                              {free > 0 && expenses > 0 && <p className="text-xs text-[#303030]">Свободный остаток: <strong className={free < inc * 0.1 ? "text-[#FF3B30]" : free < inc * 0.2 ? "text-[#FF9500]" : "text-[#34C759]"}>{free.toLocaleString("ru-RU")} ₽</strong> ({Math.round(free/inc*100)}%)</p>}
                              {debtLoad !== null && <p className="text-xs text-[#303030]">⚠️ Долговая нагрузка: <strong className={debtLoad > 50 ? "text-[#FF3B30]" : debtLoad > 30 ? "text-[#FF9500]" : "text-[#34C759]"}>{debtLoad}%</strong> {debtLoad > 50 ? "— критично высокая" : debtLoad > 30 ? "— умеренная" : "— норма"}</p>}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {voiceText && (!voiceParsed || voiceParsed.parsedFields.length === 0) && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Не удалось распознать финансовые данные. Попробуйте включить цифры: зарабатываю 100 тысяч, аренда 40 тысяч и т.д.
                    </p>
                  </div>
                )}

                {voiceSaved && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[#34C759]/10 border border-[#34C759]/20">
                    <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                    <p className="text-xs font-semibold text-[#34C759]">Профиль обновлён! Кэшик теперь знает вашу ситуацию.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => { setVoiceText(""); setVoiceParsed(null); setVoiceSaved(false); }}
                    disabled={!voiceText}
                  >
                    Очистить
                  </Button>
                  <Button
                    onClick={saveVoiceProfile}
                    disabled={!voiceParsed || voiceParsed.parsedFields.length === 0 || voiceSaved}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] text-white font-semibold disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Сохранить профиль
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* What Kashik will use this for */}
            <Card className="bg-[#F5F5F7] border-0">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-[#303030]">Что Кэшик сделает с этими данными:</p>
                {[
                  "🎯 Рассчитает оптимальный размер подушки безопасности",
                  "💳 Оценит долговую нагрузку и предложит план выплат",
                  "💰 Покажет сколько реально можно откладывать",
                  "🏦 Подберёт вклады и карты под вашу ситуацию",
                  "📊 Сравнит ваш бюджет со средним по вашему сегменту",
                ].map((tip, i) => (
                  <p key={i} className="text-xs text-[#8E8E93] leading-relaxed">{tip}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Manual Entry ── */}
        {activeTab === "manual" && (
          <div className="space-y-4">
            {/* Scan pre-fill banner */}
            {scanResult && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20">
                <CheckCircle2 className="w-5 h-5 text-[#34C759] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#34C759]">
                    {scanResult.receipt ? "Данные из чека (OCR)" : "Данные из QR-кода"} заполнены автоматически
                  </p>
                  <p className="text-xs text-[#8E8E93]">Проверьте и при необходимости отредактируйте</p>
                </div>
                <button onClick={() => setScanResult(null)} className="text-[#8E8E93] hover:text-[#303030]">
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>
            )}
            <Card>
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#4a3dd4]/10 flex items-center justify-center">
                      <PenLine className="w-5 h-5 text-[#4a3dd4]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Добавить транзакцию</p>
                      <p className="text-xs text-[#8E8E93]">Введите данные вручную</p>
                    </div>
                  </div>
                  {/* Quick voice + scan shortcuts in manual form */}
                  <div className="flex items-center gap-1">
                    <VoiceButton
                      onConfirm={(text) => {
                        const amtMatch = text.match(/(\d[\d\s,.']*)\s*(?:₽|руб|р\.?)/i);
                        if (amtMatch) setManualAmount(amtMatch[1].replace(/\s/g, ""));
                        setManualDesc(text.replace(/(\d[\d\s,.]*)\s*(?:₽|руб|р\.?)/gi, "").trim() || text);
                      }}
                      size="md"
                    />
                    <SmartInputBar
                      onText={() => {}}
                      onReceipt={(r) => {
                        setScanResult({ receipt: r });
                        if (r.merchant) setManualDesc(r.merchant);
                        if (r.total != null) setManualAmount(String(r.total));
                        if (r.date) setManualDate(r.date);
                      }}
                      onQR={(qr) => {
                        setScanResult({ qr });
                        if (qr.merchant) setManualDesc(qr.merchant);
                        if (qr.amount) setManualAmount(String(qr.amount));
                        if (qr.date) setManualDate(qr.date);
                      }}
                    />
                  </div>
                </div>

                {/* Type toggle */}
                <div className="flex gap-1 p-1 rounded-xl bg-[#F5F5F7]">
                  <button
                    onClick={() => setManualType("expense")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                      manualType === "expense" ? "bg-[#FF3B30]/10 text-[#FF3B30] shadow-sm" : "text-[#8E8E93] hover:text-[#303030]"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" /> Расход
                  </button>
                  <button
                    onClick={() => setManualType("income")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                      manualType === "income" ? "bg-[#34C759]/10 text-[#34C759] shadow-sm" : "text-[#8E8E93] hover:text-[#303030]"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Доход
                  </button>
                </div>

                {/* Amount — big, prominent */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#8E8E93] uppercase tracking-wide">Сумма</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value.replace(/[^\d.,\s]/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && manualDesc.trim() && saveManualTransaction()}
                      className={`h-16 text-3xl font-black rounded-xl bg-[#F5F5F7] border-[#E5E5EA] pr-12 text-center tracking-tight ${
                        manualType === "expense" ? "text-[#FF3B30]" : "text-[#34C759]"
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-[#8E8E93] font-semibold">₽</span>
                  </div>
                </div>

                {/* Date & Description side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#8E8E93] uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Дата
                    </Label>
                    <Input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="h-11 rounded-xl bg-[#F5F5F7] border-[#E5E5EA] text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#8E8E93] uppercase tracking-wide">Описание</Label>
                    <Input
                      placeholder="Пятёрочка, зарплата, такси... или 🎤"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && manualAmount && saveManualTransaction()}
                      className="h-11 rounded-xl bg-[#F5F5F7] border-[#E5E5EA] text-sm"
                    />
                  </div>
                </div>

                {/* Category pills */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#8E8E93] uppercase tracking-wide">Категория</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setManualCategory(cat.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                          manualCategory === cat.name
                            ? "bg-[#3629B7] text-white border-[#3629B7] shadow-md shadow-[#3629B7]/20"
                            : "bg-white text-[#8E8E93] border-[#E5E5EA] hover:border-[#3629B7]/30 hover:text-[#303030]"
                        }`}
                      >
                        <span>{cat.icon}</span> {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={saveManualTransaction}
                  disabled={!manualAmount || !manualDesc.trim()}
                  className={`w-full h-12 rounded-xl font-semibold text-base shadow-lg transition-all disabled:opacity-40 ${
                    manualType === "expense"
                      ? "bg-gradient-to-r from-[#FF3B30] to-[#e02e24] hover:from-[#e02e24] hover:to-[#c02820] text-white shadow-[#FF3B30]/20"
                      : "bg-gradient-to-r from-[#34C759] to-[#28a745] hover:from-[#28a745] hover:to-[#1e7a35] text-white shadow-[#34C759]/20"
                  }`}
                >
                  {manualSaved ? (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> Сохранено!</>
                  ) : (
                    <><Plus className="w-5 h-5 mr-2" /> Добавить {manualType === "expense" ? "расход" : "доход"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Recent quick-add */}
            {recentManual.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="px-5 py-3 border-b bg-[#F5F5F7]">
                    <p className="text-xs font-medium text-[#8E8E93]">Только что добавлено (нажмите для повтора)</p>
                  </div>
                  {recentManual.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => { setManualDesc(t.description); setManualAmount(Math.abs(t.amount).toString()); setManualCategory(t.category); setManualType(t.type as "expense" | "income"); }}
                      className="w-full flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-[#F5F5F7] transition-colors text-left"
                    >
                      <span className="text-lg">{t.categoryIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className="text-xs text-[#8E8E93]">{t.category}</p>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ${t.amount > 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                        {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("ru-RU")} ₽
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && (
          <Card>
            <CardContent className="p-0">
              {recentUploads.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F5F5F7] flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-[#8E8E93]/40" />
                  </div>
                  <p className="text-sm font-medium text-[#8E8E93] mb-1">Нет загруженных данных</p>
                  <p className="text-xs text-[#8E8E93]/70">Загрузите CSV или добавьте транзакции вручную</p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b bg-[#F5F5F7] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#8E8E93]">{recentUploads.length} загруженных транзакций</span>
                    <div className="flex gap-2 text-xs">
                      <span className="text-[#3629B7]">CSV: {recentUploads.filter((t) => t.source === "csv").length}</span>
                      <span className="text-[#4a3dd4]">Ручной: {recentUploads.filter((t) => t.source === "manual").length}</span>
                    </div>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {recentUploads
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 100)
                      .map((t) => (
                        <div key={t.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-[#F5F5F7] transition-colors">
                          <span className="text-lg w-8 text-center">{t.categoryIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.description}</p>
                            <p className="text-xs text-[#8E8E93]">
                              {t.category} · {new Date(t.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} ·{" "}
                              <span className={t.source === "csv" ? "text-[#3629B7]" : "text-[#4a3dd4]"}>
                                {t.source === "csv" ? "CSV" : "ручной"}
                              </span>
                            </p>
                          </div>
                          <p className={`text-sm font-semibold shrink-0 ${t.amount > 0 ? "text-[#34C759]" : ""}`}>
                            {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("ru-RU")} ₽
                          </p>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
