"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, ChevronLeft, ListFilter, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import {
  identityApi,
  marketplaceApi,
  messagingApi,
  type Listing,
  type MarketplaceCategory,
  type MarketplaceRequest,
  type Message,
  type Offer,
  type OfferRevision,
  type OfferStatus,
  type RequestOffer,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";
import { connectToOfferChat } from "@/lib/messageHub";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { cn } from "@/lib/utils";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bagis: "Bağış ile Ödeme",
  bedelsiz: "Bedelsiz Ürün",
  referans: "Referans Linkli %50+ İndirim",
  kart: "Kredi Kartı",
  elden: "Elden Teslim",
};

const STATUS_STYLE: Record<OfferStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "Bekliyor", bg: "bg-amber-50", fg: "text-amber-700" },
  accepted: { label: "Kabul Edildi", bg: "bg-brand-soft", fg: "text-brand" },
  rejected: { label: "Reddedildi", bg: "bg-muted", fg: "text-muted-foreground" },
};

type ThreadKind = "ilan" | "talep";
type ThreadSide = "incoming" | "sent";
type MailboxKey = "all" | "incoming" | "sent" | "archive";

const KIND_STYLE: Record<ThreadKind, { label: string; bg: string; fg: string }> = {
  ilan: { label: "İlan", bg: "bg-muted", fg: "text-foreground" },
  talep: { label: "Talep", bg: "bg-blue-50", fg: "text-blue-800" },
};

const MAILBOXES: { key: MailboxKey; label: string }[] = [
  { key: "all", label: "Tüm sohbetler" },
  { key: "incoming", label: "Gelen teklifler" },
  { key: "sent", label: "Verdiğim teklifler" },
  { key: "archive", label: "Arşiv" },
];

const REPLIES_INCOMING = [
  "Son fiyatım bu",
  "Kargo/teslimat bilgisini paylaşayım",
  "Yerinde görebilirsiniz",
  "Servis/garanti kayıtlarını paylaşayım",
];
const REPLIES_SENT = [
  "Fatura ve garanti belgesi var mı?",
  "Teslimat/kargo dahil mi?",
  "Teklifimi güncellemek istiyorum",
  "Uygunsa hemen alıyorum",
];

interface Thread {
  id: string;
  kind: ThreadKind;
  side: ThreadSide;
  amount: number;
  status: OfferStatus;
  otherUserId: string;
  navPath: string;
  groupKey: string;
  groupTitle: string;
  groupMeta: string;
  createdAt: string;
  source: Offer | RequestOffer;
}

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Bir Offer/RequestOffer'ın geçmişindeki tek bir olayı sohbet zaman çizelgesindeki sistem notuna çevirir. */
function revisionText(rev: OfferRevision, index: number): string {
  if (rev.note) return `Teklif ${rev.note} — ${currency(rev.amount)}`;
  if (index === 0) return `${currency(rev.amount)} teklif verildi`;
  return `Teklif ${currency(rev.amount)} olarak güncellendi`;
}

