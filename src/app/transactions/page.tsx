"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { deleteTransaction } from "@/lib/user-store";
import Link from "next/link";
import {
  Search,
  Download,
  Trash2,
  Upload,
  PenLine,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { useState, useMemo } from "react";

type FilterType = "all" | "income" | "expense";

export default function TransactionsPage() {
  const { userData, refresh } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const transactions = userData?.transactions || [];

  // Collect unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))).sort();
    return ["all", ...cats];
  }, [transactions]);

  const filtered = useMemo(() =>
    transactions
      .filter((t) => {
        if (filter === "income" && t.amount <= 0) return false;
        if (filter === "expense" && t.amount >= 0) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.merchant.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, filter, categoryFilter, search]
  );

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups: { month: string; label: string; items: typeof filtered }[] = [];
    const seen: Record<string, number> = {};
    for (const t of filtered) {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (seen[month] === undefined) {
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
        seen[month] = groups.length;
        groups.push({ month, label, items: [] });
      }
      groups[seen[month]].items.push(t);
    }
    return groups;
  }, [filtered]);

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    refresh();
  };

  const exportCSV = () => {
    const header = "Дата,Сумма,Описание,Категория,Тип,Источник\n";
    const rows = transactions
      .map((t) => `${t.date},${t.amount},"${t.description}","${t.category}",${t.type},${t.source}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monetrix_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (transactions.length === 0) {
    return (
      <AppShell>
        <div className="max-w-[600px] mx-auto py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#3629B7]/10 to-[#4a3dd4]/10 flex items-center justify-center mb-6 border border-[#3629B7]/10">
            <FileSpreadsheet className="w-9 h-9 text-[#3629B7]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Нет транзакций</h2>
          <p className="text-sm text-[#8E8E93] mb-6">
            Загрузите CSV-выписку или добавьте транзакции вручную, чтобы увидеть аналитику
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/upload">
              <Button className="rounded-xl bg-gradient-to-r from-[#3629B7] to-[#4a3dd4] hover:from-[#2a1f8f] hover:to-[#3629B7] text-white font-semibold shadow-lg shadow-[#3629B7]/20">
                <Upload className="w-4 h-4 mr-2" /> Загрузить CSV
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" className="rounded-xl">
                <PenLine className="w-4 h-4 mr-2" /> Ручной ввод
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Транзакции</h2>
            <p className="text-xs sm:text-sm text-[#8E8E93] mt-1 flex flex-wrap gap-x-2">
              <span>{transactions.length} операций</span>
              <span className="hidden sm:inline">&middot;</span>
              <span className="text-[#34C759]">+{Math.abs(transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)).toLocaleString("ru-RU")} ₽</span>
              <span className="hidden sm:inline">&middot;</span>
              <span className="text-[#FF3B30]">-{Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)).toLocaleString("ru-RU")} ₽</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/upload">
              <Button variant="outline" size="sm" className="rounded-lg">
                <Upload className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Загрузить ещё</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={exportCSV}>
              <Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Экспорт</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <Input
              placeholder="Поиск по описанию, категории..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          {/* Type filter */}
          <div className="flex gap-1.5">
            {([
              ["all", "Все"] as const,
              ["income", "Доходы"] as const,
              ["expense", "Расходы"] as const,
            ]).map(([key, label]) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(key)}
                className={`rounded-lg ${filter === key ? "bg-[#3629B7] hover:bg-[#2a1f8f]" : ""}`}
              >
                {label}
              </Button>
            ))}
          </div>
          {/* Category filter dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={`rounded-lg gap-1.5 ${categoryFilter !== "all" ? "border-[#3629B7]/50 text-[#3629B7]" : ""}`}
              onClick={() => setShowCategoryDropdown((p) => !p)}
            >
              {categoryFilter === "all" ? "Категория" : categoryFilter}
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            {showCategoryDropdown && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-[#E5E5EA] rounded-xl shadow-lg min-w-[180px] py-1 max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategoryFilter(cat); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F5F5F7] transition-colors ${categoryFilter === cat ? "font-semibold text-[#3629B7]" : "text-[#303030]"}`}
                  >
                    {cat === "all" ? "Все категории" : cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(categoryFilter !== "all" || filter !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-[#8E8E93] text-xs"
              onClick={() => { setCategoryFilter("all"); setFilter("all"); setSearch(""); }}
            >
              Сбросить фильтры
            </Button>
          )}
        </div>

        {/* Transaction list grouped by month */}
        {groupedByMonth.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[#8E8E93]">
              Ничего не найдено
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedByMonth.map((group) => {
              const monthIncome = group.items.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
              const monthExpense = group.items.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
              return (
                <div key={group.month}>
                  {/* Month header */}
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="text-sm font-semibold text-[#303030] capitalize">{group.label}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#8E8E93]">
                      {monthIncome > 0 && <span className="text-[#34C759] font-medium">+{monthIncome.toLocaleString("ru-RU")} ₽</span>}
                      {monthExpense < 0 && <span className="font-medium">{monthExpense.toLocaleString("ru-RU")} ₽</span>}
                      <span>{group.items.length} операций</span>
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {group.items.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F5F5F7] transition-colors group"
                          >
                            <span className="text-xl w-8 text-center">{t.categoryIcon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{t.description || t.merchant}</p>
                              <p className="text-xs text-[#8E8E93]">
                                {t.category} &middot; {new Date(t.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} &middot;{" "}
                                <span className={t.source === "csv" ? "text-[#3629B7]" : "text-[#4a3dd4]"}>
                                  {t.source === "csv" ? "CSV" : "ручной"}
                                </span>
                              </p>
                            </div>
                            <p className={`text-sm font-semibold shrink-0 ${t.amount > 0 ? "text-[#34C759]" : ""}`}>
                              {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("ru-RU")} ₽
                            </p>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FF3B30]/10 text-[#8E8E93] hover:text-[#FF3B30] transition-all"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
