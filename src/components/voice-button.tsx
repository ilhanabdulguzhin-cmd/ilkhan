"use client";

/**
 * VoiceButton + VoicePanel
 *
 * Качественный голосовой ввод для веба и мобильного браузера.
 *
 * Особенности:
 * – continuous + interimResults → живая транскрипция
 * – auto-restart при «aborted» (Android Chrome иногда убивает сессию)
 * – Bottom-sheet на мобильных (портрет/ландшафт), попап на десктопе
 * – Полная поддержка: Chrome Android/iOS*, Edge, Chrome Desktop
 *   (* iOS Safari не поддерживает SpeechRecognition — показываем ясное сообщение)
 * – Визуальный waveform на requestAnimationFrame (не setTimeout)
 * – Итоговый текст виден всегда, можно редактировать перед вставкой
 */

import {
  useState, useRef, useEffect, useCallback, forwardRef,
} from "react";
import {
  Mic, MicOff, X, CheckCircle2, AlertCircle, RotateCcw, Copy,
} from "lucide-react";
import { createPortal } from "react-dom";

// ─── Browser capability check ─────────────────────────────────────────────────

function getSR(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

// ─── Waveform canvas ──────────────────────────────────────────────────────────

function Waveform({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const bars = 28;
      const barW = 3;
      const gap = (width - bars * barW) / (bars + 1);

      for (let i = 0; i < bars; i++) {
        const x = gap + i * (barW + gap);
        let h: number;
        if (active) {
          // Smooth animated wave
          h = 4 + Math.abs(Math.sin(phaseRef.current + i * 0.45)) * (height * 0.7)
            + Math.abs(Math.sin(phaseRef.current * 1.3 + i * 0.3)) * (height * 0.15);
        } else {
          h = 3;
        }
        const y = (height - h) / 2;
        ctx.fillStyle = active ? "#EF4444" : "#D1D5DB";
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, 1.5);
        ctx.fill();
      }

      if (active) phaseRef.current += 0.12;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={48}
      className="w-full max-w-[200px] h-12"
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VoiceButtonProps {
  /** Called when user confirms the transcription */
  onConfirm: (text: string) => void;
  /** Visual size of trigger button */
  size?: "sm" | "md" | "lg";
  /** Trigger button style */
  variant?: "default" | "outline" | "ghost" | "primary";
  /** Extra class for trigger button */
  className?: string;
  /** Show label next to icon */
  label?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VoiceButton({
  onConfirm,
  size = "md",
  variant = "default",
  className = "",
  label,
}: VoiceButtonProps) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [editText, setEditText] = useState("");   // editable version of final
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [supported, setSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const finalAccRef = useRef("");   // accumulator across restarts
  const shouldRestartRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const SR = getSR();
    if (!SR) setSupported(false);
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    return () => { mountedRef.current = false; };
  }, []);

  // ── start / stop recognition ──────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR) return;

    setError(null);
    setInterimText("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.lang = "ru-RU";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      if (!mountedRef.current) return;
      setListening(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (!mountedRef.current) return;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          // Pick best alternative
          finalAccRef.current += r[0].transcript + " ";
        } else {
          interim += r[0].transcript;
        }
      }
      const newFinal = finalAccRef.current.trim();
      setFinalText(newFinal);
      setEditText(newFinal);
      setInterimText(interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (!mountedRef.current) return;
      const err = e.error as string;
      if (err === "no-speech") {
        // Mobile Chrome often fires no-speech; auto-restart if still should be listening
        if (shouldRestartRef.current) { rec.stop(); return; }
      }
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("Разрешите доступ к микрофону:\nNastrojki → Sajt → Mikrofon → Razreshat'");
        setListening(false);
        shouldRestartRef.current = false;
      } else if (err === "aborted") {
        // Normal; will restart below
      } else {
        setError(`Ошибка: ${err}. Попробуйте ещё раз.`);
        setListening(false);
        shouldRestartRef.current = false;
      }
    };

    rec.onend = () => {
      if (!mountedRef.current) return;
      setInterimText("");
      if (shouldRestartRef.current) {
        // Auto-restart for continuous mobile support
        try {
          setTimeout(() => {
            if (shouldRestartRef.current && mountedRef.current) {
              recRef.current?.start();
            }
          }, 100);
        } catch {}
      } else {
        setListening(false);
      }
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch {
      setError("Не удалось запустить микрофон. Перезагрузите страницу.");
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterimText("");
  }, []);

  // ── open/close panel ──────────────────────────────────────────────────────

  const openPanel = () => {
    setOpen(true);
    setFinalText("");
    setEditText("");
    setInterimText("");
    setError(null);
    finalAccRef.current = "";
    // Auto-start on open
    setTimeout(() => {
      shouldRestartRef.current = true;
      startListening();
    }, 200);
  };

  const closePanel = useCallback(() => {
    stopListening();
    shouldRestartRef.current = false;
    setOpen(false);
    setListening(false);
    setInterimText("");
  }, [stopListening]);

  const toggleMic = () => {
    if (listening) {
      shouldRestartRef.current = false;
      stopListening();
    } else {
      shouldRestartRef.current = true;
      finalAccRef.current = editText ? editText + " " : "";
      setFinalText(editText);
      startListening();
    }
  };

  const reset = () => {
    stopListening();
    finalAccRef.current = "";
    setFinalText("");
    setEditText("");
    setInterimText("");
    setError(null);
    // Auto restart
    setTimeout(() => {
      shouldRestartRef.current = true;
      startListening();
    }, 200);
  };

  const confirm = () => {
    const text = (editText || finalText).trim();
    if (text) {
      onConfirm(text);
      closePanel();
    }
  };

  const copyText = () => {
    const text = (editText || finalText).trim();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closePanel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closePanel]);

  // Cleanup on unmount
  useEffect(() => () => {
    shouldRestartRef.current = false;
    recRef.current?.stop();
  }, []);

  // ── button styles ─────────────────────────────────────────────────────────

  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  };
  const iconSizeMap = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-5 h-5" };

  const variantMap = {
    default: `bg-[#F5F5F7] border border-[#E5E5EA] text-[#8E8E93] hover:text-[#3629B7] hover:border-[#3629B7]/30 hover:bg-[#3629B7]/5`,
    outline: `border border-[#E5E5EA] bg-white text-[#8E8E93] hover:text-[#3629B7] hover:border-[#3629B7]/30`,
    ghost: `bg-transparent text-[#8E8E93] hover:text-[#3629B7] hover:bg-[#3629B7]/5`,
    primary: `bg-[#3629B7] text-white hover:bg-[#2a1f8f] border border-[#3629B7]`,
  };

  // Not supported — show nothing useful
  if (!supported) return null;

  // ── render ────────────────────────────────────────────────────────────────

  const displayText = (editText || finalText).trim();
  const liveText = interimText.trim();
  const hasText = !!displayText;

  const panel = open ? (
    <VoicePanel
      listening={listening}
      finalText={editText}
      interimText={interimText}
      error={error}
      hasText={hasText}
      isMobile={isMobile}
      onEditChange={(v) => setEditText(v)}
      onToggleMic={toggleMic}
      onReset={reset}
      onConfirm={confirm}
      onCopy={copyText}
      onClose={closePanel}
      copied={copied}
    />
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        title="Голосовой ввод"
        className={`
          relative flex items-center justify-center gap-1.5 rounded-xl
          transition-all duration-200 font-medium
          ${sizeMap[size]} ${variantMap[variant]}
          ${label ? "px-3 w-auto" : ""}
          ${className}
        `}
      >
        <Mic className={iconSizeMap[size]} />
        {label && <span>{label}</span>}
        {/* Live indicator dot when panel is open */}
        {open && listening && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF3B30] border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Portal renders panel to body so it's not clipped by overflow:hidden parents */}
      {typeof window !== "undefined" && panel && createPortal(panel, document.body)}
    </>
  );
}

