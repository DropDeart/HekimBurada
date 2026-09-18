"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Gift, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GATEWAY_URL, type CarouselSlide } from "@/lib/api";

/**
 * Ana sayfa hero'su.
 *
 * Admin panelinden slayt tanımlanmışsa onları döndürür; hiç slayt yoksa aşağıdaki sabit tanıtım
 * hero'su gösterilir. İki durumda da ilk kare SUNUCUDA render edilir (client component'ler de
 * sunucuda HTML'e dönüşür), yani H1 ve tanıtım metni sayfa kaynağında yer alır — arama motoru
 * JavaScript çalıştırmadan görebilir. Eski sürümde bu metinler `useEffect` sonrası geldiği için
 * kaynakta hiç yoktu.
 */

const CHIPS = [
  { icon: BadgeCheck, label: "Belge onaylı üyelik" },
  { icon: Lock, label: "Kapalı platform" },
  { icon: Gift, label: "Bağış ve bedelsiz ürün" },
];

export function HomeHero({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index];

  return (
    <section
      className="relative overflow-hidden bg-[#141718] bg-cover bg-center text-white"
      style={
        slide?.backgroundType === "image" && slide.backgroundImageUrl
          ? { backgroundImage: `url(${GATEWAY_URL}${slide.backgroundImageUrl})` }
          : slide?.backgroundColor
            ? { backgroundColor: slide.backgroundColor }
            : undefined
      }
    >
      {slide?.backgroundType === "image" && slide.backgroundImageUrl && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(10,12,13,0.55) 0%, rgba(10,12,13,0.75) 100%)",
          }}
        />
      )}

      <div className="relative container mx-auto px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="mb-3 text-xs font-bold tracking-wider text-brand uppercase">
            {slide?.eyebrow || "Sadece doğrulanmış hekimler"}
          </div>

          <h1 className="mb-4 text-[28px] leading-tight font-bold sm:text-[34px]">
            {slide?.title ?? "Hekimlerin ikinci el pazaryeri ve meslektaş topluluğu."}
          </h1>

          {slide?.description ? (
            <div
              className="mx-auto mb-6 max-w-[520px] text-sm text-[#B7BCBE] [&_a]:underline [&_strong]:font-bold"
              dangerouslySetInnerHTML={{ __html: slide.description }}
            />
          ) : (
            <p className="mx-auto mb-6 max-w-[520px] text-sm leading-relaxed text-[#B7BCBE]">
              Elinizde durmayan cihazdan kitaba, telefondan mobilyaya kadar her şeyi
              meslektaşlarınızla alıp satın; aradığınızı bulamıyorsanız talep açın, branş
              topluluklarında konuşun. Üyelik diploma ve tabip odası kaydı doğrulandıktan sonra
              açılır.
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Link href={slide?.linkUrl || "/kayit-ol"}>
              <Button className="bg-brand text-white hover:bg-brand/85">
                {slide?.buttonLabel || "Ücretsiz Kayıt Ol"}
              </Button>
            </Link>
            <Link href="/ilanlar">
              <Button className="bg-white text-[#141718] hover:bg-[#EDEEEE]">İlanlara Göz At</Button>
            </Link>
          </div>

          {!slide && (
            <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {CHIPS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5 text-xs text-[#9AA1A5]">
                  <Icon className="size-3.5 text-brand" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="relative flex justify-center gap-2 pb-5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}. slayt`}
              className={`size-2 rounded-full ${i === index ? "bg-brand" : "bg-white/35"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
