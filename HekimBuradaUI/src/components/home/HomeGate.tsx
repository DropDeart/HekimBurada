"use client";

import type { ReactNode } from "react";
import { useHasToken } from "@/lib/auth";
import { MemberHome } from "./MemberHome";

/** Ana sayfada misafir/üye ayrımı — bkz. tasarım dosyasındaki üst önizleme anahtarı. Token
 * client-side (localStorage) tutulduğundan sunucuda bilinmiyor; SSR/hydration'da hep misafir
 * içeriği (children) render edilir, token varsa client'ta üye paneline geçilir. */
export function HomeGate({ children }: { children: ReactNode }) {
  const hasToken = useHasToken();
  return hasToken ? <MemberHome /> : <>{children}</>;
}
