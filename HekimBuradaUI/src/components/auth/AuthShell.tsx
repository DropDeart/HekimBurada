import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Prototipteki (Doktor Pazaryeri tasarımı) split-screen auth ekranı: solda görsel + başlık,
 * sağda form. Sol panel gerçek bir fotoğraf (public/images/auth-hero.jpg) — üstüne koyu bir
 * gradient bindirilip metin beyaza çevrildi (fotoğrafın kendi tonlarından bağımsız her zaman
 * okunaklı kalsın diye, bkz. alttaki overlay div'i).
 */
export function AuthShell({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-wrap bg-white">
      <div className="relative flex min-h-[320px] flex-1 basis-[420px] items-end overflow-hidden">
        <Image
          src="/images/auth-hero.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,12,13,0) 35%, rgba(10,12,13,0.65) 100%), linear-gradient(100deg, rgba(10,12,13,0.35) 0%, rgba(10,12,13,0) 50%)",
          }}
        />
        <div className="relative z-10 p-14 text-white">
          <h1 className="mb-3 max-w-[420px] text-[34px] leading-tight font-bold text-white">
            {heading}
          </h1>
          <p className="max-w-[400px] text-[15px] text-white/85">{subheading}</p>
        </div>
      </div>

      <div className="flex flex-1 basis-[420px] items-center justify-center p-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
