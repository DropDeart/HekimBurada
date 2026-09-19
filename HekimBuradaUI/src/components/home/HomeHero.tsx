"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Gift, Lock, ShieldCheck } from "lucide-react";
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

/** Admin slaytı yoksa (varsayılan tanıtım hero'su) kullanılan fotoğraf — projedeki tek gerçek
 * "hekim/muayenehane" temalı görsel, giriş/kayıt ekranlarında da aynı amaçla kullanılıyor. */
const DEFAULT_HERO_IMAGE = "/images/auth-hero.jpg";

export function HomeHero({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index];
  const backgroundImage =
    slide?.backgroundType === "image" && slide.backgroundImageUrl
      ? `${GATEWAY_URL}${slide.backgroundImageUrl}`
      : !slide
        ? DEFAULT_HERO_IMAGE
        : null;

  return (
    <section
      className="relative flex min-h-[420px] items-center overflow-hidden bg-[#141718] bg-cover bg-center text-white sm:min-h-[480px] lg:min-h-[540px]"
      style={
        backgroundImage
          ? { backgroundImage: `url(${backgroundImage})` }
          : slide?.backgroundColor
            ? { backgroundColor: slide.backgroundColor }
            : undefined
      }
    >
      {backgroundImage && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(14,17,18,.92) 0%, rgba(14,17,18,.78) 45%, rgba(14,17,18,.25) 100%)",
          }}
        />
      )}

      <div className="relative container mx-auto px-6 py-12 sm:px-10">
        <div className="max-w-[620px]">
          <div className="mb-4.5 inline-flex items-center gap-2 rounded-full border border-brand/45 bg-brand/[0.18] px-3 py-1.5 text-xs font-bold tracking-wider text-brand uppercase">
            <ShieldCheck className="size-3.5" aria-hidden />
            {slide?.eyebrow || "Sadece doğrulanmış hekimler"}
          </div>

          <h1 className="mb-3.5 text-[clamp(28px,4.4vw,46px)] leading-[1.1] font-bold text-balance">
            {slide?.title ?? "Hekimlerin ikinci el pazaryeri ve meslektaş topluluğu."}
          </h1>

          {slide?.description ? (
            <div
              className="mb-6 max-w-[540px] text-[15px] leading-relaxed text-[#D7DBDC] [&_a]:underline [&_strong]:font-bold"
              dangerouslySetInnerHTML={{ __html: slide.description }}
            />
          ) : (
            <p className="mb-6 max-w-[540px] text-[15px] leading-relaxed text-[#D7DBDC]">
              Elinizde durmayan cihazdan kitaba, telefondan mobilyaya kadar her şeyi
              meslektaşlarınızla alıp satın; aradığınızı bulamıyorsanız talep açın, branş
              topluluklarında konuşun. Üyelik diploma ve tabip odası kaydı doğrulandıktan sonra
              açılır.
            </p>
          )}

          <div className="mb-6.5 flex flex-wrap gap-3">
            <Link href={slide?.linkUrl || "/kayit-ol"}>
              <Button className="bg-white text-[#141718] hover:bg-[#EDEEEE]">
                {slide?.buttonLabel || "Ücretsiz Kayıt Ol"}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/ilanlar">
              <Button variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10">
                İlanlara Göz At
              </Button>
            </Link>
          </div>

          {!slide && (
            <ul className="flex flex-wrap gap-2">
              {CHIPS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs text-white"
                >
                  <Icon className="size-3.5 text-brand" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
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
