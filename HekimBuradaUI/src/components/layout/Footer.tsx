"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { marketplaceApi, type MarketplaceCategory } from "@/lib/api";
import { useHasToken } from "@/lib/auth";

const PLATFORM_LINKS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/duyuru-panosu", label: "Duyuru Panosu" },
  { href: "/talepler", label: "Talepler" },
  { href: "/iletisim", label: "İletişim" },
];

const RULES_LINKS = [
  { href: "/kullanim-kosullari", label: "Kullanım Koşulları" },
  { href: "/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/dogrulama-sureci", label: "Doğrulama Süreci" },
];

export function Footer() {
  const hasToken = useHasToken();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);

  useEffect(() => {
    if (!hasToken) return;
    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items.filter((c) => !c.parentId)))
      .catch(() => {});
  }, [hasToken]);

  return (
    <footer className="mt-auto bg-[#141718] px-6 py-11 text-[#B7BCBE] sm:px-10">
      <div className="container mx-auto grid grid-cols-1 gap-7 border-b border-[#2A2E30] pb-7 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-2.5 text-[17px] font-extrabold text-white">HekimBurada</div>
          <p className="max-w-[240px] text-xs leading-relaxed">
            Doğrulanmış doktorlar için kapalı 2. el alışveriş ve talep platformu.
          </p>
        </div>

        <div>
          <div className="mb-2.5 text-[13px] font-semibold text-white">Kategoriler</div>
          <div className="flex flex-col gap-1">
            {categories.length === 0 ? (
              <span className="text-xs">—</span>
            ) : (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/ilanlar?kategori=${cat.id}`}
                  className="text-xs hover:text-white"
                >
                  {cat.name}
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2.5 text-[13px] font-semibold text-white">Platform</div>
          <div className="flex flex-col gap-1">
            {PLATFORM_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 text-[13px] font-semibold text-white">Kurallar</div>
          <div className="flex flex-col gap-1">
            {RULES_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto pt-4 text-xs">
        © {new Date().getFullYear()} HekimBurada. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
