import Link from "next/link";

export function SiteFooter() {
  return <footer className="border-t border-[#E5E5EA] bg-white px-6 py-8 text-sm text-[#8E8E93]">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div><p className="font-semibold text-[#303030]">ООО «МОНЕТРИКС»</p><p className="mt-1">Финансовая информация и инструменты для принятия решений</p><p className="mt-1">Не является индивидуальной инвестиционной рекомендацией.</p></div>
      <nav aria-label="Правовая информация" className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/legal/terms" className="hover:text-[#3629B7]">Пользовательское соглашение</Link><Link href="/legal/privacy" className="hover:text-[#3629B7]">Политика конфиденциальности</Link><Link href="/legal/offer" className="hover:text-[#3629B7]">Оферта</Link></nav>
    </div>
  </footer>;
}
