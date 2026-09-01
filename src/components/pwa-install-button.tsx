"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton({ variant = "banner" }: { variant?: "banner" | "pill" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    // Check if user dismissed before
    if (localStorage.getItem("pwa_install_dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(ios);

    if (ios) {
      // iOS: show after a short delay
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "1");
  };

  if (isInstalled || dismissed || !visible) return null;

  if (showIOSGuide) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-bold text-[#303030]">Как добавить на экран</p>
            <button onClick={() => { setShowIOSGuide(false); handleDismiss(); }} className="text-[#8E8E93] p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: Share, text: 'Нажмите кнопку «Поделиться» внизу Safari' },
              { icon: Download, text: 'Выберите «На экран «Домой»»' },
              { icon: Smartphone, text: 'Нажмите «Добавить» — готово!' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#3629B7] flex items-center justify-center text-white text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex items-center gap-2">
                  <step.icon className="w-4 h-4 text-[#3629B7] shrink-0" />
                  <p className="text-xs text-[#303030]">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-all"
      >
        <Download className="w-4 h-4" />
        {isIOS ? "На экран телефона" : "Установить приложение"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="bg-[#3629B7] rounded-2xl shadow-2xl p-4 text-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          {isIOS ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Установить Monetrix</p>
          <p className="text-xs text-white/70">
            {isIOS ? "Добавьте на экран «Домой»" : "Работает без интернета"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-white text-[#3629B7] text-xs font-bold hover:bg-white/90 transition-colors"
          >
            {isIOS ? "Как?" : "Установить"}
          </button>
          <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>
    </div>
  );
}
