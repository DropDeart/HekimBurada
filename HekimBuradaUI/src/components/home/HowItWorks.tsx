"use client";

import { useEffect, useRef } from "react";
import { FileBadge, Handshake, PackagePlus } from "lucide-react";
import { HOW_IT_WORKS } from "@/lib/homeContent";
import { gsap, prefersReducedMotion, registerScrollTrigger } from "@/lib/gsap";

/** HOW_IT_WORKS ile aynı sırada — adım sayısı değişirse burası da güncellenmeli. */
const ICONS = [FileBadge, PackagePlus, Handshake];

/**
 * "Nasıl çalışır?" üç adımı. Görünüme girince kartlar sırayla yükselir ve aralarındaki bağlantı
 * çizgisi soldan sağa çizilir (geniş ekranda; mobilde kartlar alt alta olduğu için çizgi gizli).
 *
 * Başlangıç durumu CSS'te değil `gsap.set` ile veriliyor — JS çalışmazsa kartlar tam görünür kalır.
 */
export function HowItWorks() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const ScrollTrigger = registerScrollTrigger();

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-step-card]", root);
      const line = root.querySelector("[data-step-line]");

      gsap.set(cards, { opacity: 0, y: 24 });
      if (line) gsap.set(line, { transformOrigin: "left center", scaleX: 0 });

      const tl = gsap.timeline({
        scrollTrigger: ScrollTrigger ? { trigger: root, start: "top 80%", once: true } : undefined,
      });

      if (line) tl.to(line, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0);
      tl.to(cards, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.14 }, 0.15);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative mt-6">
      {/* Kart başlıklarının ikon hizasından geçen bağlantı çizgisi. */}
      <span
        data-step-line
        aria-hidden
        className="absolute top-[34px] right-[16%] left-[16%] hidden h-0.5 rounded-full bg-brand/25 lg:block"
      />
      <ol className="relative grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = ICONS[i];
          return (
            <li
              key={step.title}
              data-step-card
              className="rounded-[10px] border border-border bg-white p-5"
            >
              <div className="mb-3 flex size-[52px] items-center justify-center rounded-full bg-brand-soft">
                <Icon className="size-6 text-brand" aria-hidden />
              </div>
              <h3 className="mb-1.5 text-[15px] font-bold text-foreground">
                <span className="text-brand">{i + 1}.</span> {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
