import { notFound } from "next/navigation";

const pages: Record<string, { title: string; text: string }> = {
  terms: { title: "Пользовательское соглашение", text: "Настоящее соглашение регулирует использование платформы Monetrix. Сервис предоставляет информационные инструменты для анализа личных финансов и не заменяет консультацию банка, брокера, налогового или юридического специалиста." },
  privacy: { title: "Политика конфиденциальности", text: "ООО «МОНЕТРИКС» обрабатывает данные только для работы личного кабинета, синхронизации финансовой информации и улучшения сервиса. Мы применяем разграничение доступа и RLS; данные пользователя доступны только его аккаунту." },
  offer: { title: "Публичная оферта", text: "Использование информационных функций Monetrix означает принятие условий оферты. Актуальные банковские предложения и ставки сопровождаются ссылкой на первоисточник и датой обновления; условия необходимо проверять у поставщика продукта." },
};

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return <main className="mx-auto min-h-[60vh] max-w-3xl px-6 py-16"><p className="mb-3 text-sm font-semibold text-[#3629B7]">ООО «МОНЕТРИКС»</p><h1 className="text-3xl font-bold text-[#303030]">{page.title}</h1><p className="mt-6 leading-7 text-[#55555A]">{page.text}</p><p className="mt-8 text-sm text-[#8E8E93]">Документ требует юридической проверки перед публикацией в продуктивной среде.</p></main>;
}
