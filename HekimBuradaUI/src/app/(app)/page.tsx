import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingImage } from "@/components/ListingImage";
import { CategoryIcon } from "@/lib/categoryIcons";
import { FaqList } from "@/components/home/FaqList";
import { HomeGate } from "@/components/home/HomeGate";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Reveal } from "@/components/home/Reveal";
import { VerificationTimeline } from "@/components/home/VerificationTimeline";
import { FAQ, FEATURED_SUBCATEGORIES, HOME_FAQ_COUNT } from "@/lib/homeContent";
import {
  fetchActiveListings,
  fetchCarouselSlides,
  fetchCategories,
  fetchCommunities,
  fetchOpenRequests,
} from "@/lib/serverApi";

/**
 * Ana sayfa — Server Component.
 *
 * Eskiden bu sayfa "use client" idi ve TÜM verisini `useEffect` içinde, üstelik yalnızca token
 * varsa çekiyordu; giriş yapmamış ziyaretçiye (ve arama motoruna) sayfa kaynağında sadece
 * "Görüntülemek için giriş yapın" metni gidiyordu. Artık veri sunucuda çekiliyor ve tanıtım
 * metinlerinin tamamı HTML'de yer alıyor.
 */

/** Veri 5 dakikada bir tazelenir; sayfa bu süre boyunca CDN'den statik olarak servis edilir. */
export const revalidate = 300;

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

/** Öne çıkan ilan rozetinde gösterilecek ödeme yöntemi etiketi (yalnızca dikkat çekenler). */
function paymentBadge(paymentMethod: string): string | null {
  if (paymentMethod === "bedelsiz") return "BEDELSİZ";
  if (paymentMethod === "bagis") return "BAĞIŞ İLE";
  return null;
}

