import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/home/FaqList";
import { FAQ } from "@/lib/homeContent";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description:
    "HekimBurada üyeliği, belge doğrulama süresi, ilan verme, bağış ve bedelsiz ürün seçenekleri, ödeme ve teslimat hakkında en çok sorulan soruların yanıtları.",
  alternates: { canonical: "/sss" },
};

/**
 * FAQPage yapılandırılmış verisi — Google'ın arama sonucunda soruları açılır başlıklar halinde
 * gösterebilmesi için. Sayfadaki görünür metinle BİREBİR aynı kaynaktan (lib/homeContent) üretiliyor;
 * Google, yapılandırılmış veride sayfada görünmeyen içerik olmasını politika ihlali sayıyor.
 */
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export default function SssPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16 sm:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      <h1 className="mb-3 text-2xl font-bold text-foreground">Sıkça Sorulan Sorular</h1>
      <p className="max-w-[620px] text-sm leading-relaxed text-muted-foreground">
        Üyelik koşulları, belge doğrulama, ilan yayınlama ve ödeme seçenekleri hakkında en çok
        sorulan sorular. Aradığınız yanıtı bulamadıysanız{" "}
        <Link href="/iletisim" className="font-semibold text-brand underline">
          bize ulaşın
        </Link>
        .
      </p>

      <FaqList items={FAQ} />

      <div className="mt-8 rounded-[10px] border border-border bg-white p-5">
        <h2 className="mb-1.5 text-[15px] font-bold text-foreground">Başka bir sorunuz mu var?</h2>
        <p className="text-sm text-muted-foreground">
          Doğrulama sürecinin adımlarını{" "}
          <Link href="/dogrulama-sureci" className="font-semibold text-brand underline">
            doğrulama süreci
          </Link>{" "}
          sayfasında, platform kurallarını{" "}
          <Link href="/kullanim-kosullari" className="font-semibold text-brand underline">
            kullanım koşullarında
          </Link>{" "}
          bulabilirsiniz.
        </p>
      </div>
    </div>
  );
}
