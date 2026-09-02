"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Sparkles,
  Wallet,
  Lock,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
} from "lucide-react";
import { MonetrixIcon } from "@/components/monetrix-logo";
import { createDemoAccount } from "@/lib/user-store";

export default function AuthPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const supabase = typeof window !== "undefined" ? createClient() : null;
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCheckEmail(params.get("check-email") === "1");
    if (params.get("error") === "callback") setError("Ссылка устарела или уже использована. Запросите новую.");
  }, []);

  const features = [
    {
      icon: Wallet,
      title: "Все счета в одном месте",
      desc: "Добавляйте счета, карты и наличные. Всё на одном экране.",
    },
    {
      icon: Sparkles,
      title: "AI-помощник",
      desc: "Подскажет, где сэкономить",
    },
    {
      icon: PiggyBank,
      title: "Цели и накопления",
      desc: "Поставьте цель и идите к ней",
    },
    {
      icon: Shield,
      title: "Данные на устройстве",
      desc: "Данные зашифрованы и остаются у вас",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSent(false);
    setLoading(true);

    try {
      if (!supabase) { setError("Сервис авторизации пока недоступен"); setLoading(false); return; }
      if (mode === "register") {
        if (!name.trim()) {
          setError("Введите ваше имя");
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes("@")) {
          setError("Введите корректный email");
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError("Пароль должен быть не менее 8 символов");
          setLoading(false);
          return;
        }
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback` } });
        if (authError) {
          const message = authError.message.toLowerCase();
          setError(message.includes("rate limit") || message.includes("too many") ? "Письмо уже отправлялось слишком часто. Подождите немного и попробуйте снова." : message.includes("already") ? "Этот email уже зарегистрирован. Переключитесь на «Войти»." : message.includes("invalid") ? "Проверьте email и убедитесь, что пароль содержит минимум 8 символов." : "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз.");
          setLoading(false);
          return;
        }
        refresh();
        if (!data.session) { setCheckEmail(true); setLoading(false); return; }
        router.push("/onboarding");
      } else {
        if (!email.trim()) {
          setError("Введите email");
          setLoading(false);
          return;
        }
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          const message = authError.message.toLowerCase();
          setError(message.includes("confirm") || message.includes("email not confirmed") ? "Подтвердите email по ссылке из письма" : "Неверный email или пароль");
          setLoading(false);
          return;
        }
        refresh();
        router.push("/dashboard");
      }
    } catch {
      setError("Что-то пошло не так. Попробуйте ещё раз.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#3629B7]">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-20 py-12 w-full">
          <div>
            {/* Monetrix brand */}
            <div className="flex items-center gap-3 mb-8">
              <Image
                src="/monetrix-logo.png"
                alt="Monetrix"
                width={160}
                height={34}
                className="brightness-0 invert"
                priority
              />
            </div>

            {/* Headline */}
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Управляйте своими финансами
              <br />
              на основе подсказок технологий
            </h1>
            <p className="text-lg text-white/70 mb-10 max-w-lg leading-relaxed">
              Загружайте выписки, анализируйте расходы и находите возможности для экономии. ИИ предлагает рекомендации, но не управляет деньгами и не принимает решения за вас.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group p-5 rounded-2xl bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/10">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom footer */}
          <div className="mt-8 flex items-center gap-8 pt-4 border-t border-white/[0.1]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-white/70" />
              <p className="text-sm text-white/60">Шифрование AES-256</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/70" />
              <p className="text-sm text-white/60">Данные на устройстве</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#F5F5F7]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <Image src="/monetrix-logo.png" alt="Monetrix" width={130} height={28} priority />
          </div>

          {/* Tab switch */}
          <div className="flex gap-1 p-1 rounded-xl bg-white border border-[#E5E5EA] mb-8">
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-[#3629B7] text-white shadow-sm"
                  : "text-[#8E8E93] hover:text-[#303030]"
              }`}
            >
              Создать аккаунт
            </button>
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-[#3629B7] text-white shadow-sm"
                  : "text-[#8E8E93] hover:text-[#303030]"
              }`}
            >
              Войти
            </button>
          </div>

          {checkEmail && mode === "register" && (
            <div className="mb-6 rounded-xl border border-[#34C759]/20 bg-[#34C759]/10 p-4 text-sm text-[#216e39]">
              Аккаунт создан. Откройте письмо на вашей почте и подтвердите email, затем вернитесь сюда и нажмите «Войти».
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#303030] mb-1">
              {mode === "register" ? "Добро пожаловать!" : "С возвращением!"}
            </h2>
            <p className="text-sm text-[#8E8E93]">
              {mode === "register"
                ? "Начните управлять деньгами уже сегодня"
                : "Рады видеть вас снова"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-[#303030]">
                  Как вас зовут?
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Александр"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 pl-4 pr-4 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#3629B7]/30 focus-visible:border-[#3629B7]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-[#303030]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-4 pr-4 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#3629B7]/30 focus-visible:border-[#3629B7]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-[#303030]">
                Пароль
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Минимум 8 символов" : "Введите пароль"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-4 pr-11 rounded-xl bg-white border-[#E5E5EA] focus-visible:ring-[#3629B7]/30 focus-visible:border-[#3629B7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#303030] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "login" && (
                <button
                  type="button"
                  className="text-xs text-[#3629B7] hover:underline"
                  onClick={async () => {
                    if (!supabase || !email.trim()) { setError("Введите email, чтобы получить ссылку для восстановления"); return; }
                    setLoading(true);
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/settings` });
                    setLoading(false);
                    if (resetError) setError("Не удалось отправить письмо. Проверьте email и попробуйте ещё раз.");
                    else setResetSent(true);
                  }}
                >
                  Забыли пароль?
                </button>
              )}
            </div>

            {resetSent && <p className="text-sm text-[#34C759]">Ссылка для восстановления отправлена на email.</p>}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#3629B7] hover:bg-[#2a1f8f] text-white font-semibold shadow-lg shadow-[#3629B7]/25 transition-all duration-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "register" ? "Начать бесплатно" : "Войти"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          {mode === "register" && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-[#3629B7]/15 bg-[#3629B7]/5 p-4 text-sm text-[#303030]">
                <p className="font-semibold">Хотите сначала посмотреть продукт?</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8E8E93]">Активируйте демо-аккаунт с готовыми тестовыми данными. Это не реальные деньги и не подключение к банку.</p>
                <button type="button" onClick={() => { createDemoAccount(); router.push("/dashboard"); }} className="mt-3 text-xs font-semibold text-[#3629B7] hover:underline">Войти в демо-кабинет →</button>
                <p className="mt-2 font-mono text-[11px] text-[#8E8E93]">demo@monetrix.app · demo123</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                Данные хранятся только на вашем устройстве
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                Загружайте выписки из любого банка
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                Умные советы по экономии и накоплениям
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
            <div className="flex items-center justify-center gap-6 text-xs text-[#8E8E93]">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Шифрование
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Конфиденциальность
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Без рекламы
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
