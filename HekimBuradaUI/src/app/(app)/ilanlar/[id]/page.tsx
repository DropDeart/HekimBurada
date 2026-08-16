"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  identityApi,
  MARKETPLACE_URL,
  marketplaceApi,
  messagingApi,
  parseListingImages,
  type Favorite,
  type Listing,
  type ListingReview,
  type MarketplaceCategory,
  type Message,
  type Offer,
  type OrderPaymentMethod,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";
import { connectToOfferChat } from "@/lib/messageHub";
import { cn } from "@/lib/utils";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bagis: "Bağış ile Ödeme",
  bedelsiz: "Bedelsiz Ürün",
  referans: "Referans Linkli %50+ İndirim",
  kart: "Kredi Kartı",
  elden: "Elden Teslim",
};

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const hasToken = useHasToken();
  const myId = auth.getUserId();

  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [favorite, setFavorite] = useState<Favorite | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [offerAmountDraft, setOfferAmountDraft] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [donationOrganization, setDonationOrganization] = useState("");
  const [donationReceiptUrl, setDonationReceiptUrl] = useState("");
  const [donationUploading, setDonationUploading] = useState(false);
  const [buyerReferansUrl, setBuyerReferansUrl] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [myRegion, setMyRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reviews, setReviews] = useState<ListingReview[]>([]);
  const [reviewAuthors, setReviewAuthors] = useState<Map<string, UserLookupRow>>(new Map());
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewBody, setNewReviewBody] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const res = await marketplaceApi.listListingReviews({ listingId, pageSize: 100 });
      setReviews([...res.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      const authorIds = [...new Set(res.items.map((r) => r.authorId))];
      if (authorIds.length > 0) {
        const rows = await identityApi.lookupUsers(authorIds);
        setReviewAuthors(new Map(rows.map((r) => [r.id, r])));
      }
    } catch {
      // Yorumlar opsiyonel bir bölüm — sessizce boş bırakılıyor.
    }
  }, [listingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/ilan değişince veri çekme (React'in "Fetching data" deseni)
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    // "Elden Teslim" aynı-şehir kontrolü için kendi bölgemizi çekiyoruz — belge onayı olmayan
    // kullanıcılarda profil hiç yoksa sessizce boş kalır (kural o durumda uygulanamaz).
    identityApi
      .doctorProfile()
      .then((p) => setMyRegion(p.region))
      .catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    if (!hasToken) return;
    try {
      const [listingRes, catsRes, favRes, offersRes] = await Promise.all([
        marketplaceApi.getListing(listingId),
        marketplaceApi.listCategories({ pageSize: 100 }),
        marketplaceApi.listFavorites({ pageSize: 200 }),
        marketplaceApi.listOffers({ pageSize: 200 }),
      ]);
      setListing(listingRes);
      setCategories(catsRes.items);
      setFavorite(favRes.items.find((f) => f.listingId === listingId && f.userId === myId) ?? null);

      const relevant = offersRes.items.filter((o) => {
        if (o.listingId !== listingId) return false;
        return listingRes.sellerId === myId || o.buyerId === myId;
      });
      setOffers(relevant);
      if (relevant.length > 0 && !selectedOfferId) {
        setSelectedOfferId(relevant[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İlan yüklenemedi.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedOfferId burada güncelleniyor, bağımlılık döngüsü yaratmaması için hariç tutuldu
  }, [hasToken, listingId, myId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    marketplaceApi.incrementListingViewCount(listingId).catch(() => {});
  }, [listingId]);

  useEffect(() => {
    if (!selectedOfferId) return;
    messagingApi
      .listMessages({ pageSize: 200 })
      .then((r) => setMessages(r.items.filter((m) => m.offerId === selectedOfferId)))
      .catch(() => {});

    const disconnect = connectToOfferChat(selectedOfferId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return disconnect;
  }, [selectedOfferId]);

  const category = categories.find((c) => c.id === listing?.categoryId);
  const isOwner = listing?.sellerId === myId;
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null;
  const images = parseListingImages(listing?.images);

  const submitReview = async () => {
    if (!newReviewBody.trim()) return;
    setReviewSubmitting(true);
    try {
      await marketplaceApi.createListingReview({
        listingId,
        rating: newReviewRating,
        body: newReviewBody.trim(),
      });
      setNewReviewBody("");
      setNewReviewRating(5);
      toast.success("Yorumunuz eklendi.");
      await loadReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  /** "region" backend'de "İlçe, İl" biçiminde geliyor — son parça il. */
  const myProvince = myRegion?.split(",").pop()?.trim() ?? null;
  const sellerCity = listing?.city.split(",")[0]?.trim() ?? "";
  const sameCity = myProvince !== null && sellerCity.length > 0 && sellerCity.toLocaleLowerCase("tr") === myProvince.toLocaleLowerCase("tr");

  const submitOrder = async (input: {
    donationOrganization?: string | null;
    donationReceiptUrl?: string | null;
    buyerReferansUrl?: string | null;
    deliveryNote?: string | null;
  }) => {
    if (!listing || !selectedOffer) return;
    setOrderSubmitting(true);
    try {
      await marketplaceApi.createOrder({
        listingId: listing.id,
        paymentMethod: listing.paymentMethod as OrderPaymentMethod,
        amount: selectedOffer.amount,
        ...input,
      });
      setOrderCreated(true);
      toast.success("Talebiniz iletildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep gönderilemedi.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const toggleFavorite = async () => {
    if (!myId) return;
    try {
      if (favorite) {
        await marketplaceApi.removeFavorite(favorite.id);
        setFavorite(null);
      } else {
        const id = await marketplaceApi.addFavorite(listingId, myId);
        setFavorite({ id, listingId, userId: myId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Favori güncellenemedi.");
    }
  };

  const sendOffer = async () => {
    if (!myId || !offerAmountDraft) return;
    try {
      const id = await marketplaceApi.createOffer({
        amount: Number(offerAmountDraft),
        listingId,
        buyerId: myId,
      });
      const newOffer: Offer = { id, amount: Number(offerAmountDraft), status: "pending", listingId, buyerId: myId };
      setOffers((prev) => [...prev, newOffer]);
      setSelectedOfferId(id);
      setOfferAmountDraft("");
      toast.success("Teklifiniz gönderildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teklif gönderilemedi.");
    }
  };

  const decideOffer = async (offer: Offer, status: "accepted" | "rejected") => {
    try {
      await marketplaceApi.updateOfferStatus(offer.id, offer, status);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, status } : o)));
      toast.success(status === "accepted" ? "Teklif kabul edildi." : "Teklif reddedildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    }
  };

  const sendMessage = async () => {
    if (!myId || !selectedOfferId || !messageDraft.trim()) return;
    const body = messageDraft.trim();
    setMessageDraft("");
    try {
      await messagingApi.sendMessage({ body, offerId: selectedOfferId, senderId: myId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    }
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">İlan Detayı</h1>
        <p className="text-sm text-muted-foreground">Görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  if (loading) return null;

  if (!listing) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-muted-foreground">İlan bulunamadı.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 pt-5 text-[13px] text-muted-foreground sm:px-10">
        <Link href="/" className="text-brand">
          Ana Sayfa
        </Link>{" "}
        /{" "}
        <Link href={`/ilanlar?kategori=${listing.categoryId}`} className="text-brand">
          {category?.name ?? "Kategori"}
        </Link>{" "}
        / <span className="font-semibold text-foreground">{listing.title}</span>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-6 sm:px-10 lg:grid-cols-2">
        <div>
          {images.length > 0 ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full cursor-zoom-in"
              aria-label="Görseli büyüt"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel */}
              <img
                src={`${MARKETPLACE_URL}${images[activeImageIndex] ?? images[0]}`}
                alt={listing.title}
                className="h-[360px] w-full rounded-[10px] object-cover"
              />
            </button>
          ) : (
            <div className="flex h-[360px] items-center justify-center rounded-[10px] bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_14px,#E4E8EA_14px,#E4E8EA_28px)] font-mono text-xs text-[#9AA1A5]">
              ÜRÜN GÖRSELİ
            </div>
          )}
          {images.length > 1 && (
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {images.slice(0, 4).map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={cn(
                    "h-[70px] overflow-hidden rounded-lg border-2",
                    i === activeImageIndex ? "border-brand" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel */}
                  <img src={`${MARKETPLACE_URL}${url}`} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={activeImageIndex}
            on={{ view: ({ index }) => setActiveImageIndex(index) }}
            slides={images.map((url) => ({ src: `${MARKETPLACE_URL}${url}` }))}
            plugins={[Zoom]}
            zoom={{ maxZoomPixelRatio: 4, doubleTapDelay: 300, doubleClickDelay: 300 }}
          />

          <div className="mt-8">
            <h2 className="mb-3 text-base font-bold text-foreground">Yorumlar</h2>
            {reviews.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">Henüz yorum yapılmamış.</p>
            ) : (
              <div className="mb-4 flex flex-col gap-3">
                {reviews.map((r) => {
                  const author = reviewAuthors.get(r.authorId);
                  return (
                    <div key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {author ? (author.fullName ?? author.email) : "Kullanıcı"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <div className="mt-0.5 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={cn("size-3.5", i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{r.body}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {hasToken && (
              <div className="rounded-lg border border-border bg-[#FAFBFB] p-3.5">
                <div className="mb-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" onClick={() => setNewReviewRating(i)} aria-label={`${i} yıldız`}>
                      <Star className={cn("size-5", i <= newReviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={newReviewBody}
                  onChange={(e) => setNewReviewBody(e.target.value)}
                  placeholder="Yorumunuzu yazın..."
                  className="mb-2 bg-white"
                />
                <Button size="sm" disabled={reviewSubmitting || !newReviewBody.trim()} onClick={submitReview}>
                  {reviewSubmitting ? "Gönderiliyor…" : "Yorum Yap"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-2xl font-bold text-foreground">{listing.title}</div>
          <div className="mb-4 text-[13px] text-muted-foreground">{listing.city}</div>
          <p className="mb-5 text-sm leading-relaxed text-[#4A5053]">{listing.description}</p>

          <div className="mb-6 flex items-baseline gap-3">
            <div className="text-[28px] font-bold text-brand">
              {listing.price ? currency(listing.price) : "Fiyat belirtilmedi"}
            </div>
            {!isOwner && (
              <button
                onClick={toggleFavorite}
                className="ml-auto"
                aria-label="Favorilere ekle"
              >
                <Heart
                  size={22}
                  className={favorite ? "fill-red-600 text-red-600" : "text-muted-foreground"}
                />
              </button>
            )}
          </div>
          <hr className="mb-5 border-border" />

          {isOwner ? (
            <div>
              <h3 className="mb-1 text-[15px] font-bold text-foreground">Gelen Teklifler</h3>
              {offers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Henüz teklif yok.</p>
              ) : (
                <div className="mb-4 flex flex-col gap-2">
                  {offers.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOfferId(o.id)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg border-[1.5px] px-3 py-2.5",
                        selectedOfferId === o.id
                          ? "border-brand bg-[#F3FBF7]"
                          : "border-border bg-white"
                      )}
                    >
                      <div className="text-[13px] font-bold text-foreground">
                        {currency(o.amount)}
                      </div>
                      {o.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              decideOffer(o, "accepted");
                            }}
                            className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white"
                          >
                            Kabul Et
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              decideOffer(o, "rejected");
                            }}
                            className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600"
                          >
                            Reddet
                          </button>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "text-xs font-bold",
                            o.status === "accepted" ? "text-brand" : "text-red-600"
                          )}
                        >
                          {o.status === "accepted" ? "Kabul Edildi" : "Reddedildi"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="mb-2 text-[15px] font-bold text-foreground">Teklifiniz</h3>
              {offers.length === 0 ? (
                <div className="mb-4 flex gap-2">
                  <input
                    value={offerAmountDraft}
                    onChange={(e) => setOfferAmountDraft(e.target.value)}
                    type="number"
                    placeholder="Fiyat teklifiniz (₺)"
                    className="flex-1 rounded-md border border-input px-3 py-2 text-[13px]"
                  />
                  <Button onClick={sendOffer}>Teklif Ver</Button>
                </div>
              ) : (
                <div className="mb-4 flex flex-col gap-2">
                  {offers.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOfferId(o.id)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg border-[1.5px] px-3 py-2.5",
                        selectedOfferId === o.id
                          ? "border-brand bg-[#F3FBF7]"
                          : "border-border bg-white"
                      )}
                    >
                      <div className="text-[13px] font-bold text-foreground">
                        {currency(o.amount)}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          o.status === "accepted"
                            ? "text-brand"
                            : o.status === "rejected"
                              ? "text-red-600"
                              : "text-amber-600"
                        )}
                      >
                        {o.status === "pending"
                          ? "Bekliyor"
                          : o.status === "accepted"
                            ? "Kabul Edildi"
                            : "Reddedildi"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedOffer && (
            <>
              <h3 className="mb-2 text-[13px] font-bold text-muted-foreground">
                {currency(selectedOffer.amount)} teklifi hakkında sohbet
              </h3>
              <div className="mb-3 flex max-h-[180px] flex-col gap-2.5 overflow-y-auto rounded-lg border border-border p-3.5">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Henüz mesaj yok.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-[13px]",
                        m.senderId === myId
                          ? "self-end bg-brand-soft text-foreground"
                          : "self-start bg-muted text-foreground"
                      )}
                    >
                      {m.body}
                    </div>
                  ))
                )}
              </div>
              <div className="mb-5 flex gap-2">
                <input
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Mesaj yazın..."
                  className="flex-1 rounded-md border border-input px-3 py-2 text-[13px]"
                />
                <Button variant="outline" onClick={sendMessage}>
                  Gönder
                </Button>
              </div>

              {selectedOffer.status === "accepted" && !isOwner && (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="mb-1 text-[15px] font-bold text-foreground">
                    Ödeme Yöntemi: {PAYMENT_METHOD_LABELS[listing.paymentMethod] ?? listing.paymentMethod}
                  </h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Ödenecek tutar: {currency(selectedOffer.amount)}
                  </p>

                  {orderCreated ? (
                    <p className="text-sm font-semibold text-brand">
                      Talebiniz iletildi — Profilim &gt; Sipariş ve Kargo Bilgilerim&apos;den takip
                      edebilirsiniz.
                    </p>
                  ) : listing.paymentMethod === "bagis" ? (
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Bağış Yapılan Kuruluş</label>
                        <input
                          value={donationOrganization}
                          onChange={(e) => setDonationOrganization(e.target.value)}
                          placeholder="Örn. Türk Kızılay"
                          className="w-full rounded-md border border-input px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Bağış Dekontu (görsel)</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={donationUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setDonationUploading(true);
                            try {
                              const url = await marketplaceApi.uploadImage(file);
                              setDonationReceiptUrl(url);
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Dekont yüklenemedi.");
                            } finally {
                              setDonationUploading(false);
                            }
                          }}
                          className="text-xs"
                        />
                        {donationReceiptUrl && <p className="mt-1 text-xs text-brand">Dekont yüklendi.</p>}
                      </div>
                      <Button
                        size="sm"
                        disabled={orderSubmitting || !donationOrganization.trim()}
                        onClick={() =>
                          submitOrder({
                            donationOrganization: donationOrganization.trim(),
                            donationReceiptUrl: donationReceiptUrl || null,
                          })
                        }
                      >
                        {orderSubmitting ? "Gönderiliyor…" : "Talebi Gönder"}
                      </Button>
                    </div>
                  ) : listing.paymentMethod === "bedelsiz" ? (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-sm text-foreground">
                        Bu ürün bedelsiz olarak paylaşılmaktadır. Talebinizi ilettiğinizde satıcı sizinle
                        iletişime geçecektir.
                      </p>
                      <Button size="sm" disabled={orderSubmitting} onClick={() => submitOrder({})}>
                        {orderSubmitting ? "Gönderiliyor…" : "Ücretsiz Talep Et"}
                      </Button>
                    </div>
                  ) : listing.paymentMethod === "referans" ? (
                    <div className="flex flex-col gap-2.5">
                      {listing.originalPrice && (
                        <div className="text-xs text-muted-foreground">
                          Orijinal Bedel: <span className="line-through">{currency(listing.originalPrice)}</span>{" "}
                          → İlan Bedeli: <span className="font-semibold text-foreground">{currency(selectedOffer.amount)}</span>
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Referans / Satın Alma Linki</label>
                        <input
                          value={buyerReferansUrl}
                          onChange={(e) => setBuyerReferansUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-md border border-input px-3 py-2 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={orderSubmitting || !buyerReferansUrl.trim()}
                        onClick={() => submitOrder({ buyerReferansUrl: buyerReferansUrl.trim() })}
                      >
                        {orderSubmitting ? "Gönderiliyor…" : "Talebi Gönder"}
                      </Button>
                    </div>
                  ) : listing.paymentMethod === "elden" ? (
                    !sameCity ? (
                      <p className="text-sm text-muted-foreground">
                        Farklı şehirlerde olduğunuz için bu seçenek kullanılamaz
                        {myProvince ? ` (Siz: ${myProvince}, Satıcı: ${sellerCity})` : ""}.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <p className="text-xs text-muted-foreground">
                          Ödemeyi teslim sırasında satıcıya elden yaparsınız. Platform bu ödemeye aracılık
                          etmez.
                        </p>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Teslim Yeri / Notu</label>
                          <input
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            placeholder="Örn. Kliniğim, hafta içi 14:00-18:00"
                            className="w-full rounded-md border border-input px-3 py-2 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={orderSubmitting || !deliveryNote.trim()}
                          onClick={() => submitOrder({ deliveryNote: deliveryNote.trim() })}
                        >
                          {orderSubmitting ? "Gönderiliyor…" : "Talebi Gönder"}
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-xs text-muted-foreground">
                        Bu işlem üzerinden ürün bedeline ek olarak platform hizmet bedeli tahsil edilir.
                        Kart bilgisi bu ekranda toplanmaz — ödeme onayı simülasyonudur.
                      </p>
                      <Button size="sm" disabled={orderSubmitting} onClick={() => submitOrder({})}>
                        {orderSubmitting ? "İşleniyor…" : "Ödemeyi Tamamla"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
