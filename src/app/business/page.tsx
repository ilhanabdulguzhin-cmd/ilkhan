"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users } from "lucide-react";

export default function BusinessPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string; industry: string | null }>>([]);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!authLoading && !userData) router.replace("/auth"); }, [authLoading, userData, router]);
  useEffect(() => {
    if (!userData) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("businesses").select("id,name,industry").order("created_at", { ascending: false });
      setBusinesses(data ?? []);
    };
    void load();
  }, [userData]);

  async function createBusiness() {
    if (!userData || !name.trim()) { setError("Введите название бизнеса"); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data: business, error: createError } = await supabase.from("businesses").insert({ owner_id: userData.id, name: name.trim(), industry: industry.trim() || null }).select("id,name,industry").single();
    if (createError || !business) { setError("Не удалось создать кабинет. Проверьте права доступа."); setSaving(false); return; }
    const { error: memberError } = await supabase.from("business_members").insert({ business_id: business.id, user_id: userData.id, role: "owner" });
    if (memberError) { setError("Кабинет создан, но роль владельца не назначилась. Обратитесь в поддержку."); } else { setBusinesses((current) => [business, ...current]); setName(""); setIndustry(""); }
    setSaving(false);
  }

  if (authLoading || !userData) return null;
  return <AppShell><main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 lg:p-10">
    <header className="flex flex-col gap-2"><Badge variant="secondary" className="w-fit">Рабочее пространство</Badge><h1 className="text-3xl font-semibold tracking-tight">Кабинет бизнеса</h1><p className="max-w-2xl text-muted-foreground">Отдельное пространство для командных финансов, целей и доступа сотрудников.</p></header>
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus data-icon="inline-start" />Создать кабинет</CardTitle><CardDescription>Начните с названия компании и отрасли.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label htmlFor="business-name">Название</Label><Input id="business-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, ИП «Рассвет»" /></div><div className="flex flex-col gap-2"><Label htmlFor="industry">Отрасль <span className="text-muted-foreground">(необязательно)</span></Label><Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Розничная торговля" /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button onClick={() => void createBusiness()} disabled={saving}>{saving ? "Создаём…" : "Создать кабинет"}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Ваши кабинеты</CardTitle><CardDescription>Доступны только вам и приглашённым участникам.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{businesses.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"><Building2 className="text-muted-foreground" /><p className="text-sm text-muted-foreground">Пока нет бизнес-кабинетов</p></div> : businesses.map((business) => <div key={business.id} className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-medium">{business.name}</p><p className="text-sm text-muted-foreground">{business.industry || "Отрасль не указана"}</p></div><Badge variant="outline"><Users data-icon="inline-start" /> Владелец</Badge></div>)}</CardContent></Card>
    </section>
  </main></AppShell>;
}
