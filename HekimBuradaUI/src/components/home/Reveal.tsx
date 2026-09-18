"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, registerScrollTrigger } from "@/lib/gsap";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Kaç saniye sonra başlasın — aynı satırdaki kartları sırayla getirmek için. */
  delay?: number;
  /** Alt alta gelen doğrudan çocukları tek tek (stagger ile) getirir. */
  stagger?: boolean;
  as?: "div" | "section" | "ul";
}

/**
 * Görünüm alanına girince içeriği aşağıdan yukarı süzerek getiren sarmalayıcı.
 *
 * İki kritik nokta:
 * 1. Başlangıç durumu CSS ile DEĞİL, `gsap.set` ile veriliyor. CSS'te `opacity:0` verilseydi JS
 *    kapalıyken (veya GSAP yüklenemezse) içerik kalıcı olarak görünmez kalırdı — Google'ın
 *    render etmediği bir durumda tüm ana sayfa boş görünebilirdi.
 * 2. `prefers-reduced-motion` açıksa hiç animasyon kurulmuyor, içerik olduğu gibi duruyor.
 */
export function Reveal({ children, className, delay = 0, stagger = false, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ScrollTrigger = registerScrollTrigger();
    const targets = stagger ? Array.from(el.children) : [el];
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: 18 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay,
        ease: "power2.out",
        stagger: stagger ? 0.09 : 0,
        scrollTrigger: ScrollTrigger ? { trigger: el, start: "top 88%", once: true } : undefined,
      });
    }, el);

    return () => ctx.revert();
  }, [delay, stagger]);

  const Tag = as;
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
