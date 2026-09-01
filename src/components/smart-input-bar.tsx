"use client";

/**
 * SmartInputBar — голосовой ввод, сканирование QR и чеков
 *
 * Голос:   VoiceButton (высококачественный, с порталом и bottom-sheet)
 * QR:      jsQR + getUserMedia (camera) / file upload
 * Чек OCR: Tesseract.js (WASM, 100% локально) + эвристический парсер
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  QrCode, ScanLine, Camera, X, Upload,
  Loader2, CheckCircle2, AlertCircle, ZoomIn,
} from "lucide-react";
import { VoiceButton } from "@/components/voice-button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  amount: number;
}
export interface ReceiptData {
  items: ReceiptItem[];
  total: number | null;
  merchant: string;
  date: string;
  rawText: string;
}
export interface QRData {
  raw: string;
  amount?: number;
  merchant?: string;
  date?: string;
  type: "payment" | "url" | "text" | "sbp";
}

interface SmartInputBarProps {
  /** Called when voice transcription or QR/OCR data is ready to insert into input */
  onText: (text: string) => void;
  /** Called with parsed receipt — lets upload page auto-fill form fields */
  onReceipt?: (receipt: ReceiptData) => void;
  /** Called with parsed QR payment data */
  onQR?: (qr: QRData) => void;
  placeholder?: string;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse Russian fiscal QR codes (FNS format: t=…&s=…&fn=…) */
function parseRusFiscalQR(raw: string): QRData {
  const params = new URLSearchParams(raw.replace(/^[^?]*\?/, ""));
  const t = params.get("t") || "";
  const s = params.get("s") || "";
  const fn = params.get("fn") || "";
  const amount = s ? parseFloat(s.replace(",", ".")) : undefined;
  // t format: 20250815T1823
  const dateRaw = t.slice(0, 8);
  const date = dateRaw.length === 8
    ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
    : "";
  const isFiscal = fn.length >= 10 || raw.includes("fn=") || raw.includes("FN=");
  return {
    raw,
    amount: amount || undefined,
    date: date || undefined,
    type: isFiscal ? "sbp" : raw.startsWith("http") ? "url" : "text",
  };
}

/** Parse SBP / bank payment QR (ST00012…) */
function parseSBPQR(raw: string): QRData {
  // ST00012|Name=…|PersonalAcc=…|Sum=…
  const fields: Record<string, string> = {};
  raw.split("|").forEach((p) => {
    const [k, ...v] = p.split("=");
    if (k && v.length) fields[k.trim()] = v.join("=").trim();
  });
  const sum = fields["Sum"] || fields["sum"];
  const amount = sum ? parseFloat(sum) / 100 : undefined; // kopecks → rubles
  const merchant = fields["Name"] || fields["PayeeName"] || fields["name"] || undefined;
  return { raw, amount, merchant, type: "payment" };
}

function parseQR(raw: string): QRData {
  if (raw.startsWith("ST00012") || raw.includes("PersonalAcc=")) return parseSBPQR(raw);
  if (raw.includes("fn=") || raw.includes("FN=") || raw.includes("&s=")) return parseRusFiscalQR(raw);
  const urlAmount = raw.match(/[?&]sum=(\d+\.?\d*)/i)?.[1];
  if (raw.startsWith("http")) return { raw, type: "url", amount: urlAmount ? parseFloat(urlAmount) : undefined };
  return { raw, type: "text" };
}

/** Format QR data into a human-readable string for the chat input */
function qrToText(qr: QRData): string {
  const parts: string[] = [];
  if (qr.type === "sbp" || qr.type === "payment") parts.push("📱 QR-платёж");
  if (qr.merchant) parts.push(`Магазин: ${qr.merchant}`);
  if (qr.amount) parts.push(`Сумма: ${qr.amount.toLocaleString("ru-RU")} ₽`);
  if (qr.date) parts.push(`Дата: ${qr.date}`);
  if (parts.length === 0) return qr.raw.slice(0, 200);
  return parts.join(", ");
}

