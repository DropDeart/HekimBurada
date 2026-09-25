import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İlanlar",
  description:
    "Doğrulanmış doktorların paylaştığı 2. el tıbbi cihaz, muayenehane ekipmanı ve daha fazlası — HekimBurada ilanları.",
  alternates: { canonical: "/ilanlar" },
};

export default function IlanlarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
