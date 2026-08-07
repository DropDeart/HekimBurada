"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  marketplaceApi,
  messagingApi,
  type Favorite,
  type Listing,
  type MarketplaceCategory,
  type Message,
  type Offer,
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
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

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
  const images: string[] = (() => {
    try {
      const parsed = JSON.parse(listing?.images ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

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
          <div className="flex h-[360px] items-center justify-center rounded-[10px] bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_14px,#E4E8EA_14px,#E4E8EA_28px)] font-mono text-xs text-[#9AA1A5]">
            {images.length > 0 ? `${images.length} görsel` : "ÜRÜN GÖRSELİ"}
          </div>
          {images.length > 1 && (
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {images.slice(0, 4).map((url) => (
                <div
                  key={url}
                  className="h-[70px] rounded-lg bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_10px,#E4E8EA_10px,#E4E8EA_20px)]"
                />
              ))}
            </div>
          )}
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
                    Bu bölüm bir arayüz taslağıdır — gerçek bir ödeme/sipariş kaydı oluşturmaz
                    (backend&apos;de henüz karşılığı yok).
                  </p>
                  {paymentSubmitted ? (
                    <p className="text-sm font-semibold text-brand">Talebiniz iletildi.</p>
                  ) : (
                    <Button onClick={() => setPaymentSubmitted(true)}>Talebi Gönder</Button>
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
