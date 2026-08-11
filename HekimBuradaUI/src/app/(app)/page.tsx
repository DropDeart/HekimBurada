"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GATEWAY_URL, gatewayApi, marketplaceApi, type CarouselSlide, type Listing, type MarketplaceCategory, type MarketplaceRequest } from "@/lib/api";
import { useHasToken } from "@/lib/auth";

/** Admin hiç carousel slaytı eklememişse gösterilecek tek statik varsayılan slayt. */
const DEFAULT_SLIDE: CarouselSlide = {
  id: "default",
  imageUrl: "",
  eyebrow: "GÜVENİLİR PAZAR YERİ",
  title: "HekimBurada'a hoş geldiniz",
  description:
    "<p>Doğrulanmış doktorların bir araya geldiği; alışveriş yaptığı, meslektaşlarıyla haberleştiği kapalı platform.</p>",
  linkUrl: "/ilanlar",
  buttonLabel: "İlanlara Göz At",
  backgroundType: "color",
  backgroundColor: null,
  backgroundImageUrl: null,
  sortOrder: 0,
  isActive: true,
};

// Herkese açık bir "doğrulanmış doktor sayısı" ucu backend'de yok — bu sayılar şimdilik statik/gösterge niteliğinde.
const TRUST_STATS = [
  { value: "1.200+", label: "Doğrulanmış Doktor" },
  { value: "3.400+", label: "Aktif İlan" },
  { value: "%100", label: "Meslektaş Garantisi" },
];

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function Home() {
  const hasToken = useHasToken();
  const [heroIndex, setHeroIndex] = useState(0);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([DEFAULT_SLIDE]);

  useEffect(() => {
    gatewayApi
      .listCarouselSlides({ activeOnly: true })
      .then((items) => {
        if (items.length > 0) setSlides([...items].sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setHeroIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (!hasToken) return;
    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items.filter((c) => !c.parentId)))
      .catch(() => {});
    marketplaceApi
      .listRequests({ pageSize: 3 })
      .then((r) => setRequests(r.items))
      .catch(() => {});
    marketplaceApi
      .listListings({ pageSize: 7 })
      .then((r) => setListings(r.items.filter((l) => l.status === "active")))
      .catch(() => {});
  }, [hasToken]);

  const featured = listings.find((l) => l.isFeatured) ?? listings[0];
  const otherListings = listings.filter((l) => l.id !== featured?.id).slice(0, 6);
  const slide = slides[heroIndex];

  return (
    <div>
      <section
        className="relative overflow-hidden bg-[#141718] bg-cover bg-center text-white"
        style={
          slide.backgroundType === "image" && slide.backgroundImageUrl
            ? { backgroundImage: `url(${GATEWAY_URL}${slide.backgroundImageUrl})` }
            : slide.backgroundColor
              ? { backgroundColor: slide.backgroundColor }
              : undefined
        }
      >
        {slide.backgroundType === "image" && slide.backgroundImageUrl && (
          <div className="pointer-events-none absolute inset-0 bg-black/45" />
        )}
        <div className="relative container mx-auto flex flex-wrap items-center justify-between gap-8 px-6 py-14">
          <div className="max-w-[520px] min-w-[280px] flex-1">
            <div className="mb-3 text-xs font-bold tracking-wider text-brand uppercase">
              {slide.eyebrow || "GÜVENİLİR PAZAR YERİ"}
            </div>
            <h1 className="mb-3 text-2xl leading-tight font-bold sm:text-3xl">
              {slide.title ?? "HekimBurada"}
            </h1>
            {slide.description && (
              <div
                className="mb-5 max-w-[440px] text-sm text-[#B7BCBE] [&_a]:underline [&_strong]:font-bold"
                dangerouslySetInnerHTML={{ __html: slide.description }}
              />
            )}
            <Link href={slide.linkUrl || "/ilanlar"}>
              <Button className="bg-white text-[#141718] hover:bg-[#EDEEEE]">
                {slide.buttonLabel || "İlanlara Göz At"}
              </Button>
            </Link>
          </div>
          {slide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin panelden yüklenen keyfi harici görsel
            <img
              src={`${GATEWAY_URL}${slide.imageUrl}`}
              alt={slide.title ?? ""}
              className="h-[170px] w-[280px] min-w-[200px] shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-[170px] w-[280px] min-w-[200px] shrink-0 items-center justify-center rounded-xl bg-white/5 font-mono text-[11px] text-[#6C7275]">
              GÖRSEL
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2 pb-5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setHeroIndex(i)}
              aria-label={`${i + 1}. slayt`}
              className={`size-2 rounded-full ${i === heroIndex ? "bg-brand" : "bg-white/35"}`}
            />
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-8 border-t border-[#2A2E30] px-10 py-5 sm:gap-16">
          {TRUST_STATS.map((t) => (
            <div key={t.label} className="text-center">
              <div className="text-xl font-bold">{t.value}</div>
              <div className="text-xs text-[#9AA1A5]">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pt-9 pb-2 sm:px-10">
        <h2 className="mb-4 text-2xl font-bold text-foreground">Kategoriler</h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasToken ? "Henüz kategori eklenmedi." : "Kategorileri görmek için giriş yapın."}
            </p>
          ) : (
            categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/ilanlar?kategori=${cat.id}`}
                className="rounded-[10px] border border-border bg-white p-4.5 hover:border-brand/50"
              >
                <div className="mb-1 text-[15px] font-bold text-foreground">{cat.name}</div>
                <div className="text-xs text-muted-foreground">İlanlara göz atın</div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="px-6 pt-8 pb-2 sm:px-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-foreground">Talepler</h2>
          <Link href="/talepler" className="text-sm font-semibold text-brand">
            Tümünü gör
          </Link>
        </div>
        <p className="mt-1 mb-4 text-[13px] text-muted-foreground">
          Meslektaşlarınızın aradığı ürün ve fırsatlar.
        </p>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasToken ? "Henüz talep yok." : "Talepleri görmek için giriş yapın."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <div key={req.id} className="rounded-[10px] border border-border bg-[#FAFBFB] p-4">
                <div className="mb-1.5 inline-block rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                  Talep
                </div>
                <div className="mb-1.5 text-sm font-bold text-foreground">{req.title}</div>
                <div className="text-xs text-muted-foreground">
                  {req.budgetMax ? `Bütçe: ${currency(req.budgetMax)}` : "Bütçe belirtilmedi"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-6 pt-8 pb-14 sm:px-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-foreground">Öne Çıkan İlanlar</h2>
          <Link href="/ilanlar" className="text-sm font-semibold text-brand">
            Tüm ilanlar
          </Link>
        </div>

        {!featured ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border py-14 text-center">
            <p className="text-sm text-muted-foreground">
              {hasToken
                ? "Henüz ilan yok — ilk ilanı siz verin."
                : "İlanları görmek için giriş yapın."}
            </p>
            {hasToken && (
              <Link href="/ilan-ver">
                <Button>İlan Ver</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/ilanlar/${featured.id}`}
              className="col-span-1 flex flex-wrap overflow-hidden rounded-[10px] border border-border bg-white sm:col-span-2"
            >
              <div className="flex min-h-[200px] flex-1 basis-[260px] items-center justify-center bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)] font-mono text-[11px] text-[#9AA1A5]">
                İLAN GÖRSELİ
              </div>
              <div className="flex flex-1 basis-[260px] flex-col justify-center p-5.5">
                <div className="mb-2.5 inline-block w-fit rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                  ÖNE ÇIKAN
                </div>
                <div className="mb-1.5 text-lg font-bold text-foreground">{featured.title}</div>
                <div className="mb-2.5 text-lg font-bold text-brand">
                  {featured.price ? currency(featured.price) : "Fiyat belirtilmedi"}
                </div>
                <div className="text-xs text-muted-foreground">{featured.city}</div>
              </div>
            </Link>

            {otherListings.map((l) => (
              <Link
                key={l.id}
                href={`/ilanlar/${l.id}`}
                className="overflow-hidden rounded-[10px] border border-border bg-white"
              >
                <div className="flex h-[150px] items-center justify-center bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)] font-mono text-[11px] text-[#9AA1A5]">
                  İLAN GÖRSELİ
                </div>
                <div className="p-3.5">
                  <div className="mb-1 text-sm font-bold text-foreground">{l.title}</div>
                  <div className="text-[15px] font-bold text-brand">
                    {l.price ? currency(l.price) : "Fiyat belirtilmedi"}
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{l.city}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
