import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talepler",
  description: "Meslektaşların aradığı ürün ve ekipman taleplerini görün, HekimBurada'da teklif verin.",
};

export default function TaleplerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
