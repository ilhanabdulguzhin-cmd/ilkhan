import Image from "next/image";

export function FSIBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: { width: 360, height: 78 }, md: { width: 520, height: 112 }, lg: { width: 680, height: 146 } };
  const s = sizes[size];

  return (
    <Image
      src="/fsi-partnership.png"
      alt="Платформа университетского технологического предпринимательства при поддержке Фонда содействия инновациям"
      width={s.width}
      height={s.height}
      className="h-auto w-full max-w-[360px] object-contain"
      priority
    />
  );
}
