"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { addAccount, deleteAccount, saveUserData, getCurrentUser } from "@/lib/user-store";
import { Input } from "@/components/ui/input";
import {
  Plus,
  CheckCircle2,
  CreditCard,
  Landmark,
  Wallet,
  Banknote,
  TrendingUp,
  Shield,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { useState } from "react";

export default function IntegrationsPage() {
  const { userData, refresh } = useAuth();
  const accounts = userData?.accounts || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"bank" | "broker" | "wallet" | "cash">("bank");
  const [newBalance, setNewBalance] = useState("");
  // Inline balance editing state: { [accountId]: editedValue }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const typeIcons = {
    bank: Landmark,
    broker: TrendingUp,
    wallet: Wallet,
    cash: Banknote,
  };

  const typeLabels = {
    bank: "Банковская карта",
    broker: "Брокерский счёт",
    wallet: "Электронный кошелёк",
    cash: "Наличные",
  };

  const typeColors = {
    bank: "#3629B7",
    broker: "#34C759",
    wallet: "#FF9500",
    cash: "#007AFF",
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addAccount({
      name: newName,
      type: newType,
      balance: Number(newBalance.replace(/\s/g, "")) || 0,
      currency: "RUB",
    });
    refresh();
    setNewName("");
    setNewBalance("");
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    deleteAccount(id);
    refresh();
  };

  const startEdit = (id: string, currentBalance: number) => {
    setEditingId(id);
    setEditValue(currentBalance.toString());
  };

  const confirmEdit = (id: string) => {
    const newBal = Number(editValue.replace(/\s/g, "").replace(",", "."));
    if (!isNaN(newBal)) {
      const data = getCurrentUser();
      if (data) {
        data.accounts = data.accounts.map((a) => a.id === id ? { ...a, balance: newBal } : a);
        saveUserData(data);
        refresh();
      }
    }
    setEditingId(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1000px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#303030]">Мои счета</h2>
            <p className="text-sm text-[#8E8E93] mt-1">
              Добавьте все ваши карты, счета и кошельки, чтобы видеть полную картину
            </p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-[#3629B7] hover:bg-[#2a1f8f] rounded-xl shadow-md shadow-[#3629B7]/20">
            <Plus className="w-4 h-4 mr-2" />
            Добавить счёт
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#3629B7]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#3629B7]/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#3629B7]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Всего на счетах</p>
              </div>
              <p className="text-2xl font-bold text-[#303030]">{totalBalance.toLocaleString("ru-RU")} ₽</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#34C759]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Счетов добавлено</p>
              </div>
              <p className="text-2xl font-bold text-[#303030]">{accounts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#007AFF]" />
                </div>
                <p className="text-sm text-[#8E8E93]">Защита данных</p>
              </div>
              <p className="text-sm font-semibold text-[#34C759]">Зашифровано</p>
              <p className="text-xs text-[#8E8E93]">Только на вашем устройстве</p>
            </CardContent>
          </Card>
        </div>

        {/* Add form */}
        {showAdd && (
          <Card className="border-2 border-[#3629B7]/20 border-dashed">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3629B7]/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#3629B7]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#303030]">Новый счёт</p>
                  <p className="text-xs text-[#8E8E93]">Укажите название, тип и текущий баланс</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Название (напр. Сбербанк)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA]"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as typeof newType)}
                  className="h-10 px-3 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-sm text-[#303030]"
                >
                  <option value="bank">Банковская карта</option>
                  <option value="broker">Брокерский счёт</option>
                  <option value="wallet">Электронный кошелёк</option>
                  <option value="cash">Наличные</option>
                </select>
                <div className="relative">
                  <Input
                    placeholder="Баланс"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value.replace(/[^\d\s.-]/g, ""))}
                    className="rounded-xl bg-[#F5F5F7] border-[#E5E5EA] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">₽</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!newName.trim()} className="bg-[#3629B7] hover:bg-[#2a1f8f] rounded-xl">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-[#8E8E93]">
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accounts list */}
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#3629B7]/10 flex items-center justify-center mb-4">
                <Landmark className="w-8 h-8 text-[#3629B7]" />
              </div>
              <h3 className="text-lg font-semibold text-[#303030] mb-2">Пока нет счетов</h3>
              <p className="text-sm text-[#8E8E93] mb-4 max-w-sm mx-auto">
                Добавьте ваши банковские карты, накопительные счета или наличные, чтобы видеть общий баланс
              </p>
              <Button onClick={() => setShowAdd(true)} className="bg-[#3629B7] hover:bg-[#2a1f8f] rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Добавить первый счёт
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const Icon = typeIcons[acc.type] || CreditCard;
              const color = typeColors[acc.type] || "#3629B7";
              return (
                <Card key={acc.id} className="group hover:border-[#3629B7]/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                          <Icon className="w-6 h-6" style={{ color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#303030]">{acc.name}</p>
                          <p className="text-xs text-[#8E8E93]">{typeLabels[acc.type]}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FF3B30]/10 text-[#8E8E93] hover:text-[#FF3B30] transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {editingId === acc.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="relative">
                          <Input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value.replace(/[^\d.,\s-]/g, ""))}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(acc.id); if (e.key === "Escape") cancelEdit(); }}
                            className="h-9 text-lg font-bold rounded-lg bg-[#F5F5F7] border-[#3629B7]/40 pr-8 w-32 sm:w-40"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93]">₽</span>
                        </div>
                        <button onClick={() => confirmEdit(acc.id)} className="p-1.5 rounded-lg bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/20 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-[#FF3B30]/10 text-[#8E8E93] hover:text-[#FF3B30] transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-[#303030]">{acc.balance.toLocaleString("ru-RU")} ₽</p>
                        <button
                          onClick={() => startEdit(acc.id, acc.balance)}
                          className="opacity-0 group-hover:opacity-100 touch:opacity-100 p-1 rounded-lg hover:bg-[#3629B7]/10 text-[#8E8E93] hover:text-[#3629B7] transition-all"
                          title="Изменить баланс"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="text-[10px] bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/10">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Защищено
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Security info */}
        <Card className="border-l-4 border-l-[#34C759]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#34C759] mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#303030] mb-1">Ваши данные в безопасности</p>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  Вся информация о ваших счетах хранится только на вашем устройстве в зашифрованном виде. 
                  Мы не передаём данные на серверы и не делимся ими с третьими лицами. 
                  Вы полностью контролируете свои финансовые данные.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
