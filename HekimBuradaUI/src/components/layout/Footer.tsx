"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gatewayApi, marketplaceApi, type MarketplaceCategory, type MenuItem } from "@/lib/api";
import { useHasToken } from "@/lib/auth";

const FALLBACK_PLATFORM_LINKS: MenuItem[] = [
  { id: "fallback-hakkimizda", location: "footer_platform", label: "Hakkımızda", url: "/hakkimizda", sortOrder: 0 },
  { id: "fallback-duyuru-panosu", location: "footer_platform", label: "Duyuru Panosu", url: "/duyuru-panosu", sortOrder: 1 },
  { id: "fallback-talepler", location: "footer_platform", label: "Talepler", url: "/talepler", sortOrder: 2 },
  { id: "fallback-iletisim", location: "footer_platform", label: "İletişim", url: "/iletisim", sortOrder: 3 },
];

const FALLBACK_RULES_LINKS: MenuItem[] = [
  { id: "fallback-kullanim-kosullari", location: "footer_rules", label: "Kullanım Koşulları", url: "/kullanim-kosullari", sortOrder: 0 },
  { id: "fallback-gizlilik-politikasi", location: "footer_rules", label: "Gizlilik Politikası", url: "/gizlilik-politikasi", sortOrder: 1 },
  { id: "fallback-dogrulama-sureci", location: "footer_rules", label: "Doğrulama Süreci", url: "/dogrulama-sureci", sortOrder: 2 },
];

export function Footer() {
  const hasToken = useHasToken();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [platformLinks, setPlatformLinks] = useState<MenuItem[]>(FALLBACK_PLATFORM_LINKS);
  const [rulesLinks, setRulesLinks] = useState<MenuItem[]>(FALLBACK_RULES_LINKS);

  useEffect(() => {
    if (!hasToken) return;
    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items.filter((c) => !c.parentId)))
      .catch(() => {});
  }, [hasToken]);

  useEffect(() => {
    // Footer linkleri admin tarafından yönetiliyor — anonim, herkese açık.
    gatewayApi
      .listMenuItems({ location: "footer_platform" })
      .then((items) => { if (items.length > 0) setPlatformLinks(items); })
      .catch(() => {});
    gatewayApi
      .listMenuItems({ location: "footer_rules" })
      .then((items) => { if (items.length > 0) setRulesLinks(items); })
      .catch(() => {});
  }, []);

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
            {platformLinks.map((l) => (
              <Link key={l.id} href={l.url} className="text-xs hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 text-[13px] font-semibold text-white">Kurallar</div>
          <div className="flex flex-col gap-1">
            {rulesLinks.map((l) => (
              <Link key={l.id} href={l.url} className="text-xs hover:text-white">
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
