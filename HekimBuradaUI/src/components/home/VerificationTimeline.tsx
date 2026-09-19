"use client";

import { useEffect, useRef } from "react";
import { VERIFICATION_STEPS } from "@/lib/homeContent";
import { gsap, prefersReducedMotion, registerScrollTrigger } from "@/lib/gsap";

/**
 * Doğrulama sürecinin dört adımı — sayfa kaydırıldıkça dikey çizgi yukarıdan aşağı çizilir,
 * her adım sırası gelince noktası büyüyüp metni netleşir (scrub ile kaydırmaya bağlı).
 *
 * Erişilebilirlik/dayanıklılık: animasyonun başlangıç durumu CSS'te değil `gsap.set` ile veriliyor,
 * böylece JS çalışmazsa ya da `prefers-reduced-motion` açıksa dört adım da tam görünür halde kalır.
 */
export function VerificationTimeline() {
  const trackRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) return;

    const ScrollTrigger = registerScrollTrigger();
    if (!ScrollTrigger) return;

    const ctx = gsap.context(() => {
      const line = track.querySelector("[data-verify-line]");
      const dots = gsap.utils.toArray<HTMLElement>("[data-verify-dot]", track);
      const bodies = gsap.utils.toArray<HTMLElement>("[data-verify-body]", track);

      gsap.set(line, { transformOrigin: "top center" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: "top 78%",
          end: "bottom 60%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      tl.from(line, { scaleY: 0, ease: "none", duration: dots.length }, 0);

      dots.forEach((dot, i) => {
        tl.from(dot, { scale: 0.3, backgroundColor: "#dadee0", duration: 0.35, ease: "back.out(2)" }, i * 0.92);
        tl.from(bodies[i], { opacity: 0.25, x: 8, duration: 0.35, ease: "power2.out" }, i * 0.92);
      });
    }, track);

    return () => ctx.revert();
  }, []);

  return (
    <ol ref={trackRef} className="relative mt-8 space-y-16 pl-16">
      {/* Noktanın (size-10 = 40px) sağ kenarıyla metin arasında 24px boşluk kalsın diye pl-16 (64px)
          kullanılıyor; çizginin merkezi yine noktanın ortasında kalıyor (sol:19px = 40px'in yarısı - 1px),
          çünkü nokta her zaman ol'un sol kenarına -left-16 ile sabitleniyor (pl değerinden bağımsız). */}
      <span
        data-verify-line
        aria-hidden
        className="absolute top-2 bottom-2 left-[19px] w-0.5 rounded-full bg-brand"
      />
      {VERIFICATION_STEPS.map((step, i) => (
        <li key={step.title} className="relative">
          <span
            data-verify-dot
            aria-hidden
            className="absolute top-0.5 -left-16 flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
          >
            {i + 1}
          </span>
          <div data-verify-body>
            <h3 className="text-[15px] font-bold text-foreground">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
