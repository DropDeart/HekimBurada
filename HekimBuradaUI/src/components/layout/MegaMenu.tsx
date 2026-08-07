"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface MegaMenuProps {
  label: string;
  href?: string;
  panel: ReactNode;
}

/**
 * Tetikleyici ile panel aynı `relative` kapsayıcının içinde: panel `absolute`
 * olsa da DOM'da bu kapsayıcının çocuğu olduğu için, fare panelin üstündeyken
 * de kapsayıcı `mouseleave` tetiklemez. Görsel boşluk `margin` yerine panelin
 * kendi `pt-2` dolgusuyla veriliyor — dolgu alanı da bu çocuğun kutusuna dahil
 * olduğundan fare oradan geçerken hover zinciri hiç kopmuyor.
 */
export function MegaMenu({ label, href, panel }: MegaMenuProps) {
  return (
    <div className="group/mega relative">
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-1 hover:text-foreground"
        >
          {label}
          <ChevronDown size={14} className="transition-transform group-hover/mega:rotate-180" />
        </Link>
      ) : (
        <button className="flex items-center gap-1 hover:text-foreground">
          {label}
          <ChevronDown size={14} className="transition-transform group-hover/mega:rotate-180" />
        </button>
      )}

      <div className="invisible absolute top-full left-0 z-40 w-max pt-2 opacity-0 transition-opacity duration-100 group-hover/mega:visible group-hover/mega:opacity-100">
        <div className="rounded-lg border border-border bg-white p-5 shadow-lg">{panel}</div>
      </div>
    </div>
  );
}
