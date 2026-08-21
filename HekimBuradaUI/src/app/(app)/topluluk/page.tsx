"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { CreateCommunityWizard } from "@/components/community/CreateCommunityWizard";
import {
  communityApi,
  identityApi,
  type CommunityCategory,
  type Membership,
  type Topic,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";

const KIND_FILTERS = ["Tümü", "Branş", "Okul", "Bölge"];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function Topluluk() {
  const hasToken = useHasToken();
  const myId = auth.getUserId();

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [users, setUsers] = useState<Map<string, UserLookupRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<Membership | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filter, setFilter] = useState(KIND_FILTERS[0]);
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, membershipsRes, topicsRes] = await Promise.all([
        communityApi.listCategories({ pageSize: 100 }),
        communityApi.listMemberships({ pageSize: 100 }),
        communityApi.listTopics({ pageSize: 100 }),
      ]);
      setCategories(catsRes.items);
      setMemberships(membershipsRes.items);
      setTopics(topicsRes.items);
      setLoadedAt(Date.now());

      const otherMemberIds = [...new Set(membershipsRes.items.map((m) => m.userId))].filter(
        (id) => id !== myId
      );
      if (otherMemberIds.length > 0) {
        const rows = await identityApi.lookupUsers(otherMemberIds);
        setUsers(new Map(rows.map((r) => [r.id, r])));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Topluluklar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    if (!hasToken) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [hasToken, load]);

  const join = async (categoryId: string) => {
    setBusyId(categoryId);
    try {
      await communityApi.joinCommunity(categoryId);
      toast.success("Topluluğa katıldınız.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Katılamadınız.");
    } finally {
      setBusyId(null);
    }
  };

  const kick = async () => {
    if (!kickTarget) return;
    setBusyId(kickTarget.id);
    try {
      await communityApi.removeMembership(kickTarget.id);
      toast.success("Üye çıkarıldı.");
      setKickTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Üye çıkarılamadı.");
    } finally {
      setBusyId(null);
    }
  };

  const userLabel = (userId: string) => {
    const u = users.get(userId);
    return u ? (u.fullName ?? u.email) : userId;
  };

  const weeklyTopicCount = useMemo(() => {
    const cutoff = loadedAt - SEVEN_DAYS_MS;
    const byCategory = new Map<string, number>();
    for (const t of topics) {
      if (new Date(t.createdAt).getTime() >= cutoff) {
        byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + 1);
      }
    }
    return byCategory;
  }, [topics, loadedAt]);

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Topluluk</h1>
        <p className="text-sm text-muted-foreground">Topluluklarınızı görmek için giriş yapın.</p>
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

  const myMemberships = memberships.filter((m) => m.userId === myId);
  const myCategoryIds = new Set(myMemberships.map((m) => m.categoryId));
  const myCategories = categories.filter((c) => myCategoryIds.has(c.id));
  const visibleCategories =
    filter === "Tümü" ? categories : categories.filter((c) => c.kind === filter);

  const memberCountOf = (categoryId: string) => memberships.filter((m) => m.categoryId === categoryId).length;
  const topicCountOf = (categoryId: string) => topics.filter((t) => t.categoryId === categoryId).length;

  const uniqueMemberCount = new Set(memberships.map((m) => m.userId)).size;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <section className="mb-8 rounded-2xl border border-border bg-white p-8">
        <span className="mb-4 inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
          Yalnızca doğrulanmış hekimler
        </span>
        <h1 className="mb-3 max-w-2xl text-3xl font-bold text-foreground">
          Topluluklar: meslektaşlarınla aynı odada konuş.
        </h1>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Branşına, kullandığın cihaza ya da bulunduğun bölgeye göre kurulmuş tartışma alanları. Konu
          açar, deneyim paylaşır, yorumlarda birbirinize yanıt verirsiniz.
        </p>
        <div className="flex gap-3">
          <Button size="lg" onClick={() => setWizardOpen(true)}>
            Topluluk oluştur
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#tum-topluluklar">Toplulukları keşfet</a>
          </Button>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-3 gap-4 rounded-2xl border border-border bg-white p-6">
        <div>
          <div className="text-2xl font-bold text-foreground">{categories.length}</div>
          <div className="text-xs text-muted-foreground">Aktif topluluk</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{uniqueMemberCount}</div>
          <div className="text-xs text-muted-foreground">Doğrulanmış hekim</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{topics.length}</div>
          <div className="text-xs text-muted-foreground">Açılmış konu</div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-base font-bold text-foreground">Topluluklarım</h2>
        {myCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz bir topluluğa üye değilsiniz.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCategories.map((c) => {
              const membership = myMemberships.find((m) => m.categoryId === c.id);
              return (
                <Link
                  key={c.id}
                  href={`/topluluk/${c.id}`}
                  className="flex flex-col gap-2.5 rounded-lg border border-border bg-white p-4 hover:border-brand/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {c.kind}
                    </span>
                    {membership?.isAdmin && (
                      <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                        Moderatör
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-foreground">{c.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{memberCountOf(c.id)} üye</span>
                    <span>·</span>
                    <span>{weeklyTopicCount.get(c.id) ?? 0} yeni konu / hafta</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="tum-topluluklar" className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">Tüm topluluklar</h2>
          <div className="inline-flex gap-0.5 rounded-lg bg-secondary p-0.5">
            {KIND_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "h-7 rounded-md px-2.5 text-xs font-medium " +
                  (filter === f ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {visibleCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bu türde topluluk yok.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCategories.map((c) => {
              const joined = myCategoryIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className="flex min-h-[180px] flex-col gap-2.5 rounded-lg border border-border bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {c.kind}
                    </span>
                    {c.isClosed && <span className="text-xs text-muted-foreground">Kapalı grup</span>}
                  </div>
                  <Link href={`/topluluk/${c.id}`} className="font-semibold text-foreground hover:text-brand">
                    {c.name}
                  </Link>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {memberCountOf(c.id)} üye · {topicCountOf(c.id)} konu
                    </span>
                    <Button
                      size="sm"
                      variant={joined ? "outline" : "default"}
                      disabled={busyId === c.id}
                      onClick={() => (joined ? undefined : join(c.id))}
                    >
                      {joined ? "Üyesin ✓" : "Katıl"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {myMemberships.some((m) => m.isAdmin) && (
        <section className="mb-10">
          <h2 className="mb-3 text-base font-bold text-foreground">Yönettiğim topluluklar</h2>
          <div className="flex flex-col gap-3">
            {myMemberships
              .filter((m) => m.isAdmin)
              .map((m) => {
                const category = categories.find((c) => c.id === m.categoryId);
                const otherMembers = memberships.filter(
                  (x) => x.categoryId === m.categoryId && x.userId !== myId
                );
                return (
                  <div key={m.id} className="rounded-lg border border-border bg-white p-4">
                    <div className="mb-2 font-semibold text-foreground">
                      {category?.name ?? "Bilinmeyen topluluk"}
                    </div>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">
                      Üyeler ({otherMembers.length})
                    </div>
                    {otherMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Başka üye yok.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {otherMembers.map((om) => (
                          <div key={om.id} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{userLabel(om.userId)}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busyId === om.id}
                              onClick={() => setKickTarget(om)}
                            >
                              Çıkar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      <section className="flex items-center justify-between gap-6 rounded-2xl bg-foreground p-8">
        <div>
          <h3 className="mb-1 text-xl font-semibold text-background">Aradığın topluluk yoksa, sen kur.</h3>
          <p className="text-sm text-background/70">Üç adım: tanım, erişim, kurallar. Moderatörü sen olursun.</p>
        </div>
        <Button size="lg" className="bg-brand text-white hover:bg-brand/90" onClick={() => setWizardOpen(true)}>
          Topluluk oluştur
        </Button>
      </section>

      <CreateCommunityWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={() => void load()} />

      <AlertDialog open={kickTarget !== null} onOpenChange={(next) => !next && setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Üye çıkarılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{kickTarget ? userLabel(kickTarget.userId) : ""}&quot; bu topluluktan çıkarılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={kick}>Çıkar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
