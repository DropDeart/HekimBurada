import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "HekimBurada hesabınıza giriş yapın.",
};

export default function GirisYapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
