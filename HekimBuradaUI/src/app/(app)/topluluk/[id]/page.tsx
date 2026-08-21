"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  communityApi,
  identityApi,
  type CommunityCategory,
  type CommunityComment,
  type Like,
  type Membership,
  type Topic,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";

const SORTS = ["Son hareket", "Yeni", "En çok beğenilen"] as const;

export default function TopluluDetay() {
  const params = useParams<{ id: string }>();
  const categoryId = params.id;
  const router = useRouter();
  const hasToken = useHasToken();
  const myId = auth.getUserId();

  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<Map<string, UserLookupRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Son hareket");

  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, topicsRes, commentsRes, likesRes, membershipsRes] = await Promise.all([
        communityApi.getCategory(categoryId),
        communityApi.listTopics({ pageSize: 100 }),
        communityApi.listComments({ pageSize: 100 }),
        communityApi.listLikes({ pageSize: 100 }),
        communityApi.listMemberships({ pageSize: 100 }),
      ]);
      setCategory(cat);
      setTopics(topicsRes.items.filter((t) => t.categoryId === categoryId));
      setComments(commentsRes.items);
      setLikes(likesRes.items);
      setMemberships(membershipsRes.items.filter((m) => m.categoryId === categoryId));

      const memberIds = [...new Set(membershipsRes.items.filter((m) => m.categoryId === categoryId).map((m) => m.userId))];
      if (memberIds.length > 0) {
        const rows = await identityApi.lookupUsers(memberIds);
        setUsers(new Map(rows.map((r) => [r.id, r])));
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        setNotFound(true);
      } else {
        toast.error(err instanceof Error ? err.message : "Topluluk alınamadı.");
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme
    void load();
  }, [hasToken, load]);

  const myMembership = memberships.find((m) => m.userId === myId);
  const joined = !!myMembership;

  const toggleJoin = async () => {
    setBusy(true);
    try {
      if (myMembership) {
        await communityApi.removeMembership(myMembership.id);
        toast.success("Topluluktan ayrıldınız.");
      } else {
        await communityApi.joinCommunity(categoryId);
        toast.success("Topluluğa katıldınız.");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const likeCountOf = (topicId: string) => likes.filter((l) => l.topicId === topicId).length;
  const commentCountOf = (topicId: string) => comments.filter((c) => c.topicId === topicId).length;

  const sortedTopics = useMemo(() => {
    const list = [...topics];
    if (sort === "Yeni") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "En çok beğenilen") {
      list.sort((a, b) => likeCountOf(b.id) - likeCountOf(a.id));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...list.filter((t) => t.isPinned), ...list.filter((t) => !t.isPinned)];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- likeCountOf, comments/likes state'e bağlı, closure her render'da tazeleniyor
  }, [topics, sort, likes]);

  const moderators = memberships.filter((m) => m.isAdmin);

  const userLabel = (userId: string) => {
    const u = users.get(userId);
    return u ? (u.fullName ?? u.email) : "Hekim";
  };

  const initialsOf = (userId: string) => userLabel(userId).slice(0, 2).toUpperCase();

  const createTopic = async () => {
    if (!newTitle.trim() || !myId) {
      toast.error("Başlık gerekli.");
      return;
    }
    setPublishing(true);
    try {
      const id = await communityApi.createTopic({
        title: newTitle,
        body: newBody,
        categoryId,
        authorId: myId,
      });
      toast.success("Konu açıldı.");
      setComposerOpen(false);
      setNewTitle("");
      setNewBody("");
      router.push(`/topluluk/${categoryId}/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konu açılamadı.");
    } finally {
      setPublishing(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Bu içeriği görmek için giriş yapın.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">Bu topluluk bulunamadı.</p>
        <Link href="/topluluk" className="text-sm font-medium text-brand hover:underline">
          ← Tüm topluluklar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/topluluk" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Tüm topluluklar
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {category.kind}
            </span>
            {category.isClosed && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Kapalı grup
              </span>
            )}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">{category.name}</h1>
          {category.description && (
            <p className="mb-3 max-w-2xl text-sm text-muted-foreground">{category.description}</p>
          )}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{memberships.length}</strong> üye
            </span>
            <span>
              <strong className="text-foreground">{topics.length}</strong> konu
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setComposerOpen(true)} disabled={!joined}>
            Konu aç
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void toggleJoin()}>
            {joined ? "Ayrıl" : "Katıl"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="mb-1 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Sırala</span>
            <div className="inline-flex gap-0.5 rounded-lg bg-secondary p-0.5">
              {SORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={
                    "h-7 rounded-md px-2.5 text-xs font-medium " +
                    (sort === s ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {sortedTopics.length === 0 ? (
            <p className="rounded-lg border border-border bg-white p-6 text-center text-sm text-muted-foreground">
              Henüz konu açılmamış. {joined ? "İlk konuyu sen aç." : "Katılıp ilk konuyu sen açabilirsin."}
            </p>
          ) : (
            sortedTopics.map((t) => (
              <Link
                key={t.id}
                href={`/topluluk/${categoryId}/${t.id}`}
                className="rounded-lg border border-border bg-white p-4 hover:border-brand/40"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {t.isPinned && (
                    <span className="rounded-md bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
                      Sabit
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {userLabel(t.authorId)} · {new Date(t.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <div className="mb-1.5 font-semibold text-foreground">{t.title}</div>
                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>♥ {likeCountOf(t.id)}</span>
                  <span>{commentCountOf(t.id)} yorum</span>
                  <span>{t.viewCount} görüntülenme</span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="flex flex-col gap-4">
          {category.rules && (
            <div className="rounded-lg border border-border bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Topluluk kuralları</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{category.rules}</p>
            </div>
          )}
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">Moderatörler</div>
            {moderators.length === 0 ? (
              <p className="text-xs text-muted-foreground">Henüz moderatör yok.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {moderators.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                      {initialsOf(m.userId)}
                    </div>
                    <span className="text-sm font-medium text-foreground">{userLabel(m.userId)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konu aç</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <input
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
              placeholder="Başlık"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              className="min-h-32"
              placeholder="Deneyimini yaz — meslektaşların okuyor."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setComposerOpen(false)} disabled={publishing}>
              Vazgeç
            </Button>
            <Button onClick={() => void createTopic()} disabled={publishing}>
              {publishing ? "Açılıyor…" : "Konuyu yayınla"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
