"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  CircleDot,
  Eye,
  Handshake,
  Heart,
  Megaphone,
  MessageSquare,
  Plus,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingImage } from "@/components/ListingImage";
import { Reveal } from "@/components/home/Reveal";
import { auth } from "@/lib/auth";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { cn } from "@/lib/utils";
import {
  communityApi,
  identityApi,
  marketplaceApi,
  messagingApi,
  type DoctorProfile,
  type Listing,
  type MarketplaceRequest,
  type Me,
  type Offer,
  type Topic,
  type UserLookupRow,
} from "@/lib/api";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

function paymentBadge(paymentMethod: string): string | null {
  if (paymentMethod === "bedelsiz") return "BEDELSİZ";
  if (paymentMethod === "bagis") return "BAĞIŞ İLE";
  return null;
}

type ListingFilter = "region" | "new" | "donation";

interface DashboardData {
  me: Me;
  profile: DoctorProfile | null;
  myListings: Listing[];
  myRequests: MarketplaceRequest[];
  incomingOffers: Offer[];
  offerCountByRequestId: Map<string, number>;
  favoritesCount: number;
  unreadMessages: number;
  activeListingsOthers: Listing[];
  regionToken: string;
  myTopics: Topic[];
  buyers: Map<string, UserLookupRow>;
}

/** Ana sayfanın giriş yapmış kullanıcıya gösterilen üye paneli — bkz. tasarım dosyasındaki
 * "Giriş yapıldıktan sonra" ekranı. Verinin tamamı zaten var olan Marketplace/Community/Messaging
 * uçlarından çekilip burada birleştiriliyor; bu panel için yeni bir backend ucu gerekmedi. */