function MesajlarContent() {
  const hasToken = useHasToken();
  const myId = auth.getUserId();
  const searchParams = useSearchParams();
  /** İlan/talep detayından "Mesajlara git" ile gelindiğinde ilgili sohbeti doğrudan açar. */
  const initialOfferId = searchParams.get("offerId");

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Map<string, UserLookupRow>>(new Map());
  const [listingsById, setListingsById] = useState<Map<string, Listing>>(new Map());
  const [requestsById, setRequestsById] = useState<Map<string, MarketplaceRequest>>(new Map());
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);

  const [mailbox, setMailbox] = useState<MailboxKey>("all");
  const [search, setSearch] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [talepOnly, setTalepOnly] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(initialOfferId);
  const [draft, setDraft] = useState("");
  /** Mobilde (md altı) liste mi sohbet mi gösteriliyor — masaüstünde ikisi zaten yan yana, bu sadece
   * dar ekranda "ya liste ya sohbet" tek-kolonlu geçiş için (bkz. proje kararı). */
  const [mobileShowChat, setMobileShowChat] = useState(initialOfferId !== null);

  const [verifiedMap, setVerifiedMap] = useState<Map<string, boolean>>(new Map());
  const [onlineMap, setOnlineMap] = useState<Map<string, boolean>>(new Map());
  const [revisions, setRevisions] = useState<OfferRevision[]>([]);

  useEffect(() => {
    // İlan/talep detayından ?offerId= ile gelindiğinde o sohbeti okundu işaretle — normal tıklamada
    // bunu openThread yapar, URL'den doğrudan geldiğinde de aynısı olsun diye.
    if (initialOfferId) {
      messagingApi.markMessagesRead(initialOfferId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca mount'ta, URL'deki offerId'ye göre bir kez
  }, []);

  const loadAll = useCallback(async () => {
    if (!hasToken || !myId) return;
    try {
      const [offersRes, requestOffersRes, listingsRes, requestsRes, categoriesRes, messagesRes] = await Promise.all([
        marketplaceApi.listOffers({ pageSize: 500 }),
        marketplaceApi.listRequestOffers({ pageSize: 500 }),
        marketplaceApi.listListings({ pageSize: 500 }),
        marketplaceApi.listRequests({ pageSize: 500 }),
        marketplaceApi.listCategories({ pageSize: 200 }),
        messagingApi.listMessages({ pageSize: 1000 }),
      ]);

      const listingMap = new Map(listingsRes.items.map((l) => [l.id, l]));
      const requestMap = new Map(requestsRes.items.map((r) => [r.id, r]));
      setListingsById(listingMap);
      setRequestsById(requestMap);
      setCategories(categoriesRes.items);

      const ilanThreads: Thread[] = offersRes.items.flatMap((o) => {
        const listing = listingMap.get(o.listingId);
        if (!listing) return [];
        if (listing.sellerId !== myId && o.buyerId !== myId) return [];
        const side: ThreadSide = o.buyerId === myId ? "sent" : "incoming";
        const otherUserId = side === "sent" ? listing.sellerId : o.buyerId;
        return [
          {
            id: o.id,
            kind: "ilan",
            side,
            amount: o.amount,
            status: o.status,
            otherUserId,
            navPath: `/ilanlar/${listing.id}`,
            groupKey: `ilan:${listing.id}`,
            groupTitle: listing.title,
            groupMeta: `${listing.condition} · ${listing.city} · Liste: ${listing.price ? currency(listing.price) : "Belirtilmedi"}`,
            createdAt: o.createdAt,
            source: o,
          },
        ];
      });

      const talepThreads: Thread[] = requestOffersRes.items.flatMap((ro) => {
        const request = requestMap.get(ro.requestId);
        if (!request) return [];
        if (request.requesterId !== myId && ro.responderId !== myId) return [];
        const side: ThreadSide = ro.responderId === myId ? "sent" : "incoming";
        const otherUserId = side === "sent" ? request.requesterId : ro.responderId;
        return [
          {
            id: ro.id,
            kind: "talep",
            side,
            amount: ro.amount,
            status: ro.status,
            otherUserId,
            navPath: `/talepler/${request.id}`,
            groupKey: `talep:${request.id}`,
            groupTitle: request.title,
            groupMeta: `Bütçe üst sınırı: ${request.budgetMax ? currency(request.budgetMax) : "Belirtilmemiş"} · ${request.status === "open" ? "Açık" : "Kapatıldı"}`,
            createdAt: ro.createdAt,
            source: ro,
          },
        ];
      });

      const allThreads = [...ilanThreads, ...talepThreads];
      setThreads(allThreads);
      setMessages(messagesRes.items);

      const otherIds = [...new Set(allThreads.map((t) => t.otherUserId))];
      if (otherIds.length > 0) {
        const rows = await identityApi.lookupUsers(otherIds);
        setUsers(new Map(rows.map((r) => [r.id, r])));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesajlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [hasToken, myId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
    void loadAll();
  }, [loadAll]);

  useLiveRefresh(loadAll);

  const unreadOf = useCallback(
    (threadId: string) => messages.filter((m) => m.offerId === threadId && m.senderId !== myId && !m.readAt).length,
    [messages, myId]
  );

  const boxOf = useCallback((t: Thread): MailboxKey => (t.status === "rejected" ? "archive" : t.side), []);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return threads.filter((t) => {
      const box = boxOf(t);
      if (mailbox === "incoming" && box !== "incoming") return false;
      if (mailbox === "sent" && box !== "sent") return false;
      if (mailbox === "archive" && box !== "archive") return false;
      if (mailbox === "all" && box === "archive") return false;
      if (unreadOnly && unreadOf(t.id) === 0) return false;
      if (pendingOnly && t.status !== "pending") return false;
      if (talepOnly && t.kind !== "talep") return false;
      if (q) {
        const other = users.get(t.otherUserId);
        const haystack = `${t.groupTitle} ${other?.fullName ?? ""} ${other?.email ?? ""}`.toLocaleLowerCase("tr");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [threads, boxOf, mailbox, unreadOnly, pendingOnly, talepOnly, search, users, unreadOf]);

  const lastActivityOf = useCallback(
    (threadId: string, fallback: string) => {
      const threadMessages = messages.filter((m) => m.offerId === threadId);
      if (threadMessages.length === 0) return fallback;
      return threadMessages.reduce((latest, m) => (m.createdAt > latest ? m.createdAt : latest), fallback);
    },
    [messages]
  );

  const sortedVisible = useMemo(
    () => [...visible].sort((a, b) => lastActivityOf(b.id, b.createdAt).localeCompare(lastActivityOf(a.id, a.createdAt))),
    [visible, lastActivityOf]
  );

  const activeId = sortedVisible.some((t) => t.id === selectedId) ? selectedId : (sortedVisible[0]?.id ?? null);
  const active = sortedVisible.find((t) => t.id === activeId) ?? null;

  const activeListing = active?.kind === "ilan" ? listingsById.get(active.navPath.split("/").pop() ?? "") : undefined;
  const activeRequest = active?.kind === "talep" ? requestsById.get(active.navPath.split("/").pop() ?? "") : undefined;
  const activeCategory = categories.find(
    (c) => c.id === (activeListing?.categoryId ?? activeRequest?.categoryId)
  );

  const openThread = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDraft("");
      setMobileShowChat(true);
      messagingApi.markMessagesRead(id).catch(() => {});
      setMessages((prev) =>
        prev.map((m) => (m.offerId === id && m.senderId !== myId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m))
      );
    },
    [myId]
  );

  useEffect(() => {
    if (!active) return;
    identityApi
      .verificationStatus(active.otherUserId)
      .then((r) => setVerifiedMap((prev) => new Map(prev).set(active.otherUserId, r.isVerified)))
      .catch(() => {});

    const checkOnline = () =>
      messagingApi
        .isOnline(active.otherUserId)
        .then((r) => setOnlineMap((prev) => new Map(prev).set(active.otherUserId, r.online)))
        .catch(() => {});
    void checkOnline();
    const interval = setInterval(checkOnline, 20000);
    return () => clearInterval(interval);
  }, [active?.otherUserId]); // eslint-disable-line react-hooks/exhaustive-deps -- sadece aktif sohbetin karşı tarafı değişince

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- aktif sohbet kapanınca eski geçmişin görünmesini önler
      setRevisions([]);
      return;
    }
    const fetcher = active.kind === "ilan" ? marketplaceApi.getOfferRevisions : marketplaceApi.getRequestOfferRevisions;
    fetcher(active.id)
      .then(setRevisions)
      .catch(() => setRevisions([]));
  }, [active?.id, active?.kind]); // eslint-disable-line react-hooks/exhaustive-deps -- sadece aktif sohbet değişince

  useEffect(() => {
    if (!active) return;
    const disconnect = connectToOfferChat(
      active.id,
      (msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.senderId !== myId) {
          messagingApi.markMessagesRead(active.id).catch(() => {});
        }
      },
      (payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.offerId === payload.offerId && m.senderId === myId ? { ...m, readAt: payload.readAt } : m))
        );
      }
    );
    return disconnect;
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- sadece aktif sohbet değişince

  const sendMessage = async () => {
    if (!myId || !active || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    try {
      await messagingApi.sendMessage({
        body,
        offerId: active.id,
        senderId: myId,
        recipientId: active.otherUserId,
        linkPath: active.navPath,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    }
  };

  const decide = async (status: "accepted" | "rejected") => {
    if (!active) return;
    try {
      if (active.kind === "ilan") {
        if (status === "accepted") await marketplaceApi.acceptOffer(active.id);
        else await marketplaceApi.rejectOffer(active.id);
      } else {
        await marketplaceApi.updateRequestOfferStatus(active.id, active.source as RequestOffer, status);
      }
      await loadAll();
      toast.success(status === "accepted" ? "Teklif kabul edildi." : "Teklif reddedildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    }
  };

  // Görünür sohbetleri (recency sırasıyla) aynı ilan/talebe göre kümeler — mockup'taki grup başlıkları.
  const groups = useMemo(() => {
    const list: { key: string; title: string; kind: ThreadKind; threads: Thread[] }[] = [];
    sortedVisible.forEach((t) => {
      const key = grouped ? t.groupKey : "flat";
      let g = list.find((gg) => gg.key === key);
      if (!g) {
        g = { key, title: t.groupTitle, kind: t.kind, threads: [] };
        list.push(g);
      }
      g.threads.push(t);
    });
    return list;
  }, [sortedVisible, grouped]);

  const countIn = threads.filter((t) => boxOf(t) === "incoming").reduce((n, t) => n + unreadOf(t.id), 0);
  const countSent = threads.filter((t) => boxOf(t) === "sent").reduce((n, t) => n + unreadOf(t.id), 0);
  const mailboxCounts: Record<MailboxKey, number> = {
    all: countIn + countSent,
    incoming: countIn,
    sent: countSent,
    archive: 0,
  };

  const timeline = active
    ? [
        ...messages
          .filter((m) => m.offerId === active.id)
          .map((m) => ({ type: "chat" as const, message: m, createdAt: m.createdAt })),
        ...revisions.map((r, i) => ({ type: "system" as const, text: revisionText(r, i), createdAt: r.createdAt })),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  const roleLabelFor = (t: Thread) => {
    if (t.kind === "ilan") return t.side === "incoming" ? "Alıcı" : "Satıcı";
    return t.side === "incoming" ? "Teklif Veren" : "Talep Sahibi";
  };

  const facts: [string, string][] = active
    ? active.kind === "ilan" && activeListing
      ? [
          ["Kategori", activeCategory?.name ?? "Diğer"],
          ["Durum", activeListing.condition],
          ["Ödeme", PAYMENT_METHOD_LABELS[activeListing.paymentMethod] ?? activeListing.paymentMethod],
          ["Şehir", activeListing.city],
          ["Liste Fiyatı", activeListing.price ? currency(activeListing.price) : "Belirtilmedi"],
        ]
      : active.kind === "talep" && activeRequest
        ? [
            ["Talep", activeRequest.title],
            ["Bütçe", activeRequest.budgetMax ? currency(activeRequest.budgetMax) : "Belirtilmemiş"],
            ["Durum", activeRequest.status === "open" ? "Açık" : "Kapatıldı"],
          ]
        : []
    : [];

  const quickReplies = active?.side === "incoming" ? REPLIES_INCOMING : REPLIES_SENT;
  const canDecide = active?.side === "incoming" && active?.status === "pending";
  const otherUser = active ? users.get(active.otherUserId) : undefined;
  const otherLabel = otherUser?.fullName ?? otherUser?.email ?? "Kullanıcı";
  const isVerified = active ? (verifiedMap.get(active.otherUserId) ?? false) : false;
  const isOnline = active ? (onlineMap.get(active.otherUserId) ?? false) : false;

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Mesajlar</h1>
        <p className="text-sm text-muted-foreground">Görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  if (loading) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
      <div className="flex h-[calc(100vh-160px)] min-h-[560px] overflow-hidden rounded-xl border border-border bg-white">
        {/* Sol: kutu (mailbox) menüsü ve filtreler */}
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border md:flex">
          <div className="px-5 pt-5 pb-3">
            <div className="text-lg font-bold text-foreground">Mesajlar</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Tüm teklif sohbetleri tek yerde</div>
          </div>
          <div className="flex flex-col gap-0.5 px-3">
            {MAILBOXES.map((b) => (
              <button
                key={b.key}
                onClick={() => setMailbox(b.key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13.5px]",
                  mailbox === b.key ? "bg-brand-soft font-semibold text-brand" : "text-foreground hover:bg-muted"
                )}
              >
                <span className="min-w-0 flex-1">{b.label}</span>
                {mailboxCounts[b.key] > 0 && (
                  <span
                    className={cn(
                      "min-w-[20px] rounded-full px-1.5 py-px text-center text-[11px] font-semibold",
                      mailbox === b.key ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {mailboxCounts[b.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mx-5 mt-4 border-t border-border pt-4">
            <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Filtrele</div>
            <div className="flex flex-col gap-2 text-[13px] text-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
                Okunmamış
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
                Bekleyen teklif
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={talepOnly} onChange={(e) => setTalepOnly(e.target.checked)} />
                Sadece talepler
              </label>
            </div>
          </div>
          <div className="mt-auto border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground">
            Sohbetler ilan ve talep tekliflerine bağlıdır. Bir teklif reddedildiğinde yazışma arşive taşınır.
          </div>
        </aside>

        {/* Orta: sohbet listesi — mobilde sohbet açıkken tamamen gizlenir (bkz. proje kararı: dar
            ekranda "ya liste ya sohbet" tek-kolonlu görünüm). */}
        <section
          className={cn(
            "w-full shrink-0 flex-col border-r border-border md:flex md:max-w-[340px]",
            mobileShowChat && active ? "hidden" : "flex"
          )}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-2.5 py-2">
              <Search size={15} className="text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sohbet ara"
                className="w-full min-w-0 bg-transparent text-[13px] outline-none"
              />
            </div>
            <button
              onClick={() => setGrouped((v) => !v)}
              title="Gruplamayı değiştir"
              className={cn(
                "flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-border",
                grouped ? "bg-brand-soft" : "bg-white"
              )}
            >
              <ListFilter size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.key}>
                {grouped && (
                  <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-[#f7f8f9] px-4 py-2">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                        KIND_STYLE[g.kind].bg,
                        KIND_STYLE[g.kind].fg
                      )}
                    >
                      {KIND_STYLE[g.kind].label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{g.title}</span>
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">{g.threads.length} teklif</span>
                  </div>
                )}
                {g.threads.map((t) => {
                  const other = users.get(t.otherUserId);
                  const unread = unreadOf(t.id);
                  const threadMessages = messages.filter((m) => m.offerId === t.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
                  const last = threadMessages[threadMessages.length - 1];
                  const st = STATUS_STYLE[t.status];
                  const label = other?.fullName ?? other?.email ?? "Kullanıcı";
                  return (
                    <button
                      key={t.id}
                      onClick={() => openThread(t.id)}
                      className={cn(
                        "flex w-full gap-2.5 border-b border-border/60 border-l-[3px] px-4 py-3 text-left",
                        t.id === activeId ? "border-l-brand bg-[#f7f8f9]" : "border-l-transparent bg-white hover:bg-[#f7f8f9]"
                      )}
                    >
                      <UserAvatar avatarUrl={other?.avatarUrl} name={label} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{label}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatListTime(lastActivityOf(t.id, t.createdAt))}
                          </span>
                        </div>
                        {!grouped && <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{t.groupTitle}</div>}
                        <div className="mt-1 mb-1 flex items-center gap-1.5">
                          <span className="text-[12.5px] font-semibold">{currency(t.amount)}</span>
                          <span className={cn("rounded px-1.5 py-px text-[10.5px] font-semibold", st.bg, st.fg)}>{st.label}</span>
                          <span className="flex-1" />
                          {unread > 0 && (
                            <span className="min-w-[18px] rounded-full bg-brand px-1.5 text-center text-[10.5px] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </div>
                        <div className={cn("truncate text-[12.5px]", unread > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {last?.body ?? "Henüz mesaj yok"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
            {sortedVisible.length === 0 && (
              <div className="px-5 py-9 text-left">
                <div className="mb-1.5 text-sm font-semibold text-foreground">Bu kutuda sohbet yok</div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  Filtreleri temizleyip &quot;Tüm sohbetler&quot; kutusuna dönebilirsiniz.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Orta-sağ: aktif sohbet — mobilde liste kapalıyken tamamen gizlenir. */}
        <section
          className={cn("min-w-0 flex-1 flex-col bg-[#f5f6f7] md:flex", mobileShowChat && active ? "flex" : "hidden")}
        >
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-border bg-white px-5 py-3">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="shrink-0 rounded-lg p-1.5 hover:bg-muted md:hidden"
                  aria-label="Sohbet listesine dön"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="relative shrink-0">
                  <UserAvatar avatarUrl={otherUser?.avatarUrl} name={otherLabel} size={38} />
                  {isOnline && (
                    <span className="absolute -right-0.5 -bottom-0.5 size-[11px] rounded-full border-2 border-white bg-brand" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">{otherLabel}</span>
                    {isVerified && (
                      <span className="rounded bg-brand-soft px-1.5 py-px text-[10.5px] font-semibold text-brand">
                        Doğrulanmış hekim
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {isOnline ? "Çevrimiçi" : "Çevrimdışı"} · {roleLabelFor(active)}
                  </div>
                </div>
                <button
                  onClick={() => setContextOpen((v) => !v)}
                  className="shrink-0 rounded-lg border border-border px-3 py-2 text-[13px] font-medium hover:bg-muted"
                >
                  {contextOpen ? "Detayı kapat" : "Detayı aç"}
                </button>
              </div>

              <div className="flex items-center gap-3 border-b border-border bg-white px-5 py-2.5">
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase", KIND_STYLE[active.kind].bg, KIND_STYLE[active.kind].fg)}>
                  {KIND_STYLE[active.kind].label}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={active.navPath} className="block truncate text-[13.5px] font-semibold hover:text-brand">
                    {active.groupTitle}
                  </Link>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{active.groupMeta}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-muted-foreground">Teklif</div>
                  <div className="text-[15px] font-bold">{currency(active.amount)}</div>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-1 text-[11.5px] font-semibold", STATUS_STYLE[active.status].bg, STATUS_STYLE[active.status].fg)}>
                  {STATUS_STYLE[active.status].label}
                </span>
                {canDecide && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => decide("rejected")}
                      className="rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
                    >
                      Reddet
                    </button>
                    <button
                      onClick={() => decide("accepted")}
                      className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                    >
                      Teklifi kabul et
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {timeline.length === 0 && <p className="text-center text-xs text-muted-foreground">Henüz mesaj yok.</p>}
                {timeline.map((item, i) =>
                  item.type === "system" ? (
                    <div key={`sys-${i}`} className="my-1 flex items-center gap-2.5">
                      <span className="h-px flex-1 bg-border" />
                      <span className="shrink-0 rounded-full border border-border bg-white px-2.5 py-1 text-[11.5px] text-muted-foreground">
                        {item.text}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : (
                    <div
                      key={item.message.id}
                      className={cn("flex flex-col", item.message.senderId === myId ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[62%] min-w-0 rounded-xl border px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line",
                          item.message.senderId === myId ? "border-[#cdeedd] bg-brand-soft" : "border-border bg-white"
                        )}
                      >
                        {item.message.body}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground">
                        <span>{formatStamp(item.message.createdAt)}</span>
                        {item.message.senderId === myId &&
                          (item.message.readAt ? <CheckCheck size={14} className="text-brand" /> : <Check size={14} />)}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="border-t border-border bg-white px-5 pt-3 pb-3.5">
                <div className="mb-2.5 flex flex-wrap gap-2">
                  {quickReplies.map((label) => (
                    <button
                      key={label}
                      onClick={() => setDraft(label)}
                      className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs hover:bg-brand-soft"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2.5">
                  <div className="min-w-0 flex-1 rounded-xl border border-input bg-[#f7f8f9] px-2.5 py-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder="Mesaj yazın… (Enter ile gönder)"
                      rows={1}
                      className="h-11 max-h-[120px] w-full resize-none bg-transparent text-[13.5px] leading-relaxed outline-none"
                    />
                  </div>
                  <Button onClick={sendMessage} className="h-auto shrink-0 gap-1.5 rounded-xl px-4 py-3">
                    Gönder
                    <Send size={16} />
                  </Button>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Güvenliğiniz için ödeme ve teslimatı platform dışına taşımayın; yazışmalar denetime tabidir.
                </div>
              </div>
            </>
          ) : (
            <div className="flex max-w-[520px] flex-1 flex-col justify-center gap-3.5 p-12">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft">
                <Search size={22} className="text-brand" />
              </div>
              <div className="text-xl font-bold text-foreground">Henüz mesajınız yok</div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Bir ilana teklif verdiğinizde ya da ilanınıza teklif geldiğinde sohbet burada açılır. Artık her ilanın
                detayına tek tek girmenize gerek yok.
              </p>
              <div className="flex gap-2.5">
                <Link href="/ilanlar">
                  <Button>İlanlara göz at</Button>
                </Link>
                <Link href="/taleplerim">
                  <Button variant="outline">Taleplerim</Button>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Sağ: bağlam paneli */}
        {contextOpen && active && (
          <aside className="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border lg:flex">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <UserAvatar avatarUrl={otherUser?.avatarUrl} name={otherLabel} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{otherLabel}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-3.5 text-[12.5px]">
                <Link href={active.navPath} className="text-brand hover:opacity-80">
                  {active.kind === "ilan" ? "İlanı aç" : "Talebi aç"}
                </Link>
              </div>
            </div>

            <div className="border-b border-border p-4">
              <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Teklif geçmişi</div>
              <div className="flex flex-col gap-2">
                {revisions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Geçmiş bulunamadı.</p>
                ) : (
                  [...revisions].reverse().map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className={cn("size-[7px] shrink-0 rounded-full", i === 0 ? "bg-brand" : "bg-muted-foreground/40")} />
                      <span className={cn("flex-1", i === 0 ? "font-semibold" : "font-normal")}>{currency(r.amount)}</span>
                      <span className="shrink-0 text-[11.5px] text-muted-foreground">{r.note ?? formatListTime(r.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-b border-border p-4">
              <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {active.kind === "ilan" ? "İlan bilgisi" : "Talep bilgisi"}
              </div>
              {facts.map(([k, v]) => (
                <div key={k} className="flex gap-2.5 border-b border-border/60 py-1.5 text-[12.5px] last:border-b-0">
                  <span className="w-[100px] shrink-0 text-muted-foreground">{k}</span>
                  <span className="min-w-0 flex-1 font-medium break-words">{v}</span>
                </div>
              ))}
            </div>

            {active.status === "accepted" && (
              <div className="m-4 rounded-xl border border-[#cdeedd] bg-brand-soft p-3.5">
                <div className="mb-1 text-[13px] font-bold">Teklif kabul edildi</div>
                <div className="mb-3 text-[12.5px] leading-relaxed text-[#3c5a4c]">
                  {active.side === "sent"
                    ? "Sipariş/ödeme adımlarını tamamlamak için ilan sayfasını açın."
                    : "Alıcının sipariş/ödeme bilgilerini ilan sayfasından görüntüleyip onaylayabilirsiniz."}
                </div>
                <Link href={active.navPath}>
                  <button className="w-full rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90">
                    {active.kind === "ilan" ? "İlanı Aç" : "Talebi Aç"}
                  </button>
                </Link>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default function MesajlarPage() {
  return (
    <Suspense fallback={null}>
      <MesajlarContent />
    </Suspense>
  );
}
