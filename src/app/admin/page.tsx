import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Users, Database, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/");

  const { count: userCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const { data: sources } = await supabase
    .from("market_sources")
    .select("id, name, kind, url, status, last_checked_at")
    .order("name");

  return (
    <main className="min-h-screen bg-[#F5F5F7] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#3629B7]">
          <ArrowLeft className="h-4 w-4" /> Вернуться в Monetrix
        </Link>
        <header className="flex flex-col justify-between gap-4 rounded-2xl bg-[#3629B7] p-6 text-white md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-white/70"><ShieldCheck className="h-4 w-4" /> Защищённая зона</div>
            <h1 className="text-3xl font-bold tracking-tight">Панель администратора</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Контроль пользователей, источников финансовых данных и состояния платформы.</p>
          </div>
          <p className="text-sm text-white/70">{user.email}</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><Users className="mb-4 h-5 w-5 text-[#3629B7]" /><p className="text-sm text-[#8E8E93]">Профилей</p><p className="mt-1 text-3xl font-bold text-[#303030]">{userCount ?? 0}</p></div>
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><Database className="mb-4 h-5 w-5 text-[#34C759]" /><p className="text-sm text-[#8E8E93]">Источников данных</p><p className="mt-1 text-3xl font-bold text-[#303030]">{sources?.length ?? 0}</p></div>
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5"><RefreshCw className="mb-4 h-5 w-5 text-[#FF9500]" /><p className="text-sm text-[#8E8E93]">Режим обновления</p><p className="mt-1 text-lg font-bold text-[#303030]">По запросу и TTL</p></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white">
          <div className="border-b border-[#E5E5EA] p-5"><h2 className="font-semibold text-[#303030]">Источники данных</h2><p className="mt-1 text-sm text-[#8E8E93]">Каждый источник должен иметь ссылку, статус и время последней проверки.</p></div>
          <div className="divide-y divide-[#E5E5EA]">
            {(sources ?? []).map((source) => <div key={source.id} className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between"><div><p className="font-medium text-[#303030]">{source.name}</p><p className="text-sm text-[#8E8E93]">{source.kind} · {source.url}</p></div><span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-xs font-medium text-[#55555A]">{source.status}</span></div>)}
            {sources?.length === 0 && <p className="p-5 text-sm text-[#8E8E93]">Источники ещё не зарегистрированы.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata = { title: "Админ-панель | Monetrix", description: "Защищённая панель управления Monetrix" };
