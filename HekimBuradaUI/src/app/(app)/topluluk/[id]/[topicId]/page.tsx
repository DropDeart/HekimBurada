"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  communityApi,
  identityApi,
  type CommunityCategory,
  type CommunityComment,
  type Like,
  type Topic,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";

export default function KonuDetay() {
  const params = useParams<{ id: string; topicId: string }>();
  const { id: categoryId, topicId } = params;
  const hasToken = useHasToken();
  const myId = auth.getUserId();

  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [users, setUsers] = useState<Map<string, UserLookupRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busyLike, setBusyLike] = useState<string | null>(null);

  const viewCounted = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, t, commentsRes, likesRes] = await Promise.all([
        communityApi.getCategory(categoryId),
        communityApi.getTopic(topicId),
        communityApi.listComments({ pageSize: 100 }),
        communityApi.listLikes({ pageSize: 100 }),
      ]);
      setCategory(cat);
      setTopic(t);
      const topicComments = commentsRes.items.filter((c) => c.topicId === topicId);
      setComments(topicComments);
      setLikes(likesRes.items);

      const authorIds = [...new Set([t.authorId, ...topicComments.map((c) => c.authorId)])];
      if (authorIds.length > 0) {
        const rows = await identityApi.lookupUsers(authorIds);
        setUsers(new Map(rows.map((r) => [r.id, r])));
      }

      if (!viewCounted.current) {
        viewCounted.current = true;
        void communityApi.incrementTopicViewCount(topicId);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        setNotFound(true);
      } else {
        toast.error(err instanceof Error ? err.message : "Konu alınamadı.");
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId, topicId]);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme
    void load();
  }, [hasToken, load]);

  const userLabel = (userId: string) => {
    const u = users.get(userId);
    return u ? (u.fullName ?? u.email) : "Hekim";
  };
  const initialsOf = (userId: string) => userLabel(userId).slice(0, 2).toUpperCase();

  const myLikeFor = (opts: { topicId?: string; commentId?: string }) =>
    likes.find(
      (l) =>
        l.authorId === myId &&
        (opts.topicId ? l.topicId === opts.topicId : l.commentId === opts.commentId)
    );

  const toggleTopicLike = async () => {
    if (!topic || !myId) return;
    setBusyLike(topic.id);
    try {
      const existing = myLikeFor({ topicId: topic.id });
      if (existing) {
        await communityApi.removeLike(existing.id);
      } else {
        await communityApi.createLike({ topicId: topic.id, authorId: myId });
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusyLike(null);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!myId) return;
    setBusyLike(commentId);
    try {
      const existing = myLikeFor({ commentId });
      if (existing) {
        await communityApi.removeLike(existing.id);
      } else {
        await communityApi.createLike({ commentId, authorId: myId });
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusyLike(null);
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || !myId) return;
    setPosting(true);
    try {
      await communityApi.createComment({ body: newComment, topicId, authorId: myId });
      setNewComment("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (parentId: string) => {
    if (!replyBody.trim() || !myId) return;
    setPosting(true);
    try {
      await communityApi.createComment({ body: replyBody, topicId, authorId: myId, parentId });
      setReplyBody("");
      setReplyTo(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yanıt gönderilemedi.");
    } finally {
      setPosting(false);
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

  if (notFound || !topic || !category) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">Bu konu bulunamadı.</p>
        <Link href={`/topluluk/${categoryId}`} className="text-sm font-medium text-brand hover:underline">
          ← Topluluğa dön
        </Link>
      </div>
    );
  }

  const topLevelComments = comments.filter((c) => c.parentId === null);
  const repliesOf = (commentId: string) => comments.filter((c) => c.parentId === commentId);
  const topicLiked = !!myLikeFor({ topicId: topic.id });
  const topicLikeCount = likes.filter((l) => l.topicId === topic.id).length;
  const totalCommentCount = comments.length;

  const CommentLikeButton = ({ commentId }: { commentId: string }) => {
    const liked = !!myLikeFor({ commentId });
    const count = likes.filter((l) => l.commentId === commentId).length;
    return (
      <button
        onClick={() => void toggleCommentLike(commentId)}
        disabled={busyLike === commentId}
        className={"text-xs " + (liked ? "font-medium text-brand" : "text-muted-foreground hover:text-foreground")}
      >
        {liked ? "♥" : "♡"} {count}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href={`/topluluk/${categoryId}`}
        className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← {category.name}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="rounded-lg border border-border bg-white p-8">
          <h1 className="mb-4 text-2xl font-bold text-foreground">{topic.title}</h1>

          <div className="mb-6 flex items-center gap-3 border-t border-b border-border py-3.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {initialsOf(topic.authorId)}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{userLabel(topic.authorId)}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(topic.createdAt).toLocaleDateString("tr-TR")} · {topic.viewCount} görüntülenme
              </div>
            </div>
          </div>

          <p className="mb-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{topic.body}</p>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button
              variant={topicLiked ? "default" : "outline"}
              size="sm"
              disabled={busyLike === topic.id}
              onClick={() => void toggleTopicLike()}
            >
              {topicLiked ? "♥ Beğendin" : "♡ Beğen"} · {topicLikeCount}
            </Button>
            <span className="text-sm text-muted-foreground">{totalCommentCount} yorum</span>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Yorumlar <span className="font-normal text-muted-foreground">({totalCommentCount})</span>
            </h3>

            <div className="mb-7 flex gap-3">
              <div className="flex size-9 flex-none items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                {(auth.getEmail() ?? "H").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <Textarea
                  className="mb-2 min-h-20"
                  placeholder="Deneyimini yaz — meslektaşların okuyor."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button size="sm" disabled={posting} onClick={() => void postComment()}>
                    Yorum gönder
                  </Button>
                </div>
              </div>
            </div>

            {topLevelComments.map((c) => (
              <div key={c.id} className="border-t border-border py-4">
                <div className="flex gap-3">
                  <div className="flex size-9 flex-none items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                    {initialsOf(c.authorId)}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{userLabel(c.authorId)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <p className="mb-2 text-sm leading-relaxed text-foreground/90">{c.body}</p>
                    <div className="flex items-center gap-3">
                      <CommentLikeButton commentId={c.id} />
                      <button
                        onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Yanıtla
                      </button>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
                      {repliesOf(c.id).map((r) => (
                        <div key={r.id} className="flex gap-2.5">
                          <div className="flex size-7 flex-none items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
                            {initialsOf(r.authorId)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">{userLabel(r.authorId)}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                              </span>
                            </div>
                            <p className="mt-0.5 mb-1 text-sm text-foreground/90">{r.body}</p>
                            <CommentLikeButton commentId={r.id} />
                          </div>
                        </div>
                      ))}

                      {replyTo === c.id && (
                        <div className="flex gap-2.5">
                          <div className="flex-1">
                            <Textarea
                              className="mb-2 min-h-16"
                              placeholder={`${userLabel(c.authorId)} kullanıcısına yanıt yaz…`}
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" disabled={posting} onClick={() => void postReply(c.id)}>
                                Yanıtla
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReplyTo(null);
                                  setReplyBody("");
                                }}
                              >
                                Vazgeç
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Bu konu</div>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Beğeni</span>
              <strong className="text-foreground">{topicLikeCount}</strong>
            </div>
            <div className="flex justify-between">
              <span>Yorum</span>
              <strong className="text-foreground">{totalCommentCount}</strong>
            </div>
            <div className="flex justify-between">
              <span>Görüntülenme</span>
              <strong className="text-foreground">{topic.viewCount}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
