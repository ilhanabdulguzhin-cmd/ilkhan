"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth-provider";
import { logoutUser } from "@/lib/user-store";
import { useRouter } from "next/navigation";
import {
  Shield,
  Eye,
  Lock,
  Users,
  CheckCircle2,
  Key,
  Database,
  Cpu,
  Trash2,
  Download,
  LogOut,
  HardDrive,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";

interface ConsentScope {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "data" | "ai" | "sharing";
}

const defaultConsents: ConsentScope[] = [
  { id: "c-1", name: "Банковские операции", description: "Monetrix видит вашу историю покупок и переводов", enabled: true, category: "data" },
  { id: "c-2", name: "Счета и балансы", description: "Monetrix показывает остатки на ваших счетах", enabled: true, category: "data" },
  { id: "c-3", name: "Умные подсказки", description: "Мы анализируем ваши данные, чтобы дать полезные советы", enabled: true, category: "ai" },
  { id: "c-4", name: "Передача эксперту", description: "Вы можете поделиться данными с финансовым экспертом по вашему желанию", enabled: false, category: "sharing" },
];

const CONSENTS_KEY = "monetrix_consents";

function loadConsents(): ConsentScope[] {
  if (typeof window === "undefined") return defaultConsents;
  try {
    const raw = localStorage.getItem(CONSENTS_KEY);
    if (!raw) return defaultConsents;
    const saved: Record<string, boolean> = JSON.parse(raw);
    return defaultConsents.map((c) => ({ ...c, enabled: saved[c.id] ?? c.enabled }));
  } catch {
    return defaultConsents;
  }
}

export default function SettingsPage() {
  const { userData, refresh } = useAuth();
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentScope[]>(defaultConsents);

  useEffect(() => {
    setConsents(loadConsents());
  }, []);

  const toggleConsent = (id: string) => {
    setConsents((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
      const toSave: Record<string, boolean> = {};
      next.forEach((c) => { toSave[c.id] = c.enabled; });
      localStorage.setItem(CONSENTS_KEY, JSON.stringify(toSave));
      return next;
    });
  };

  const handleExportData = () => {
    if (!userData) return;
    const json = JSON.stringify(userData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monetrix_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteData = () => {
    if (!confirm("Вы уверены? Все ваши данные будут удалены безвозвратно.")) return;
    const email = userData?.profile.email;
    if (email) {
      localStorage.removeItem(`monetrix_user_${email}`);
      localStorage.removeItem("monetrix_users");
      localStorage.removeItem("monetrix_user_current");
    }
    logoutUser();
    refresh();
    router.push("/auth");
  };

  const transactionCount = userData?.transactions.length || 0;
  const accountCount = userData?.accounts.length || 0;

  return (
    <AppShell>
      <div className="space-y-6 max-w-[900px]">
        <div>
          <h2 className="text-2xl font-bold text-[#303030]">Настройки</h2>
          <p className="text-sm text-[#8E8E93] mt-1">
            Управляйте вашими данными и безопасностью
          </p>
        </div>

        <Tabs defaultValue="privacy">
          <TabsList>
            <TabsTrigger value="privacy">Безопасность</TabsTrigger>
            <TabsTrigger value="data">Мои данные</TabsTrigger>
            <TabsTrigger value="account">Аккаунт</TabsTrigger>
          </TabsList>

          {/* Privacy & Consents */}
          <TabsContent value="privacy" className="mt-4 space-y-4">
            {/* How we protect your data */}
            <Card className="border-l-4 border-l-[#34C759]">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#34C759] mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#303030] mb-2">Как мы храним ваши данные</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                        Все данные хранятся только на вашем устройстве
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                        Информация зашифрована — никто кроме вас не получит доступ
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                        Мы не отправляем данные на серверы и не делимся с кем-либо
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                        Вы можете удалить все данные в любой момент
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consent toggles */}
            {(["data", "ai", "sharing"] as const).map((cat) => {
              const catLabels = { data: "Доступ к данным", ai: "Умные функции", sharing: "Передача данных" };
              const catIcons = { data: Database, ai: Cpu, sharing: Users };
              const CatIcon = catIcons[cat];
              return (
                <Card key={cat}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-[#303030]">
                      <CatIcon className="w-4 h-4 text-[#3629B7]" />
                      {catLabels[cat]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {consents
                      .filter((c) => c.category === cat)
                      .map((c) => (
                        <div key={c.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[#F5F5F7] transition-colors">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#303030]">{c.name}</p>
                            <p className="text-xs text-[#8E8E93]">{c.description}</p>
                          </div>
                          <Switch checked={c.enabled} onCheckedChange={() => toggleConsent(c.id)} />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* My Data */}
          <TabsContent value="data" className="mt-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#3629B7]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#3629B7]" />
                    </div>
                    <p className="text-sm text-[#8E8E93]">Операций</p>
                  </div>
                  <p className="text-2xl font-bold text-[#303030]">{transactionCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-[#34C759]" />
                    </div>
                    <p className="text-sm text-[#8E8E93]">Счетов</p>
                  </div>
                  <p className="text-2xl font-bold text-[#303030]">{accountCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#007AFF]" />
                    </div>
                    <p className="text-sm text-[#8E8E93]">Защита</p>
                  </div>
                  <p className="text-sm font-semibold text-[#34C759]">Зашифровано</p>
                  <p className="text-xs text-[#8E8E93]">Данные на устройстве</p>
                </CardContent>
              </Card>
            </div>

            {/* Export */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-[#3629B7] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#303030] mb-1">Скачать копию данных</p>
                    <p className="text-xs text-[#8E8E93] mb-3">
                      Сохраните все свои данные в файл на компьютер. Это ваша резервная копия.
                    </p>
                    <Button onClick={handleExportData} variant="outline" className="rounded-xl border-[#E5E5EA] text-[#303030]">
                      <Download className="w-4 h-4 mr-2" />
                      Скачать JSON
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delete */}
            <Card className="border-l-4 border-l-[#FF3B30]">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-[#FF3B30] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#303030] mb-1">Удалить все данные</p>
                    <p className="text-xs text-[#8E8E93] mb-3">
                      Все ваши данные будут полностью удалены с этого устройства. Это нельзя отменить.
                    </p>
                    <Button onClick={handleDeleteData} variant="outline" className="rounded-xl border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/5">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить все данные
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="mt-4 space-y-4">
            {userData && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3629B7] to-[#4a3dd4] flex items-center justify-center text-white text-xl font-bold">
                      {userData.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#303030] text-lg">{userData.profile.name}</p>
                      <p className="text-sm text-[#8E8E93]">{userData.profile.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#F5F5F7]">
                      <p className="text-xs text-[#8E8E93]">Зарегистрирован</p>
                      <p className="text-sm font-medium text-[#303030]">
                        {new Date(userData.profile.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F5F5F7]">
                      <p className="text-xs text-[#8E8E93]">Ваша цель</p>
                      <p className="text-sm font-medium text-[#303030]">
                        {userData.profile.mainGoal || "Не указана"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F5F5F7]">
                      <p className="text-xs text-[#8E8E93]">Тип профиля</p>
                      <p className="text-sm font-medium text-[#303030]">
                        {userData.profile.segment === "family" ? "👨‍👩‍👧 Семья"
                          : userData.profile.segment === "entrepreneur" ? "💼 Предприниматель"
                          : "👤 Личный"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F5F5F7]">
                      <p className="text-xs text-[#8E8E93]">Месячный доход</p>
                      <p className="text-sm font-medium text-[#303030]">
                        {userData.profile.monthlyIncome
                          ? userData.profile.monthlyIncome.toLocaleString("ru-RU") + " ₽"
                          : "Не указан"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <LogOut className="w-5 h-5 text-[#FF3B30] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#303030] mb-1">Выйти из аккаунта</p>
                    <p className="text-xs text-[#8E8E93] mb-3">
                      Ваши данные останутся на устройстве. Вы сможете войти снова.
                    </p>
                    <Button
                      onClick={() => {
                        logoutUser();
                        refresh();
                        router.push("/auth");
                      }}
                      variant="outline"
                      className="rounded-xl border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/5"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
