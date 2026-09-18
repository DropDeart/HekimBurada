import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/homeContent";

/**
 * SSS listesi. Bilinçli olarak `<details>/<summary>` ile yazıldı — açılır/kapanır davranış için
 * JavaScript gerekmiyor, dolayısıyla bileşen bir Server Component olarak kalabiliyor ve soruların
 * TAM METNİ sayfa kaynağında yer alıyor. JS ile kurulan bir akordeonda cevaplar ancak tıklayınca
 * DOM'a girerdi; burada arama motoru hepsini doğrudan okuyor.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="mt-5 divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-white">
      {items.map((item) => (
        <details key={item.question} className="group px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-foreground">
            {item.question}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
