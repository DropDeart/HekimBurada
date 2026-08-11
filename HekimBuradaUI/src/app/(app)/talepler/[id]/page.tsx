"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  identityApi,
  marketplaceApi,
  messagingApi,
  type MarketplaceCategory,
  type MarketplaceRequest,
  type Message,
  type RequestOffer,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";
import { connectToOfferChat } from "@/lib/messageHub";
import { cn } from "@/lib/utils";

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const hasToken = useHasToken();
  const myId = auth.getUserId();

  const [request, setRequest] = useState<MarketplaceRequest | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [offers, setOffers] = useState<RequestOffer[]>([]);
  const [responders, setResponders] = useState<Map<string, UserLookupRow>>(new Map());
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [offerAmountDraft, setOfferAmountDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!hasToken) return;
    try {
      const [requestRes, catsRes, offersRes] = await Promise.all([
        marketplaceApi.getRequest(requestId),
        marketplaceApi.listCategories({ pageSize: 100 }),
        marketplaceApi.listRequestOffers({ requestId, pageSize: 200 }),
      ]);
      setRequest(requestRes);
      setCategories(catsRes.items);

      const relevant = offersRes.items.filter(
        (o) => requestRes.requesterId === myId || o.responderId === myId
      );
      setOffers(relevant);
      if (relevant.length > 0 && !selectedOfferId) {
        setSelectedOfferId(relevant[0].id);
      }

      const responderIds = [...new Set(relevant.map((o) => o.responderId))];
      if (responderIds.length > 0) {
        const rows = await identityApi.lookupUsers(responderIds);
        setResponders(new Map(rows.map((r) => [r.id, r])));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep yüklenemedi.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedOfferId burada güncelleniyor, bağımlılık döngüsü yaratmaması için hariç tutuldu
  }, [hasToken, requestId, myId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
    void loadAll();
  }, [loadAll]);

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

  const category = categories.find((c) => c.id === request?.categoryId);
  const isRequester = request?.requesterId === myId;
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null;
  const myOwnOffer = !isRequester ? offers.find((o) => o.responderId === myId) : null;

  const sendOffer = async () => {
    if (!myId || !offerAmountDraft) return;
    try {
      const id = await marketplaceApi.createRequestOffer({
        amount: Number(offerAmountDraft),
        requestId,
      });
      const newOffer: RequestOffer = { id, amount: Number(offerAmountDraft), status: "pending", requestId, responderId: myId };
      setOffers((prev) => [...prev, newOffer]);
      setSelectedOfferId(id);
      setOfferAmountDraft("");
      toast.success("Teklifiniz gönderildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teklif gönderilemedi.");
    }
  };

  const decideOffer = async (offer: RequestOffer, status: "accepted" | "rejected") => {
    try {
      await marketplaceApi.updateRequestOfferStatus(offer.id, offer, status);
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

  const closeRequest = async () => {
    if (!request) return;
    setClosing(true);
    try {
      await marketplaceApi.updateRequest(request.id, request, "closed");
      setRequest((prev) => (prev ? { ...prev, status: "closed" } : prev));
      toast.success("Talep kapatıldı.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep kapatılamadı.");
    } finally {
      setClosing(false);
      setCloseConfirmOpen(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Talep Detayı</h1>
        <p className="text-sm text-muted-foreground">Görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  if (loading) return null;

  if (!request) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-muted-foreground">Talep bulunamadı.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 pt-5 text-[13px] text-muted-foreground sm:px-10">
        <Link href="/talepler" className="text-brand">
          Talepler
        </Link>{" "}
        / <span className="font-semibold text-foreground">{request.title}</span>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-6 sm:px-10 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 inline-block rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
            {category?.name ?? "Diğer"}
          </div>
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{request.title}</h1>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                request.status === "open" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
              )}
            >
              {request.status === "open" ? "Açık" : "Kapatıldı"}
            </span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{request.description}</p>
          <div className="mb-5 text-sm font-semibold text-foreground">
            {request.budgetMax ? `Bütçe: ${currency(request.budgetMax)}` : "Bütçe belirtilmedi"}
          </div>

          {isRequester && request.status === "open" && (
            <Button variant="outline" onClick={() => setCloseConfirmOpen(true)} className="mb-2">
              Talebi Kapat
            </Button>
          )}
        </div>

        <div>
          {isRequester ? (
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
                        selectedOfferId === o.id ? "border-brand bg-[#F3FBF7]" : "border-border bg-white"
                      )}
                    >
                      <div>
                        <div className="text-[13px] font-bold text-foreground">{currency(o.amount)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {responders.get(o.responderId)?.fullName ?? responders.get(o.responderId)?.email ?? "Kullanıcı"}
                        </div>
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
              {request.status === "closed" ? (
                <p className="mb-4 text-xs text-muted-foreground">Bu talep kapatıldığı için yeni teklif verilemez.</p>
              ) : !myOwnOffer ? (
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
                        selectedOfferId === o.id ? "border-brand bg-[#F3FBF7]" : "border-border bg-white"
                      )}
                    >
                      <div className="text-[13px] font-bold text-foreground">{currency(o.amount)}</div>
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
                        {o.status === "pending" ? "Bekliyor" : o.status === "accepted" ? "Kabul Edildi" : "Reddedildi"}
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
              <div className="mb-3 flex max-h-[240px] flex-col gap-2.5 overflow-y-auto rounded-lg border border-border p-3.5">
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
            </>
          )}
        </div>
      </div>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Talep kapatılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              Kapatılan bir talebe yeni teklif verilemez. Mevcut teklifler ve sohbetler görünmeye devam eder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={closeRequest} disabled={closing}>
              {closing ? "Kapatılıyor…" : "Talebi Kapat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
