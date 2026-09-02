"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { MonetrixIcon } from "@/components/monetrix-logo";
import Image from "next/image";
import {
  LayoutDashboard, Upload, UserCircle, Settings, LogOut, Plus,
  Menu, X, ChevronLeft, ChevronRight, Sparkles,
  ShoppingCart, TrendingUp, CreditCard, ShieldAlert,
  ShoppingBag, Receipt, Link2, Calculator, Users,
} from "lucide-react";

// ── Navigation Architecture ────────────────────────────────────────────────────
// Web 4.0 structure: 4 life-domains + core utility sections

const LIFE_SECTIONS = [
  {
    href: "/daily-life",
    label: "Бытовая жизнь",
    icon: ShoppingCart,
    color: "#34C759",
    desc: "Бюджет, подписки, кэшбек, покупки",
  },
  {
    href: "/invest",
    label: "Инвестиции",
    icon: TrendingUp,
    color: "#007AFF",
    desc: "Вклады, ОФЗ, ИИС, накопления",
  },
  {
    href: "/credits",
    label: "Кредиты и долги",
    icon: CreditCard,
    color: "#FF9500",
    desc: "Погашение, рефинансирование, калькулятор",
  },
  {
    href: "/fraud",
    label: "Защита и комплаенс",
    icon: ShieldAlert,
    color: "#FF3B30",
    desc: "Мошенничество, ФЗ-115, гайды",
  },
] as const;

const navItems = [
  { href: "/",              label: "Главная",              icon: LayoutDashboard, group: "main" },
  { href: "/daily-life",    label: "Бытовая жизнь",        icon: ShoppingCart,    group: "main", color: "#34C759" },
  { href: "/invest",        label: "Инвестиции",           icon: TrendingUp,      group: "main", color: "#007AFF" },
  { href: "/credits",       label: "Кредиты и долги",      icon: CreditCard,      group: "main", color: "#FF9500" },
  { href: "/fraud",         label: "Защита и комплаенс",   icon: ShieldAlert,     group: "main", color: "#FF3B30" },
  { href: "/upload",        label: "Загрузка данных",      icon: Upload,          group: "core" },
  { href: "/products",      label: "Банковские продукты",  icon: ShoppingBag,     group: "core" },
  { href: "/transactions",  label: "Операции",             icon: Receipt,         group: "core" },
  { href: "/integrations",  label: "Мои счета",            icon: Link2,           group: "core" },
  { href: "/tax-helper",    label: "Налоги и вычеты",      icon: Calculator,      group: "core" },
  { href: "/ai-consultant", label: "Кэшик — AI помощник",  icon: Sparkles,        group: "core" },
  { href: "/avatar",        label: "Финансовый профиль",   icon: UserCircle,      group: "account" },
  { href: "/consultants",   label: "Эксперты",             icon: Users,           group: "account" },
  { href: "/business",      label: "Кабинет бизнеса",        icon: Users,           group: "account" },
  { href: "/settings",      label: "Настройки",            icon: Settings,        group: "account" },
] as const;

const mobileBottomNav = [
  { href: "/dashboard",     label: "Кабинет",  icon: LayoutDashboard },
  { href: "/daily-life",    label: "Жизнь",    icon: ShoppingCart },
  { href: "/upload",        label: "Добавить", icon: Plus, isAdd: true },
  { href: "/invest",        label: "Инвест",   icon: TrendingUp },
  { href: "/ai-consultant", label: "Кэшик",    icon: Sparkles },
] as const;

export { LIFE_SECTIONS };
export { AppShell };

