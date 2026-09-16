import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Üye Ol",
  description: "Doğrulanmış doktorlar için 2. el pazaryeri ve topluluk platformu HekimBurada'ya üye olun.",
};

export default function KayitOlLayout({ children }: { children: React.ReactNode }) {
  return children;
}
