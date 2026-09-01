/* eslint-disable @next/next/no-img-element */
export function FSILogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <img
      src="/fsi-partnership.png"
      alt="Фонд содействия инновациям"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
