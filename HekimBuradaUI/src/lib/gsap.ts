"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export { gsap };

let registered = false;

/**
 * ScrollTrigger'ı (yalnızca bir kez) kaydeder ve döndürür. Sunucuda `window` olmadığı için
 * `gsap.registerPlugin` çağrılmaz — bileşenler bunu her zaman `useEffect` içinden çağırmalı.
 * Kayıt başarısız olursa `null` döner; çağıran taraf ScrollTrigger'sız (anında oynayan) bir
 * animasyona düşer, sayfa yine de çalışır.
 */
export function registerScrollTrigger(): typeof ScrollTrigger | null {
  if (typeof window === "undefined") return null;
  if (!registered) {
    try {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    } catch {
      return null;
    }
  }
  return ScrollTrigger;
}

/** Kullanıcı işletim sisteminde hareketi azalt dediyse true. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
