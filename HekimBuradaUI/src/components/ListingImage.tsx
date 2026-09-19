"use client";

import Image from "next/image";
import { MARKETPLACE_URL, parseListingImages } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ListingImageProps {
  images: string;
  alt: string;
  className?: string;
  placeholderText?: string;
  /** Görsel viewport'un ne kadarını kaplayacağı — next/image'ın doğru boyutta indirmesi için. */
  sizes?: string;
}

/** İlan kartı/önizleme görseli — `Listing.images`'ın ilk URL'ini render eder, yoksa çizgili placeholder'a düşer.
 * next/image ile lazy-load + otomatik boyut/format optimizasyonu: sunucudaki orijinal (genelde birkaç MB'lık)
 * dosya yerine, kartın gerçek render boyutuna göre küçültülmüş WebP/AVIF servis edilir. */
export function ListingImage({
  images,
  alt,
  className,
  placeholderText = "İLAN GÖRSELİ",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px",
}: ListingImageProps) {
  const urls = parseListingImages(images);
  if (urls.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)] font-mono text-[11px] text-[#9AA1A5]",
          className
        )}
      >
        {placeholderText}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image src={`${MARKETPLACE_URL}${urls[0]}`} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}
