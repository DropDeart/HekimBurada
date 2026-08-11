"use client";

import { MARKETPLACE_URL, parseListingImages } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ListingImageProps {
  images: string;
  alt: string;
  className?: string;
  placeholderText?: string;
}

/** İlan kartı/önizleme görseli — `Listing.images`'ın ilk URL'ini render eder, yoksa çizgili placeholder'a düşer. */
export function ListingImage({ images, alt, className, placeholderText = "İLAN GÖRSELİ" }: ListingImageProps) {
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
    // eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel
    <img src={`${MARKETPLACE_URL}${urls[0]}`} alt={alt} className={cn("object-cover", className)} />
  );
}
