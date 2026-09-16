import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topluluklar",
  description:
    "Branşına, kullandığın cihaza ya da bulunduğun bölgeye göre kurulmuş doktor topluluklarında tartış, deneyim paylaş.",
};

export default function TopluluklarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