export default async function Home() {
  const [slides, categories, listings, requests, communities] = await Promise.all([
    fetchCarouselSlides(),
    fetchCategories(),
    fetchActiveListings(12),
    fetchOpenRequests(4),
    fetchCommunities(8),
  ]);

  const topCategories = categories.filter((c) => !c.parentId);

  // Öne çıkan alt kategoriler İSİMLE eşleştiriliyor (bkz. FEATURED_SUBCATEGORIES yorumu).
  // Ana kategori kimliği de lazım: /ilanlar hem `kategori` hem `alt` parametresini isteyerek
  // ana ve alt kategoriyi birlikte işaretliyor.
  const featuredSubs = FEATURED_SUBCATEGORIES.map((entry) => {
    const sub = categories.find((c) => c.name === entry.name && c.parentId);
    if (!sub) return null;
    return { ...entry, id: sub.id, parentId: sub.parentId as string, icon: sub.icon };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const featured = listings.find((l) => l.isFeatured) ?? listings[0];
  const otherListings = listings.filter((l) => l.id !== featured?.id).slice(0, 6);

  return (
    <HomeGate>
    <div>
      <HomeHero slides={slides} />

      {/* ---------------------------------------------------------------- Kategoriler */}
      <section className="container mx-auto px-6 pt-12 sm:px-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Kategoriler</h2>
          <Link href="/ilanlar" className="text-sm font-semibold text-brand">
            Tüm kategoriler
          </Link>
        </div>
        <p className="mt-1.5 max-w-[620px] text-sm text-muted-foreground">
          İkinci el cihazdan devren muayenehaneye, kitaptan araca kadar hepsi meslektaşlarınızdan.
        </p>

        {topCategories.length > 0 && (
          <Reveal className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/ilanlar?kategori=${cat.id}`}
                className="rounded-[10px] border border-border bg-white p-4.5 transition-colors hover:border-brand/50"
              >
                <CategoryIcon icon={cat.icon} className="mb-2 size-5 text-brand" />
                <div className="mb-1 text-[15px] font-bold text-foreground">{cat.name}</div>
                <div className="text-xs text-muted-foreground">İlanlara göz atın</div>
              </Link>
            ))}
          </Reveal>
        )}

        {featuredSubs.length > 0 && (
          <>
            <h3 className="mt-7 mb-3 text-sm font-bold text-foreground">Çok bakılan alt kategoriler</h3>
            <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" stagger>
              {featuredSubs.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/ilanlar?kategori=${sub.parentId}&alt=${sub.id}`}
                  className="rounded-[10px] border border-border bg-white p-3.5 transition-colors hover:border-brand/50"
                >
                  <CategoryIcon icon={sub.icon} className="mb-1.5 size-4 text-brand" />
                  <div className="text-[13px] font-bold text-foreground">{sub.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{sub.blurb}</div>
                </Link>
              ))}
            </Reveal>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- Nasıl çalışır */}
      <section className="container mx-auto px-6 pt-14 sm:px-10">
        <h2 className="text-2xl font-bold text-foreground">Nasıl çalışır?</h2>
        <p className="mt-1.5 max-w-[620px] text-sm text-muted-foreground">
          Üç adım: belgeni onaylat, ilanını yayınla, teklifleri platform içinde yönet.
        </p>
        <HowItWorks />
      </section>

      {/* ---------------------------------------------------------------- Öne çıkan ilanlar */}
      {featured && (
        <section className="container mx-auto px-6 pt-14 sm:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">Öne Çıkan İlanlar</h2>
            <Link href="/ilanlar" className="text-sm font-semibold text-brand">
              Tüm ilanlar
            </Link>
          </div>
          <p className="mt-1.5 max-w-[620px] text-sm text-muted-foreground">
            Fiyatı satıcı hekim belirler; teklif verebilir, elden teslim veya kargo seçebilirsiniz.
          </p>

          <Reveal className="mt-5 grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3" stagger>
            <Link
              href={`/ilanlar/${featured.id}`}
              className="col-span-1 flex flex-wrap overflow-hidden rounded-[10px] border border-border bg-white sm:col-span-2"
            >
              <ListingImage
                images={featured.images}
                alt={featured.title}
                className="h-[220px] flex-1 basis-[260px]"
              />
              <div className="flex flex-1 basis-[260px] flex-col justify-center p-5.5">
                <div className="mb-2.5 inline-block w-fit rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                  {paymentBadge(featured.paymentMethod) ?? "ÖNE ÇIKAN"}
                </div>
                <div className="mb-1.5 text-lg font-bold text-foreground">{featured.title}</div>
                <div className="mb-2.5 text-lg font-bold text-brand">
                  {featured.paymentMethod === "bedelsiz"
                    ? "Ücretsiz"
                    : featured.price
                      ? currency(featured.price)
                      : "Görüşülür"}
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
                <ListingImage images={l.images} alt={l.title} className="h-[150px] w-full" />
                <div className="p-3.5">
                  {paymentBadge(l.paymentMethod) && (
                    <div className="mb-1.5 inline-block rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                      {paymentBadge(l.paymentMethod)}
                    </div>
                  )}
                  <div className="mb-1 text-sm font-bold text-foreground">{l.title}</div>
                  <div className="text-[15px] font-bold text-brand">
                    {l.paymentMethod === "bedelsiz"
                      ? "Ücretsiz"
                      : l.price
                        ? currency(l.price)
                        : "Görüşülür"}
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{l.city}</div>
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      {/* ---------------------------------------------------------------- Talepler */}
      {requests.length > 0 && (
        <section className="container mx-auto px-6 pt-14 sm:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">Talepler</h2>
            <Link href="/talepler" className="text-sm font-semibold text-brand">
              Tümünü gör
            </Link>
          </div>
          <p className="mt-1.5 max-w-[620px] text-sm text-muted-foreground">
            Meslektaşlarınızın aradığı ürünler. Elinizde varsa doğrudan teklif verin.
          </p>

          <Reveal className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {requests.map((req) => (
              <Link
                key={req.id}
                href={`/talepler/${req.id}`}
                className="rounded-[10px] border border-border bg-white p-4 transition-colors hover:border-brand/50"
              >
                <div className="mb-1.5 inline-block rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                  Açık
                </div>
                <div className="mb-1.5 text-sm font-bold text-foreground">{req.title}</div>
                <div className="text-xs text-muted-foreground">
                  {req.budgetMax ? `Bütçe: ${currency(req.budgetMax)}` : "Bütçe belirtilmedi"}
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      {/* ---------------------------------------------------------------- Doğrulama süreci */}
      <section className="mt-16 bg-[#141718] py-14 text-white">
        <div className="container mx-auto grid grid-cols-1 gap-10 px-6 sm:px-10 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-xs font-bold tracking-wider text-brand uppercase">
              Doğrulama süreci
            </div>
            <h2 className="text-2xl leading-tight font-bold sm:text-[28px]">
              Platforma kimin girdiğini biliyoruz — bu yüzden siz de biliyorsunuz.
            </h2>
            <p className="mt-3 max-w-[460px] text-sm leading-relaxed text-[#B7BCBE]">
              Her üyelik dört adımdan geçer. Adımlar tamamlanmadan ilan verme, teklif ve topluluk
              erişimi açılmaz.
            </p>
            <Link
              href="/dogrulama-sureci"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
            >
              Doğrulama sürecini oku
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Koyu zeminde okunurluk için metin renkleri burada eziliyor. */}
          <div className="[&_h3]:text-white [&_p]:text-[#B7BCBE]">
            <VerificationTimeline />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Bağış & bedelsiz */}
      <section id="bagis" className="container mx-auto px-6 pt-14 sm:px-10">
        <Reveal className="grid grid-cols-1 items-center overflow-hidden rounded-[10px] border border-border bg-white lg:grid-cols-2">
          <div className="p-7 sm:p-9">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">
              <Gift className="size-3.5" aria-hidden />
              Bağış &amp; bedelsiz
            </div>
            <h2 className="max-w-[420px] text-2xl leading-tight font-bold text-foreground text-balance">
              Satmak zorunda değilsiniz — bağışlayabilir, bedelsiz verebilirsiniz.
            </h2>
            <p className="mt-3 max-w-[460px] text-sm leading-relaxed text-muted-foreground">
              İlanı yayınlarken ödeme yöntemi olarak <strong className="text-foreground">bağış ile ödeme</strong>,{" "}
              <strong className="text-foreground">bedelsiz ürün</strong> veya{" "}
              <strong className="text-foreground">referans linkli indirim</strong> seçebilirsiniz. Bağışta alıcı,
              ürünün bedelini sizin belirlediğiniz kuruma bağışlar ve dekontu ilana ekler.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Bağış ile ödeme", "Bedelsiz ürün", "Referans linkli indirim", "Elden teslim"].map((tag) => (
                <span key={tag} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="relative min-h-[220px] lg:min-h-[280px]">
            <Image
              src="/images/bagis-bedelsiz.jpg"
              alt="Bir hekim, meslektaşına bağışladığı tıbbi malzeme kutusunu teslim ediyor"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- Branş toplulukları */}
      {communities.length > 0 && (
        <section className="container mx-auto px-6 pt-14 sm:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">Branş Toplulukları</h2>
            <Link href="/topluluk" className="text-sm font-semibold text-brand">
              Tüm topluluklar
            </Link>
          </div>
          <p className="mt-1.5 max-w-[620px] text-sm text-muted-foreground">
            Cihaz tavsiyesi, servis deneyimi, muayenehane yönetimi — branşınızın grubunda.
          </p>

          <Reveal className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {communities.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/topluluk/${c.id}`}
                className="rounded-[10px] border border-border bg-white p-4.5 transition-colors hover:border-brand/50"
              >
                <Users className="mb-2 size-5 text-brand" aria-hidden />
                <div className="mb-1 text-[15px] font-bold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.isClosed ? "Üyelere özel grup" : "Herkese açık grup"}
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      {/* ---------------------------------------------------------------- SSS */}
      <section className="container mx-auto px-6 pt-14 sm:px-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Sıkça Sorulan Sorular</h2>
          <Link href="/sss" className="text-sm font-semibold text-brand">
            Tüm sorular
          </Link>
        </div>
        <p className="mt-1.5 max-w-[620px] text-sm text-muted-foreground">
          En çok sorulan {HOME_FAQ_COUNT} soru. Kalanı için SSS sayfasına göz atın.
        </p>
        <FaqList items={FAQ.slice(0, HOME_FAQ_COUNT)} />
      </section>

      {/* ---------------------------------------------------------------- Kapanış CTA */}
      <section className="container mx-auto px-6 py-16 sm:px-10">
        <div className="rounded-[14px] bg-[#141718] px-6 py-12 text-center text-white sm:px-10">
          <h2 className="mx-auto max-w-[520px] text-2xl leading-tight font-bold">
            Meslektaşlarınızın pazaryerine katılın.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-sm text-[#B7BCBE]">
            Kayıt ücretsiz. Belgeleriniz onaylandıktan sonra ilan verme, talep açma, bağış akışı ve
            topluluk erişiminin tamamı açılır.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/kayit-ol">
              <Button className="bg-brand text-white hover:bg-brand/85">Ücretsiz Kayıt Ol</Button>
            </Link>
            <Link href="/giris-yap">
              <Button className="bg-white text-[#141718] hover:bg-[#EDEEEE]">Giriş Yap</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
    </HomeGate>
  );
}
