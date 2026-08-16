"use client";

import { useState } from "react";
import { MARKETPLACE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

interface ListingPreviewCardProps {
  images: string[];
  title: string;
  categoryName: string;
  price: number | null;
  showPrice: boolean;
  condition?: string;
  city: string;
  description: string;
  isFeatured: boolean;
  /** "compact": sihirbazın yan panelindeki dar alan için tek sütun, küçük görsel.
   * "full": /ilanlar/[id] ile aynı iki sütunlu düzen (Önizle modalı için). */
  variant: "compact" | "full";
}

/**
 * /ilanlar/[id] (gerçek ilan detay sayfası) ile aynı görsel dili — ilan-ver sihirbazındaki
 * önizlemenin, yayınlandığında gerçekte nasıl görüneceğinden farklı durmaması için paylaşılan
 * bir bileşene çıkarıldı (bkz. proje notu: "önizleme, ilan detay sayfası nasılsa öyle gözükmeli").
 */
export function ListingPreviewCard({
  images,
  title,
  categoryName,
  price,
  showPrice,
  condition,
  city,
  description,
  isFeatured,
  variant,
}: ListingPreviewCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainImage = images[activeIndex] ?? images[0];
  const imageHeight = variant === "full" ? "h-[280px]" : "h-[140px]";

  const imageBlock = (
    <div>
      {mainImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel
        <img
          src={`${MARKETPLACE_URL}${mainImage}`}
          alt={title}
          className={cn(imageHeight, "w-full rounded-[10px] object-cover")}
        />
      ) : (
        <div
          className={cn(
            imageHeight,
            "flex w-full items-center justify-center rounded-[10px] bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)] font-mono text-[11px] text-[#9AA1A5]"
          )}
        >
          İLAN GÖRSELİ
        </div>
      )}
      {variant === "full" && images.length > 1 && (
        <div className="mt-2.5 grid grid-cols-4 gap-2.5">
          {images.slice(0, 4).map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-[60px] overflow-hidden rounded-lg border-2",
                i === activeIndex ? "border-brand" : "border-transparent"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel */}
              <img src={`${MARKETPLACE_URL}${url}`} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const infoBlock = (
    <div className={variant === "full" ? "" : "p-3.5"}>
      <div className="mb-1 text-[11px] font-bold text-brand">{categoryName || "Kategori seçilmedi"}</div>
      <div className={cn(variant === "full" ? "mb-1.5 text-xl" : "mb-1 text-sm", "font-bold text-foreground")}>
        {title || "İlan Başlığı"}
      </div>
      {variant === "full" && city && <div className="mb-3 text-[13px] text-muted-foreground">{city}</div>}

      {showPrice ? (
        <div className={cn(variant === "full" ? "text-2xl" : "text-[15px]", "font-bold text-brand")}>
          {price ? currency(price) : "Fiyat belirtilmedi"}
        </div>
      ) : (
        <div className="text-[13px] text-muted-foreground">İlan (fiyatsız)</div>
      )}

      {variant === "full" && (
        <>
          <div className="mt-3 mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {condition && <span>{condition}</span>}
            {!condition && city && <span>{city}</span>}
            {isFeatured && <span className="font-semibold text-brand">Öne Çıkan</span>}
          </div>
          <hr className="mb-3 border-border" />
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#4A5053]">
            {description || "Açıklama girilmedi."}
          </p>
        </>
      )}
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="overflow-hidden rounded-[10px] border border-border bg-white">
        {imageBlock}
        {infoBlock}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {imageBlock}
      {infoBlock}
    </div>
  );
}