export function MemberHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [listingFilter, setListingFilter] = useState<ListingFilter>("region");

  const load = useCallback(async () => {
    const myId = auth.getUserId();
    if (!myId) return;

    try {
      const [
        me,
        profile,
        listingsRes,
        requestsRes,
        offersRes,
        requestOffersRes,
        favoritesRes,
        messagesRes,
        membershipsRes,
        topicsRes,
      ] = await Promise.all([
        identityApi.me(),
        identityApi.doctorProfile().catch(() => null),
        marketplaceApi.listListings({ pageSize: 500 }),
        marketplaceApi.listRequests({ pageSize: 500 }),
        marketplaceApi.listOffers({ pageSize: 500 }),
        marketplaceApi.listRequestOffers({ pageSize: 500 }),
        marketplaceApi.listFavorites({ pageSize: 1 }),
        messagingApi.listMessages({ pageSize: 500 }),
        communityApi.listMemberships({ pageSize: 200 }),
        communityApi.listTopics({ pageSize: 200 }),
      ]);

      const myListings = listingsRes.items.filter((l) => l.sellerId === myId);
      const myListingIds = new Set(myListings.map((l) => l.id));
      const myRequests = requestsRes.items.filter((r) => r.requesterId === myId);
      const myRequestIds = new Set(myRequests.map((r) => r.id));

      const incomingOffers = offersRes.items
        .filter((o) => myListingIds.has(o.listingId) && o.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const offerCountByRequestId = new Map<string, number>();
      for (const ro of requestOffersRes.items) {
        if (myRequestIds.has(ro.requestId)) {
          offerCountByRequestId.set(ro.requestId, (offerCountByRequestId.get(ro.requestId) ?? 0) + 1);
        }
      }

      // "Bana ait sohbetler" — mesajlar sayfasındaki aynı mantık: bir Offer/RequestOffer'a
      // katıldığım (alıcı/satıcı/talep sahibi/teklif veren) her thread benimdir.
      const myThreadIds = new Set<string>([
        ...offersRes.items.filter((o) => myListingIds.has(o.listingId) || o.buyerId === myId).map((o) => o.id),
        ...requestOffersRes.items
          .filter((ro) => myRequestIds.has(ro.requestId) || ro.responderId === myId)
          .map((ro) => ro.id),
      ]);
      const unreadMessages = messagesRes.items.filter(
        (m) => myThreadIds.has(m.offerId) && m.senderId !== myId && !m.readAt
      ).length;

      const region = profile?.region ?? "";
      const regionToken = region.split(",").pop()?.trim() ?? region;
      const activeListingsOthers = listingsRes.items
        .filter((l) => l.status === "active" && l.sellerId !== myId)
        .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());

      const myMemberships = membershipsRes.items.filter((m) => m.userId === myId);
      const myCategoryIds = new Set(myMemberships.map((m) => m.categoryId));
      const myTopics = topicsRes.items
        .filter((t) => myCategoryIds.has(t.categoryId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);

      const buyerIds = [...new Set(incomingOffers.slice(0, 3).map((o) => o.buyerId))];
      const buyerRows = buyerIds.length > 0 ? await identityApi.lookupUsers(buyerIds) : [];

      setData({
        me,
        profile,
        myListings,
        myRequests,
        incomingOffers,
        offerCountByRequestId,
        favoritesCount: favoritesRes.totalCount,
        unreadMessages,
        activeListingsOthers,
        regionToken,
        myTopics,
        buyers: new Map(buyerRows.map((r) => [r.id, r])),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ana sayfa verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  useLiveRefresh(load);

  const respondToOffer = async (offer: Offer, accept: boolean) => {
    setBusyOfferId(offer.id);
    try {
      if (accept) {
        await marketplaceApi.acceptOffer(offer.id);
        toast.success("Teklif kabul edildi.");
      } else {
        await marketplaceApi.rejectOffer(offer.id);
        toast.success("Teklif reddedildi.");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusyOfferId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  const { me, profile, myRequests, incomingOffers, offerCountByRequestId, myTopics, buyers } = data;
  const displayName = me.fullName?.trim() || me.email.split("@")[0];
  const activeListingsCount = data.myListings.filter((l) => l.status === "active").length;
  const totalViews = data.myListings.reduce((sum, l) => sum + l.viewCount, 0);

  const stats: { icon: typeof Handshake; value: number; label: string; href: string }[] = [
    { icon: Handshake, value: incomingOffers.length, label: "bekleyen teklif", href: "/mesajlar" },
    { icon: MessageSquare, value: data.unreadMessages, label: "okunmamış mesaj", href: "/mesajlar" },
    { icon: Tag, value: activeListingsCount, label: "aktif ilanım", href: "/ilanlarim" },
    { icon: Heart, value: data.favoritesCount, label: "favorim", href: "/favoriler" },
    { icon: Eye, value: totalViews, label: "ilan görüntülenmesi", href: "/ilanlarim" },
  ];

  const listingFilters: { key: ListingFilter; label: string }[] = [
    { key: "region", label: profile?.region ? profile.region : "Bölgem" },
    { key: "new", label: "Yeni eklenen" },
    { key: "donation", label: "Bedelsiz & bağış" },
  ];

  const suggestedListings = (
    listingFilter === "donation"
      ? data.activeListingsOthers.filter((l) => paymentBadge(l.paymentMethod) !== null)
      : listingFilter === "region" && data.regionToken
        ? data.activeListingsOthers.filter((l) => l.city.includes(data.regionToken))
        : data.activeListingsOthers
  ).slice(0, 4);

  return (
    <div>
      {/* ---------------------------------------------------------------- Karşılama */}
      <section className="border-b border-border bg-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-6.5 sm:px-10">
          <div>
            {profile && (
              <div
                className={cn(
                  "mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  profile.verificationStatus === "approved"
                    ? "bg-brand-soft text-brand"
                    : profile.verificationStatus === "rejected"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                )}
              >
                <BadgeCheck className="size-3.5" aria-hidden />
                {profile.verificationStatus === "approved"
                  ? "Doğrulanmış hekim"
                  : profile.verificationStatus === "rejected"
                    ? "Doğrulama reddedildi"
                    : "Doğrulama bekleniyor"}
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground sm:text-[28px]">
              Hoş geldiniz, {displayName}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {[profile?.specialty, profile?.region].filter(Boolean).join(" · ") ||
                "İlan verme, teklif alma ve topluluk erişiminiz açık."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/ilan-ver">
              <Button className="bg-[#141718] text-white hover:bg-[#141718]/85">
                <Plus className="size-4" aria-hidden />
                İlan Ver
              </Button>
            </Link>
            <Link href="/talep-ver">
              <Button variant="outline">
                <Megaphone className="size-4" aria-hidden />
                Talep Oluştur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- İstatistikler */}
      <section className="container mx-auto px-6 pt-6 sm:px-10">
        <Reveal className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5" stagger>
          {stats.map(({ icon: Icon, value, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-[10px] border border-border bg-white p-4 transition-colors hover:border-brand/50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div>
                <div className="text-lg font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- Teklifler & Taleplerim */}
      <section className="container mx-auto px-6 pt-7 sm:px-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Gelen teklifler */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
              <h2 className="text-xl font-bold text-foreground">İlanlarınıza gelen teklifler</h2>
              <Link href="/mesajlar" className="text-sm font-semibold text-brand">
                Tüm teklifler ({incomingOffers.length})
              </Link>
            </div>
            <p className="mt-1.5 mb-3 text-[13px] text-muted-foreground">
              Yanıt bekleyen son teklifler — kabul ettiğinizde mesaj kanalı açılıyor.
            </p>
            <div className="flex flex-1 flex-col overflow-hidden rounded-[10px] border border-border bg-white">
              {incomingOffers.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                  Bekleyen teklifiniz yok.
                </div>
              ) : (
                incomingOffers.slice(0, 3).map((o) => {
                  const listing = data.myListings.find((l) => l.id === o.listingId);
                  const buyer = buyers.get(o.buyerId);
                  return (
                    <div
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4 last:border-b-0"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {listing?.title ?? "İlan"}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {buyer ? (buyer.fullName ?? buyer.email) : "Hekim"} · {currency(o.amount)} teklif ·{" "}
                          {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#141718] text-white hover:bg-[#141718]/85"
                          disabled={busyOfferId === o.id}
                          onClick={() => respondToOffer(o, true)}
                        >
                          Kabul Et
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyOfferId === o.id}
                          onClick={() => respondToOffer(o, false)}
                        >
                          Reddet
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
              {incomingOffers.length > 3 && (
                <Link
                  href="/mesajlar"
                  className="mt-auto flex items-center justify-between gap-2.5 bg-muted/40 px-4 py-3.5 text-sm font-semibold text-brand"
                >
                  <span>{incomingOffers.length - 3} teklif daha bekliyor</span>
                  <span className="inline-flex items-center gap-1.5">
                    Tüm teklifleri gör
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Taleplerim */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
              <h2 className="text-xl font-bold text-foreground">Taleplerim</h2>
              <Link href="/taleplerim" className="text-sm font-semibold text-brand">
                Tüm taleplerim ({myRequests.length})
              </Link>
            </div>
            <p className="mt-1.5 mb-3 text-[13px] text-muted-foreground">
              Açtığınız son talepler — durum ve gelen teklif sayısıyla.
            </p>
            <div className="flex flex-1 flex-col gap-3">
              {myRequests.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-[10px] border border-border bg-white p-8 text-sm text-muted-foreground">
                  Henüz talebiniz yok.
                </div>
              ) : (
                myRequests.slice(0, 3).map((r) => {
                  const offerCount = offerCountByRequestId.get(r.id) ?? 0;
                  return (
                    <Link
                      key={r.id}
                      href={`/talepler/${r.id}`}
                      className="rounded-[10px] border border-border bg-white p-4 transition-colors hover:border-brand/50"
                    >
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold",
                            r.status === "open" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <CircleDot className="size-2.5" aria-hidden />
                          {r.status === "open" ? "Açık" : "Kapandı"}
                        </span>
                        {r.status === "open" && offerCount === 0 && (
                          <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            Teklif bekliyor
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-foreground">{r.title}</div>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{r.budgetMax ? `Bütçe: ${currency(r.budgetMax)}` : "Bütçe belirtilmedi"}</span>
                        <span>{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
                        <span>{offerCount > 0 ? `${offerCount} teklif` : "Teklif yok"}</span>
                      </div>
                    </Link>
                  );
                })
              )}
              <Link
                href="/talep-ver"
                className="mt-auto flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] border border-border bg-muted/40 px-4 py-3.5 text-sm font-semibold text-brand"
              >
                <span>Yeni talep oluştur</span>
                <Plus className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Size uygun ilanlar */}
      {suggestedListings.length > 0 && (
        <section className="container mx-auto px-6 pt-7 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <h2 className="text-xl font-bold text-foreground">Size uygun ilanlar</h2>
            <Link href="/ilanlar" className="text-sm font-semibold text-brand">
              Tüm ilanlar
            </Link>
          </div>
          <p className="mt-1.5 mb-3 text-[13px] text-muted-foreground">
            Bölgenizdeki ve yeni eklenen ilanlar arasından seçtiklerimiz.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {listingFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setListingFilter(f.key)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  listingFilter === f.key
                    ? "bg-[#141718] text-white"
                    : "border border-border bg-white text-foreground hover:border-brand/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {suggestedListings.map((l) => (
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
                    {l.paymentMethod === "bedelsiz" ? "Ücretsiz" : l.price ? currency(l.price) : "Görüşülür"}
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{l.city}</div>
                </div>
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      {/* ---------------------------------------------------------------- Topluluklarım */}
      {myTopics.length > 0 && (
        <section className="container mx-auto px-6 py-7 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <h2 className="text-xl font-bold text-foreground">Topluluklarım</h2>
            <Link href="/topluluk" className="text-sm font-semibold text-brand">
              Tüm topluluklar
            </Link>
          </div>
          <p className="mt-1.5 mb-3 text-[13px] text-muted-foreground">Üye olduğunuz gruplardaki son konular.</p>
          <div className="overflow-hidden rounded-[10px] border border-border bg-white">
            {myTopics.map((t, i) => (
              <Link
                key={t.id}
                href={`/topluluk/${t.categoryId}/${t.id}`}
                className={cn("block p-4", i < myTopics.length - 1 && "border-b border-border/70")}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Users className="size-3.5 shrink-0 text-brand" aria-hidden />
                  {t.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString("tr-TR")}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