/** Format receipt data into a human-readable string */
function receiptToText(r: ReceiptData): string {
  const parts: string[] = [];
  if (r.merchant) parts.push(`Магазин: ${r.merchant}`);
  if (r.date) parts.push(`Дата: ${r.date}`);
  if (r.total != null) parts.push(`Итого: ${r.total.toLocaleString("ru-RU")} ₽`);
  if (r.items.length > 0) {
    parts.push(`Позиции: ${r.items.slice(0, 4).map((i) => `${i.name} ${i.amount}₽`).join(", ")}`);
  }
  return parts.join(", ") || r.rawText.slice(0, 300);
}

// ─── OCR receipt parser ───────────────────────────────────────────────────────

/** Extract structured receipt data from raw OCR text */
function parseReceiptText(text: string): ReceiptData {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Merchant: usually first non-empty line OR line with ООО/ИП/ОАО
  let merchant = "";
  for (const line of lines.slice(0, 6)) {
    if (/ООО|ИП|ОАО|ЗАО|ПАО|магазин|shop|market|store/i.test(line)) {
      merchant = line.replace(/["«»]/g, "").trim();
      break;
    }
  }
  if (!merchant && lines.length > 0) merchant = lines[0].slice(0, 40);

  // Date: DD.MM.YYYY or YYYY-MM-DD or DD/MM/YYYY
  const dateMatch = text.match(/(\d{2}[./\-]\d{2}[./\-]\d{2,4})/);
  let date = dateMatch?.[1] || "";
  if (date) {
    const parts = date.split(/[./\-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length === 4) date = `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
      else if (a.length === 4) date = `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    }
  }

  // Total: look for «ИТОГ», «ИТОГО», «TOTAL», «К ОПЛАТЕ», «Сумма» followed by digits
  let total: number | null = null;
  const totalMatch = text.match(/(?:итог[оa]?|total|к\s*оплате|сумма)[:\s*=]*(\d[\d\s,.']*)/i);
  if (totalMatch) {
    total = parseFloat(totalMatch[1].replace(/\s/g, "").replace(",", ".").replace("'", ""));
  }
  // Fallback: last number on a line that looks like amount
  if (total === null) {
    const amounts = [...text.matchAll(/(\d{1,6}[,.]?\d{0,2})\s*(?:₽|руб|RUB)?/g)]
      .map((m) => parseFloat(m[1].replace(",", ".")))
      .filter((n) => n > 0 && n < 1_000_000);
    if (amounts.length) total = Math.max(...amounts);
  }

  // Items: lines with a price pattern (text followed by digits)
  const items: ReceiptItem[] = [];
  for (const line of lines) {
    if (/итог|total|кассир|чек|фискальн|инн|кпп|ббс|смена|дата|время|спасибо/i.test(line)) continue;
    const m = line.match(/^(.{2,40?})\s+(\d{1,6}[,.]?\d{0,2})(?:\s|$)/);
    if (m) {
      const amount = parseFloat(m[2].replace(",", "."));
      if (amount > 0 && amount < 100_000) {
        items.push({ name: m[1].trim().replace(/[*×x]\s*\d+/, "").trim(), amount });
      }
    }
  }

  return { items: items.slice(0, 20), total, merchant, date, rawText: text };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Mode = "idle" | "qr" | "receipt";

export function SmartInputBar({ onText, onReceipt, onQR, className = "" }: SmartInputBarProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<QRData | null>(null);
  const [receiptResult, setReceiptResult] = useState<ReceiptData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileRef = useRef<HTMLInputElement>(null);

  // ── cleanup ──────────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (qrIntervalRef.current) { clearInterval(qrIntervalRef.current); qrIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCameraActive(false);
  }, []);

  const close = useCallback(() => {
    stopCamera();
    setMode("idle");
    setError(null);
    setQrResult(null);
    setReceiptResult(null);
    setProcessing(false);
  }, [stopCamera]);

  // cleanup on unmount
  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  // ── QR SCANNER ───────────────────────────────────────────────────────────────

  const startQRCamera = useCallback(async () => {
    setError(null);
    setProcessing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setProcessing(false);
      }

      // Load jsQR lazily
      const { default: jsQR } = await import("jsqr");

      qrIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState < 2) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          const qr = parseQR(code.data);
          setQrResult(qr);
          stopCamera();
        }
      }, 150);
    } catch (err: unknown) {
      setProcessing(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Разрешите доступ к камере в браузере.");
      } else {
        setError("Не удалось открыть камеру. Загрузите файл с QR-кодом.");
      }
    }
  }, [stopCamera]);

  const openQRMode = () => {
    close();
    setMode("qr");
    startQRCamera();
  };

  const handleQRFile = async (file: File) => {
    setError(null);
    setProcessing(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { default: jsQR } = await import("jsqr");
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
      setProcessing(false);
      if (code?.data) {
        setQrResult(parseQR(code.data));
      } else {
        setError("QR-код не найден. Попробуйте другое изображение или улучшите освещение.");
      }
    } catch {
      setProcessing(false);
      setError("Не удалось обработать изображение.");
    }
  };

  const confirmQR = () => {
    if (!qrResult) return;
    onText(qrToText(qrResult));
    onQR?.(qrResult);
    close();
  };

  // ── RECEIPT OCR ──────────────────────────────────────────────────────────────

  const openReceiptMode = () => {
    close();
    setMode("receipt");
  };

  const processReceiptFile = async (file: File) => {
    setError(null);
    setProcessing(true);
    setReceiptResult(null);
    try {
      // Load Tesseract lazily
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(file, "rus+eng", {
        logger: () => {}, // suppress progress logs
      });
      const receipt = parseReceiptText(data.text);
      setReceiptResult(receipt);
      setProcessing(false);
    } catch {
      setProcessing(false);
      setError("Ошибка распознавания. Убедитесь, что текст на чеке чёткий.");
    }
  };

  const confirmReceipt = () => {
    if (!receiptResult) return;
    onText(receiptToText(receiptResult));
    onReceipt?.(receiptResult);
    close();
  };

  return (
    <div className={`relative ${className}`}>
      {/* ── Button row ── */}
      <div className="flex items-center gap-1">
        {/* Voice button — high quality, portal-based */}
        <VoiceButton onConfirm={onText} size="md" variant="default" />

        {/* QR scanner button */}
        <button
          onClick={openQRMode}
          title="Сканировать QR-код"
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all border ${
            mode === "qr"
              ? "bg-[#3629B7]/10 border-[#3629B7]/30 text-[#3629B7]"
              : "bg-[#F5F5F7] border-[#E5E5EA] text-[#8E8E93] hover:text-[#3629B7] hover:border-[#3629B7]/30 hover:bg-[#3629B7]/5"
          }`}
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Receipt OCR button */}
        <button
          onClick={openReceiptMode}
          title="Сканировать чек"
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all border ${
            mode === "receipt"
              ? "bg-[#FF9500]/10 border-[#FF9500]/30 text-[#FF9500]"
              : "bg-[#F5F5F7] border-[#E5E5EA] text-[#8E8E93] hover:text-[#FF9500] hover:border-[#FF9500]/30 hover:bg-[#FF9500]/5"
          }`}
        >
          <ScanLine className="w-4 h-4" />
        </button>
      </div>

      {/* ── Panels ── */}

      {/* QR PANEL */}
      {mode === "qr" && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl border border-[#E5E5EA] bg-white shadow-2xl shadow-black/10 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F7]">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#3629B7]" />
              <span className="text-sm font-semibold text-[#303030]">Сканер QR-кода</span>
            </div>
            <button onClick={close} className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center hover:bg-[#E5E5EA]">
              <X className="w-3.5 h-3.5 text-[#8E8E93]" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Camera viewfinder */}
            {!qrResult && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scanning overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-40 h-40">
                      {/* Corner markers */}
                      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                        <div
                          key={i}
                          className={`absolute w-6 h-6 border-[#3629B7] ${pos}`}
                          style={{
                            borderTopWidth: i < 2 ? 3 : 0,
                            borderBottomWidth: i >= 2 ? 3 : 0,
                            borderLeftWidth: i % 2 === 0 ? 3 : 0,
                            borderRightWidth: i % 2 === 1 ? 3 : 0,
                            borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0",
                          }}
                        />
                      ))}
                      {/* Scanning line */}
                      <div className="absolute inset-x-2 h-0.5 bg-[#3629B7]/80 shadow-lg shadow-[#3629B7]/50"
                        style={{ animation: "scan-line 2s ease-in-out infinite", top: "50%" }}
                      />
                    </div>
                  </div>
                )}
                {processing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* QR result */}
            {qrResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20">
                  <CheckCircle2 className="w-5 h-5 text-[#34C759] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#34C759] mb-0.5">QR распознан</p>
                    <p className="text-xs text-[#303030] truncate">{qrResult.type === "sbp" ? "СБП / Оплата" : qrResult.type === "payment" ? "Платёж" : qrResult.type === "url" ? "Ссылка" : "Текст"}</p>
                  </div>
                </div>
                {qrResult.merchant && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[#8E8E93]">Получатель</span>
                    <span className="font-medium text-[#303030] truncate max-w-[160px]">{qrResult.merchant}</span>
                  </div>
                )}
                {qrResult.amount && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[#8E8E93]">Сумма</span>
                    <span className="font-bold text-[#303030]">{qrResult.amount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
                {qrResult.date && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[#8E8E93]">Дата</span>
                    <span className="font-medium text-[#303030]">{qrResult.date}</span>
                  </div>
                )}
                <details className="text-[10px] text-[#8E8E93]">
                  <summary className="cursor-pointer flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Сырые данные</summary>
                  <p className="mt-1 break-all font-mono bg-[#F5F5F7] rounded p-2">{qrResult.raw.slice(0, 300)}</p>
                </details>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/15">
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <p className="text-xs text-[#FF3B30] leading-relaxed">{error}</p>
              </div>
            )}

            {/* File upload fallback */}
            {!qrResult && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQRFile(f); }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed border-[#E5E5EA] text-[#8E8E93] text-xs hover:border-[#3629B7]/40 hover:text-[#3629B7] hover:bg-[#3629B7]/5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> Загрузить изображение с QR
                </button>
              </>
            )}

            <div className="flex gap-2">
              {qrResult ? (
                <>
                  <button onClick={() => { setQrResult(null); startQRCamera(); }}
                    className="flex-1 h-9 rounded-xl border border-[#E5E5EA] text-[#8E8E93] text-xs font-medium hover:bg-[#F5F5F7] transition-colors">
                    Сканировать ещё
                  </button>
                  <button onClick={confirmQR}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white text-xs font-semibold transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Использовать
                  </button>
                </>
              ) : (
                <button onClick={close}
                  className="flex-1 h-9 rounded-xl border border-[#E5E5EA] text-[#8E8E93] text-xs font-medium hover:bg-[#F5F5F7] transition-colors">
                  Отмена
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT OCR PANEL */}
      {mode === "receipt" && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl border border-[#E5E5EA] bg-white shadow-2xl shadow-black/10 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F7]">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-[#FF9500]" />
              <span className="text-sm font-semibold text-[#303030]">Сканер чека</span>
            </div>
            <button onClick={close} className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center hover:bg-[#E5E5EA]">
              <X className="w-3.5 h-3.5 text-[#8E8E93]" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {!receiptResult && !processing && (
              <>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FF9500]/8 border border-[#FF9500]/15">
                  <ScanLine className="w-4 h-4 text-[#FF9500] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#FF9500]">OCR-распознавание</p>
                    <p className="text-xs text-[#FF9500]/80 mt-0.5 leading-relaxed">
                      Сделайте фото чека или загрузите скриншот. Данные обрабатываются локально в браузере.
                    </p>
                  </div>
                </div>

                <input ref={ocrFileRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processReceiptFile(f); }} />

                <button
                  onClick={() => ocrFileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-[#FF9500]/30 bg-[#FF9500]/3 hover:bg-[#FF9500]/8 hover:border-[#FF9500]/50 transition-all cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-[#FF9500]" />
                  <span className="text-sm font-semibold text-[#FF9500]">Фото чека или загрузить</span>
                  <span className="text-xs text-[#8E8E93]">PNG, JPG — чем чётче, тем точнее</span>
                </button>

                <div className="space-y-1.5 text-[10px] text-[#8E8E93]">
                  {[
                    "📸 Держите чек ровно при хорошем освещении",
                    "🔍 Убедитесь, что итоговая сумма чётко видна",
                    "🏪 Распознаём: магазин, сумму, дату, позиции",
                  ].map((tip, i) => <p key={i}>{tip}</p>)}
                </div>
              </>
            )}

            {processing && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-[#FF9500]/20 border-t-[#FF9500] animate-spin" />
                  <ScanLine className="w-6 h-6 text-[#FF9500] absolute inset-0 m-auto" />
                </div>
                <p className="text-sm font-semibold text-[#303030]">Распознаём текст...</p>
                <p className="text-xs text-[#8E8E93] text-center">Tesseract OCR работает локально<br />Займёт 5–15 секунд</p>
              </div>
            )}

            {receiptResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20">
                  <CheckCircle2 className="w-5 h-5 text-[#34C759] shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-[#34C759]">Чек распознан</p>
                    {receiptResult.merchant && <p className="text-xs text-[#303030] truncate">{receiptResult.merchant}</p>}
                  </div>
                </div>

                {receiptResult.total != null && (
                  <div className="flex items-center justify-between px-1 text-sm">
                    <span className="text-[#8E8E93]">Итого</span>
                    <span className="font-bold text-[#303030]">{receiptResult.total.toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
                {receiptResult.date && (
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-[#8E8E93]">Дата</span>
                    <span className="font-medium text-[#303030]">{receiptResult.date}</span>
                  </div>
                )}

                {receiptResult.items.length > 0 && (
                  <div className="rounded-xl border border-[#E5E5EA] overflow-hidden">
                    <p className="text-[10px] font-semibold text-[#8E8E93] uppercase px-3 py-1.5 bg-[#F5F5F7] border-b border-[#E5E5EA]">
                      Позиции ({receiptResult.items.length})
                    </p>
                    <div className="max-h-32 overflow-y-auto divide-y divide-[#F5F5F7]">
                      {receiptResult.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <span className="text-[#303030] truncate max-w-[160px]">{item.name}</span>
                          <span className="font-medium text-[#303030] shrink-0 ml-2">{item.amount} ₽</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">{error}</p>
                  </div>
                )}

                <details className="text-[10px] text-[#8E8E93]">
                  <summary className="cursor-pointer flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Исходный текст OCR</summary>
                  <p className="mt-1 break-words font-mono bg-[#F5F5F7] rounded p-2 max-h-24 overflow-y-auto text-[9px] leading-relaxed">{receiptResult.rawText.slice(0, 500)}</p>
                </details>
              </div>
            )}

            {error && !receiptResult && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/15">
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <p className="text-xs text-[#FF3B30] leading-relaxed">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              {receiptResult ? (
                <>
                  <button
                    onClick={() => { setReceiptResult(null); setError(null); ocrFileRef.current?.click(); }}
                    className="flex-1 h-9 rounded-xl border border-[#E5E5EA] text-[#8E8E93] text-xs font-medium hover:bg-[#F5F5F7] transition-colors"
                  >
                    Другой чек
                  </button>
                  <button onClick={confirmReceipt}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#FF9500] hover:bg-[#e08800] text-white text-xs font-semibold transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Использовать
                  </button>
                </>
              ) : (
                <button onClick={close}
                  className="flex-1 h-9 rounded-xl border border-[#E5E5EA] text-[#8E8E93] text-xs font-medium hover:bg-[#F5F5F7] transition-colors">
                  Отмена
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS for scan line animation */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-60px); opacity: 0.5; }
          50% { transform: translateY(60px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