export default AppShell;

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, userData, loading, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/auth");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center gap-5">
          <div className="animate-pulse"><MonetrixIcon size={52} /></div>
          <p className="text-sm text-[#8E8E93] font-medium">Загружаем Monetrix...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const userName = userData?.profile?.name || "Пользователь";
  const userInitial = userName.charAt(0).toUpperCase();
  const handleLogout = () => { logout(); router.push("/auth"); };
  const currentNav = navItems.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)
  );
  const currentNavLabel = currentNav?.label || "Monetrix";

  const groupLabels: Record<string, string> = {
    main: "Жизненные разделы",
    core: "Инструменты",
    account: "Аккаунт",
  };

  const SidebarNav = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 py-2 px-2 overflow-y-auto">
      {(["main", "core", "account"] as const).map((group) => {
        const items = navItems.filter((i) => i.group === group);
        return (
          <div key={group} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-1.5 mt-1">
                {groupLabels[group]}
              </p>
            )}
            {collapsed && group !== "main" && <div className="border-t border-white/10 my-2" />}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const accentColor = "color" in item ? item.color : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon
                      className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]"
                      style={isActive && accentColor ? { color: "white" } : accentColor ? { color: accentColor } : {}}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">

      {/* ── Desktop Sidebar ── */}
      <aside className={cn(
        "hidden md:flex flex-col bg-[#3629B7] text-white transition-all duration-200 shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
          {collapsed
            ? <MonetrixIcon size={32} white />
            : <Image src="/monetrix-logo.png" alt="Monetrix" width={130} height={28} className="brightness-0 invert" priority />
          }
        </div>

        {!collapsed && (
          <div className="px-3 pt-3">
            <Link href="/upload" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#3629B7] text-white hover:bg-[#4a3dd4] transition-colors text-sm font-semibold shadow-lg shadow-[#3629B7]/30">
              <Plus className="w-4 h-4" />
              Добавить данные
            </Link>
          </div>
        )}

        <SidebarNav />
        {isAdmin && (
          <div className="px-2 pb-3">
            <Link href="/admin" className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white hover:bg-white/20" title={collapsed ? "Админ-панель" : undefined}>
              <ShieldAlert className="h-[18px] w-[18px] shrink-0 text-[#FFCC00]" />
              {!collapsed && <span>Админ-панель</span>}
            </Link>
          </div>
        )}

        {!collapsed && userData && (
          <div className="px-3 py-2 border-t border-white/10">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-[#3629B7] flex items-center justify-center text-white text-xs font-bold shrink-0">{userInitial}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{userName}</p>
                <p className="text-[10px] text-white/40 truncate">{userData.profile.email}</p>
              </div>
              <button onClick={handleLogout} title="Выйти" className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="px-2 py-3 border-t border-white/10">
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /><span className="ml-2 text-sm">Свернуть</span></>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 md:h-16 border-b border-[#E5E5EA] bg-white flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-[#F5F5F7]" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-[#303030]" />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <Image src="/monetrix-logo.png" alt="Monetrix" width={110} height={24} priority />
            </div>
            <div className="hidden md:flex items-center gap-3">
              {currentNav && "color" in currentNav && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${(currentNav as { color: string }).color}15` }}>
                  <currentNav.icon className="w-4 h-4" style={{ color: (currentNav as { color: string }).color }} />
                </div>
              )}
              <h1 className="text-lg font-semibold text-[#303030]">{currentNavLabel}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/ai-consultant" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3629B7]/8 text-[#3629B7] text-xs font-semibold hover:bg-[#3629B7]/15 transition-colors border border-[#3629B7]/15">
              <Sparkles className="w-3.5 h-3.5" />
              Спросить Кэшика
            </Link>
            <Link href="/upload" className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3629B7] text-white text-xs font-medium">
              <Plus className="w-3.5 h-3.5" /> Добавить
            </Link>
            <Link href="/avatar">
              <div className="w-8 h-8 rounded-full bg-[#3629B7] flex items-center justify-center text-white text-sm font-semibold cursor-pointer" title={userName}>
                {userInitial}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-[#3629B7] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
              <Image src="/monetrix-logo.png" alt="Monetrix" width={120} height={26} className="brightness-0 invert" priority />
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-white/60 hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userData && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3629B7] flex items-center justify-center text-white font-bold">{userInitial}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                    <p className="text-xs text-white/50 truncate">{userData.profile.email}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-3 pt-3 pb-2">
              <Link href="/upload" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#3629B7] text-white text-sm font-semibold">
                <Plus className="w-4 h-4" /> Добавить данные
              </Link>
            </div>

            <nav className="flex-1 py-2 px-2">
              {(["main", "core", "account"] as const).map((group) => {
                const items = navItems.filter((i) => i.group === group);
                return (
                  <div key={group} className="mb-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-1.5">{groupLabels[group]}</p>
                    <div className="space-y-0.5">
                      {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
                        const accentColor = "color" in item ? (item as { color: string }).color : undefined;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium",
                              isActive ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <item.icon className="w-[18px] h-[18px] shrink-0"
                              style={accentColor && !isActive ? { color: accentColor } : {}} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="px-3 py-3 border-t border-white/10">
              <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white text-sm">
                <LogOut className="w-4 h-4" /> Выйти из аккаунта
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E5EA] safe-area-inset-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {mobileBottomNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const isAdd = "isAdd" in item && item.isAdd;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[60px]">
                {isAdd ? (
                  <div className="w-11 h-11 rounded-full bg-[#3629B7] flex items-center justify-center shadow-lg shadow-[#3629B7]/30 -mt-5 mb-0.5">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <item.icon className={cn("w-5 h-5", isActive ? "text-[#3629B7]" : "text-[#8E8E93]")} />
                )}
                <span className={cn("text-[10px] font-medium", isActive && !isAdd ? "text-[#3629B7]" : "text-[#8E8E93]")}>
                  {item.label}
                </span>
                {isActive && !isAdd && <div className="w-1 h-1 rounded-full bg-[#3629B7]" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
