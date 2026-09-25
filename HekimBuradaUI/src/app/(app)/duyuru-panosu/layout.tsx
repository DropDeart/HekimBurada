import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duyuru Panosu",
  description: "HekimBurada'daki güncel duyuruları ve platform haberlerini takip edin.",
  alternates: { canonical: "/duyuru-panosu" },
};

export default function DuyuruPanosuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
