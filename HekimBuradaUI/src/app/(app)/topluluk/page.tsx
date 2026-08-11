"use client";

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
  communityApi,
  identityApi,
  type CommunityCategory,
  type Membership,
  type UserLookupRow,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";

export default function Topluluk() {
  const hasToken = useHasToken();
  const myId = auth.getUserId();

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<Map<string, UserLookupRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<Membership | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, membershipsRes] = await Promise.all([
        communityApi.listCategories({ pageSize: 100 }),
        communityApi.listMemberships({ pageSize: 100 }),
      ]);
      setCategories(catsRes.items);
      setMemberships(membershipsRes.items);

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

  const leave = async (membership: Membership) => {
    setBusyId(membership.id);
    try {
      await communityApi.removeMembership(membership.id);
      toast.success("Topluluktan ayrıldınız.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ayrılamadınız.");
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
  const otherCategories = categories.filter((c) => !myCategoryIds.has(c.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Topluluk</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Branş topluluklarınızı yönetin — katılın, ayrılın veya (admin olduğunuz topluluklarda) üyeleri
        yönetin. Konu başlıkları ve tartışmalar yakında burada olacak.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-foreground">Topluluklarım</h2>
        {myMemberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz bir topluluğa üye değilsiniz.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myMemberships.map((m) => {
              const category = categories.find((c) => c.id === m.categoryId);
              const otherMembers = memberships.filter(
                (x) => x.categoryId === m.categoryId && x.userId !== myId
              );
              return (
                <div key={m.id} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {category?.name ?? "Bilinmeyen topluluk"}
                      </span>
                      {m.isAdmin && (
                        <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                          Admin
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === m.id}
                      onClick={() => leave(m)}
                    >
                      Ayrıl
                    </Button>
                  </div>

                  {m.isAdmin && (
                    <div className="mt-3 border-t border-border pt-3">
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">Diğer Topluluklar</h2>
        {otherCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Katılabileceğiniz başka topluluk yok.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherCategories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-border bg-white p-4"
              >
                <span className="font-semibold text-foreground">{c.name}</span>
                <Button size="sm" disabled={busyId === c.id} onClick={() => join(c.id)}>
                  Katıl
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

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