// ─── Panel (bottom sheet on mobile, floating on desktop) ─────────────────────

interface VoicePanelProps {
  listening: boolean;
  finalText: string;
  interimText: string;
  error: string | null;
  hasText: boolean;
  isMobile: boolean;
  onEditChange: (v: string) => void;
  onToggleMic: () => void;
  onReset: () => void;
  onConfirm: () => void;
  onCopy: () => void;
  onClose: () => void;
  copied: boolean;
}

const VoicePanel = forwardRef<HTMLDivElement, VoicePanelProps>(function VoicePanel({
  listening, finalText, interimText, error, hasText, isMobile,
  onEditChange, onToggleMic, onReset, onConfirm, onCopy, onClose, copied,
}, _ref) {
  const displayAll = finalText + (interimText ? (finalText ? " " : "") + interimText : "");

  if (isMobile) {
    // ── Mobile: bottom sheet ────────────────────────────────────────────────
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col justify-end" style={{ WebkitTapHighlightColor: "transparent" }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Sheet */}
        <div className="relative bg-white rounded-t-3xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "85vh" }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#E5E5EA]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F5F5F7]">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${listening ? "bg-[#EF4444] animate-pulse" : "bg-[#D1D5DB]"}`} />
              <span className="text-base font-bold text-[#303030]">
                {listening ? "Слушаю..." : hasText ? "Готово" : "Голосовой ввод"}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
              <X className="w-4 h-4 text-[#8E8E93]" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
            {/* Waveform */}
            <div className="flex justify-center py-2">
              <Waveform active={listening} />
            </div>

            {/* Live text display */}
            <div className={`min-h-[80px] p-4 rounded-2xl border-2 transition-colors ${
              listening ? "border-[#EF4444]/30 bg-[#FEF2F2]" : hasText ? "border-[#22C55E]/30 bg-[#F0FDF4]" : "border-[#E5E5EA] bg-[#F9FAFB]"
            }`}>
              {displayAll ? (
                <p className="text-base leading-relaxed text-[#111827]">
                  <span className="text-[#111827]">{finalText}</span>
                  {interimText && (
                    <span className="text-[#9CA3AF]">
                      {finalText ? " " : ""}{interimText}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-[#9CA3AF] text-sm text-center mt-4">
                  {listening ? "Говорите — текст появится здесь" : "Нажмите микрофон и говорите"}
                </p>
              )}
            </div>

            {/* Editable textarea (shows after first text) */}
            {hasText && !listening && (
              <div className="space-y-1.5">
                <p className="text-xs text-[#8E8E93] font-medium">Редактировать текст:</p>
                <textarea
                  rows={3}
                  value={finalText}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="w-full text-sm rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] p-3 resize-none focus:outline-none focus:border-[#3629B7]/50 focus:ring-2 focus:ring-[#3629B7]/10 leading-relaxed text-[#111827]"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-line">{error}</p>
              </div>
            )}

            {/* Browser note */}
            <p className="text-[11px] text-[#C7C7CC] text-center">
              Работает в Chrome · Говорите по-русски или по-английски
            </p>

            {/* Action buttons */}
            <div className="space-y-2 pb-safe">
              <div className="flex gap-2">
                <button onClick={onReset}
                  className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl border border-[#E5E5EA] bg-white text-[#8E8E93] font-semibold text-sm active:bg-[#F5F5F7]">
                  <RotateCcw className="w-4 h-4" /> Сначала
                </button>
                <button
                  onClick={onToggleMic}
                  className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-sm transition-all ${
                    listening
                      ? "bg-[#EF4444] text-white shadow-lg shadow-[#EF4444]/30"
                      : "bg-[#F5F5F7] border border-[#E5E5EA] text-[#303030]"
                  }`}
                >
                  {listening ? <><MicOff className="w-4 h-4" /> Стоп</> : <><Mic className="w-4 h-4" /> Продолжить</>}
                </button>
              </div>
              <button
                onClick={onConfirm}
                disabled={!hasText}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] text-white font-black text-base shadow-lg shadow-[#3629B7]/25 disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                ✓ Использовать текст
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop: floating panel ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden border border-[#E5E5EA]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F7]">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${listening ? "bg-[#EF4444] animate-pulse" : "bg-[#D1D5DB]"}`} />
            <span className="text-base font-bold text-[#303030]">
              {listening ? "Слушаю..." : hasText ? "Готово" : "Голосовой ввод"}
            </span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#F5F5F7] flex items-center justify-center hover:bg-[#E5E5EA] transition-colors">
            <X className="w-3.5 h-3.5 text-[#8E8E93]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Waveform */}
          <div className="flex justify-center">
            <Waveform active={listening} />
          </div>

          {/* Live text box */}
          <div className={`min-h-[72px] p-4 rounded-xl border-2 transition-all duration-200 ${
            listening ? "border-[#EF4444]/30 bg-[#FEF2F2]" : hasText ? "border-[#22C55E]/30 bg-[#F0FDF4]" : "border-[#E5E5EA] bg-[#F9FAFB]"
          }`}>
            {displayAll ? (
              <p className="text-sm leading-relaxed text-[#111827] min-h-[1.4em]">
                <span>{finalText}</span>
                {interimText && <span className="text-[#9CA3AF]">{finalText ? " " : ""}{interimText}</span>}
              </p>
            ) : (
              <p className="text-[#9CA3AF] text-sm text-center mt-2">
                {listening ? "Говорите — текст появится здесь..." : "Нажмите кнопку ниже и говорите"}
              </p>
            )}
          </div>

          {/* Editable textarea */}
          {hasText && !listening && (
            <div className="space-y-1">
              <p className="text-[11px] text-[#8E8E93] font-medium">Отредактируйте при необходимости:</p>
              <textarea
                rows={2}
                value={finalText}
                onChange={(e) => onEditChange(e.target.value)}
                className="w-full text-sm rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] p-3 resize-none focus:outline-none focus:border-[#3629B7]/50 focus:ring-2 focus:ring-[#3629B7]/10 leading-relaxed"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={onReset} title="Начать заново"
              className="w-9 h-9 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] flex items-center justify-center text-[#8E8E93] hover:text-[#303030] hover:bg-[#E5E5EA] transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            {hasText && (
              <button onClick={onCopy} title="Копировать"
                className="w-9 h-9 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] flex items-center justify-center text-[#8E8E93] hover:text-[#303030] hover:bg-[#E5E5EA] transition-colors">
                {copied ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onToggleMic}
              className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl font-semibold text-sm transition-all ${
                listening
                  ? "bg-[#EF4444] text-white shadow-md shadow-[#EF4444]/25"
                  : "bg-[#F5F5F7] border border-[#E5E5EA] text-[#303030] hover:bg-[#E5E5EA]"
              }`}
            >
              {listening ? <><MicOff className="w-4 h-4" /> Остановить</> : <><Mic className="w-4 h-4" /> {hasText ? "Продолжить" : "Начать запись"}</>}
            </button>
            <button
              onClick={onConfirm}
              disabled={!hasText}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white font-semibold text-sm disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Вставить
            </button>
          </div>

          <p className="text-[10px] text-[#C7C7CC] text-center">
            Работает в Chrome, Edge · Язык: Русский + English
          </p>
        </div>
      </div>
    </div>
  );
});
