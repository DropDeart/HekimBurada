"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  communityApi,
  identityApi,
  marketplaceApi,
  type CommunityCategory,
  type DoctorProfile,
  type Favorite,
  type Listing,
  type Me,
  type Membership,
  type MarketplaceRequest,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { slug: "uyelik", label: "Üyelik Bilgilerim" },
  { slug: "adres", label: "Adres Bilgilerim" },
  { slug: "egitim", label: "Eğitim Bilgilerim" },
  { slug: "foto", label: "Profil Fotoğrafım" },
  { slug: "yorumlar", label: "Ürün ve Topluluk Yorumlarım" },
  { slug: "favoriler", label: "Favorilerim" },
  { slug: "talepler", label: "Taleplerim" },
  { slug: "siparis", label: "Sipariş ve Kargo Bilgilerim" },
  { slug: "fatura", label: "Faturalarım" },
];

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

/** Backend'de karşılığı olmayan bölümler için ortak "yakında" notu — kullanıcıyı yanıltmamak için. */
function StaticNotice() {
  return (
    <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
      Bu bölüm şu an bir arayüz taslağıdır — girdiğiniz bilgiler henüz kaydedilmiyor.
    </p>
  );
}

function ProfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("bolum") ?? "uyelik";
  const hasToken = useHasToken();

  const [me, setMe] = useState<Me | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [communityCategories, setCommunityCategories] = useState<CommunityCategory[]>([]);
  const [favorites, setFavorites] = useState<{ favorite: Favorite; listing: Listing }[]>([]);
  const [myRequests, setMyRequests] = useState<MarketplaceRequest[]>([]);

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const load = useCallback(async () => {
    const myId = auth.getUserId();
    if (!myId) return;
    try {
      const [meRes, profileRes] = await Promise.all([
        identityApi.me(),
        identityApi.doctorProfile().catch(() => null),
      ]);
      setMe(meRes);
      setFullName(meRes.fullName ?? "");
      setDoctorProfile(profileRes);
    } catch {
      // sayfa yine de render edilsin, alanlar boş kalır
    }

    communityApi
      .listMemberships({ pageSize: 200 })
      .then((r) => setMemberships(r.items.filter((m) => m.userId === myId)))
      .catch(() => {});
    communityApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCommunityCategories(r.items))
      .catch(() => {});

    Promise.all([
      marketplaceApi.listFavorites({ pageSize: 200 }),
      marketplaceApi.listListings({ pageSize: 200 }),
    ])
      .then(([favRes, listingsRes]) => {
        const mine = favRes.items.filter((f) => f.userId === myId);
        setFavorites(
          mine
            .map((f) => {
              const listing = listingsRes.items.find((l) => l.id === f.listingId);
              return listing ? { favorite: f, listing } : null;
            })
            .filter((r): r is { favorite: Favorite; listing: Listing } => r !== null)
        );
      })
      .catch(() => {});

    marketplaceApi
      .listRequests({ pageSize: 200 })
      .then((r) => setMyRequests(r.items.filter((req) => req.requesterId === myId)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/oturum değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [hasToken, load]);

  const setTab = (slug: string) => router.push(`/profil?bolum=${slug}`);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await identityApi.updateProfile(fullName || null);
      toast.success("Bilgileriniz güncellendi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPassword2) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }
    setSavingPassword(true);
    try {
      await identityApi.changePassword(currentPassword || null, newPassword);
      toast.success("Şifreniz güncellendi.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Şifre güncellenemedi.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await identityApi.uploadAvatar(file);
      toast.success("Fotoğrafınız güncellendi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yüklenemedi.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const logout = () => {
    auth.clearToken();
    router.push("/");
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Profil</h1>
        <p className="text-sm text-muted-foreground">Görüntülemek için giriş yapın.</p>
      </div>
    );
  }

  const initials = (me?.fullName ?? me?.email ?? "H").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-10 sm:px-10 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit rounded-[10px] bg-[#F9FAFB] p-5 text-center">
        <div className="relative mx-auto size-20">
          <div className="flex size-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
            {initials}
          </div>
          <label className="absolute -right-1.5 -bottom-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white text-xs shadow">
            📷
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </label>
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">{me?.fullName ?? me?.email}</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {doctorProfile?.specialty}
          {doctorProfile?.verificationStatus === "approved" ? " · Doğrulanmış" : ""}
        </div>

        <div className="mt-6 text-left">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.slug}
              onClick={() => setTab(item.slug)}
              className={cn(
                "block w-full py-2.5 text-left text-[13px]",
                activeTab === item.slug
                  ? "font-bold text-brand"
                  : "font-medium text-foreground hover:text-brand"
              )}
            >
              {item.label}
            </button>
          ))}
          <button onClick={logout} className="py-2.5 text-left text-[13px] text-red-600">
            Çıkış
          </button>
        </div>
      </aside>

      <div className="rounded-[10px] border border-border bg-white p-6">
        {activeTab === "uyelik" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <form onSubmit={saveProfile} className="rounded-lg border border-border p-5">
              <h3 className="mb-5 text-lg font-bold text-foreground">Üyelik Bilgilerim</h3>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="fullName">Ad ve Soyad</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="mb-4 grid gap-1.5">
                <Label>E-posta</Label>
                <Input value={me?.email ?? ""} disabled />
              </div>
              <Button type="submit" disabled={savingProfile} className="mt-1">
                {savingProfile ? "Güncelleniyor…" : "Güncelle"}
              </Button>
            </form>

            <form onSubmit={savePassword} className="rounded-lg border border-border p-5">
              <h3 className="mb-5 text-base font-semibold text-foreground">Şifre Güncelle</h3>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="newPassword">Yeni Şifre</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="newPassword2">Yeni Şifre Tekrarı</Label>
                <Input
                  id="newPassword2"
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={savingPassword} className="mt-1">
                {savingPassword ? "Güncelleniyor…" : "Güncelle"}
              </Button>
            </form>
          </div>
        )}

        {activeTab === "adres" && (
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">Kayıtlı Adreslerim</h3>
            <StaticNotice />
            <div className="grid gap-1.5">
              <Label>Adres Başlığı</Label>
              <Input placeholder="Örn. Muayenehane" />
            </div>
          </div>
        )}

        {activeTab === "egitim" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-5">
              <h3 className="mb-4 text-lg font-bold text-foreground">Eğitim Bilgilerim</h3>
              <StaticNotice />
              <div className="grid gap-1.5">
                <Label>Uzmanlık Alanı</Label>
                <Input value={doctorProfile?.specialty ?? ""} disabled />
              </div>
            </div>
            <div className="rounded-lg border border-border p-5">
              <h3 className="mb-4 text-base font-semibold text-foreground">Topluluk Bilgilerim</h3>
              {memberships.length === 0 ? (
                <p className="text-xs text-muted-foreground">Henüz bir topluluğa üye değilsiniz.</p>
              ) : (
                memberships.map((m) => {
                  const cat = communityCategories.find((c) => c.id === m.categoryId);
                  return (
                    <div key={m.id} className="border-t border-[#F0F2F3] py-3 first:border-t-0">
                      <div className="text-[13px] font-bold text-foreground">
                        {cat?.name ?? "Topluluk"} Topluluğu
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "foto" && (
          <div className="flex flex-col items-center gap-4">
            <h3 className="self-start text-lg font-bold text-foreground">Profil Fotoğrafım</h3>
            <div className="flex size-28 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white">
              {initials}
            </div>
            <label className="cursor-pointer rounded-md bg-[#141718] px-4 py-2 text-sm font-medium text-white">
              {uploadingAvatar ? "Yükleniyor…" : "Fotoğrafı Değiştir"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={handleAvatarSelect}
              />
            </label>
          </div>
        )}

        {activeTab === "yorumlar" && (
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">Yorumlarım</h3>
            <p className="text-sm text-muted-foreground">
              İlan/topluluk yorum geçmişi bu özellik yayına alındığında burada görünecek.
            </p>
          </div>
        )}

        {activeTab === "favoriler" && (
          <div>
            <h3 className="mb-5 text-lg font-bold text-foreground">Favorilerim</h3>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz favori ilanınız yok.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {favorites.map(({ favorite, listing }) => (
                  <Link
                    key={favorite.id}
                    href={`/ilanlar/${listing.id}`}
                    className="overflow-hidden rounded-[10px] border border-border"
                  >
                    <div className="h-[110px] bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)]" />
                    <div className="p-3">
                      <div className="text-[13px] font-bold text-foreground">{listing.title}</div>
                      <div className="text-[13px] font-bold text-brand">
                        {listing.price ? currency(listing.price) : "Fiyat belirtilmedi"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "talepler" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Taleplerim</h3>
              <Link href="/talepler" className="text-xs font-semibold text-brand">
                Tüm Talepler Sayfası →
              </Link>
            </div>
            {myRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz talebiniz yok.</p>
            ) : (
              myRequests.map((req) => (
                <div key={req.id} className="border-t border-[#F0F2F3] py-3.5 first:border-t-0">
                  <div className="text-[13px] font-bold text-foreground">{req.title}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "siparis" && (
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">Sipariş ve Kargo Bilgilerim</h3>
            <StaticNotice />
            <p className="text-sm text-muted-foreground">Henüz sipariş kaydınız yok.</p>
          </div>
        )}

        {activeTab === "fatura" && (
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">Faturalarım</h3>
            <StaticNotice />
            <p className="text-sm text-muted-foreground">Henüz fatura kaydınız yok.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilPage() {
  return (
    <Suspense fallback={null}>
      <ProfilContent />
    </Suspense>
  );
}
