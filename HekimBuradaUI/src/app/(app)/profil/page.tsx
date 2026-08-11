"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingImage } from "@/components/ListingImage";
import { ProvinceDistrictSelect } from "@/components/ProvinceDistrictSelect";
import {
  communityApi,
  identityApi,
  marketplaceApi,
  IDENTITY_URL,
  type Address,
  type CommunityCategory,
  type CommunityComment,
  type DoctorProfile,
  type Favorite,
  type Listing,
  type ListingReview,
  type Me,
  type Membership,
  type MarketplaceRequest,
  type Order,
  type Topic,
} from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { slug: "uyelik", label: "Üyelik Bilgilerim" },
  { slug: "adres", label: "Adres Bilgilerim" },
  { slug: "egitim", label: "Eğitim Bilgilerim" },
  { slug: "yorumlar", label: "Ürün ve Topluluk Yorumlarım" },
  { slug: "favoriler", label: "Favorilerim" },
  { slug: "talepler", label: "Taleplerim" },
  { slug: "siparis", label: "Sipariş ve Kargo Bilgilerim" },
  { slug: "fatura", label: "Faturalarım" },
];

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

/** TR telefon formatı — 0/+90 önekli veya öneksiz 10 haneli. Backend'deki desenle aynı. */
const PHONE_PATTERN = /^(\+90|0)?[1-9]\d{9}$/;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bagis: "Bağış ile Ödeme",
  bedelsiz: "Bedelsiz Ürün",
  referans: "Referans Linkli %50+ İndirim",
  kart: "Kredi Kartı",
  elden: "Elden Teslim",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

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
  const [orders, setOrders] = useState<{ order: Order; listing: Listing | null }[]>([]);
  const [myReviews, setMyReviews] = useState<{ review: ListingReview; listing: Listing | null }[]>([]);
  const [myComments, setMyComments] = useState<{ comment: CommunityComment; topic: Topic | null }[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressTitle, setAddressTitle] = useState("");
  const [addressFull, setAddressFull] = useState("");
  const [addressDistrictId, setAddressDistrictId] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressPhoneError, setAddressPhoneError] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deleteAddressTarget, setDeleteAddressTarget] = useState<Address | null>(null);

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarDeleteConfirmOpen, setAvatarDeleteConfirmOpen] = useState(false);
  const [graduationSchool, setGraduationSchool] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [savingEducation, setSavingEducation] = useState(false);

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
      setGraduationSchool(profileRes?.graduationSchool ?? "");
      setGraduationYear(profileRes?.graduationYear ? String(profileRes.graduationYear) : "");
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
      marketplaceApi.listOrders({ pageSize: 200 }),
      marketplaceApi.listListingReviews({ pageSize: 200 }),
    ])
      .then(([favRes, listingsRes, ordersRes, reviewsRes]) => {
        const mine = favRes.items.filter((f) => f.userId === myId);
        setFavorites(
          mine
            .map((f) => {
              const listing = listingsRes.items.find((l) => l.id === f.listingId);
              return listing ? { favorite: f, listing } : null;
            })
            .filter((r): r is { favorite: Favorite; listing: Listing } => r !== null)
        );
        setOrders(
          [...ordersRes.items]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((order) => ({
              order,
              listing: listingsRes.items.find((l) => l.id === order.listingId) ?? null,
            }))
        );
        setMyReviews(
          reviewsRes.items
            .filter((r) => r.authorId === myId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((review) => ({
              review,
              listing: listingsRes.items.find((l) => l.id === review.listingId) ?? null,
            }))
        );
      })
      .catch(() => {});

    marketplaceApi
      .listRequests({ pageSize: 200 })
      .then((r) => setMyRequests(r.items.filter((req) => req.requesterId === myId)))
      .catch(() => {});

    identityApi
      .listAddresses()
      .then(setAddresses)
      .catch(() => {});

    Promise.all([communityApi.listComments({ pageSize: 200 }), communityApi.listTopics({ pageSize: 200 })])
      .then(([commentsRes, topicsRes]) => {
        setMyComments(
          commentsRes.items
            .filter((c) => c.authorId === myId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((comment) => ({
              comment,
              topic: topicsRes.items.find((t) => t.id === comment.topicId) ?? null,
            }))
        );
      })
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

  const submitEducation = async (e: FormEvent) => {
    e.preventDefault();
    const year = graduationYear.trim() ? Number(graduationYear) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      toast.error("Geçerli bir mezuniyet yılı girin (1950-2100).");
      return;
    }
    setSavingEducation(true);
    try {
      await identityApi.updateEducation({
        graduationSchool: graduationSchool.trim() || null,
        graduationYear: year,
      });
      toast.success("Eğitim bilgileriniz güncellendi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSavingEducation(false);
    }
  };

  const submitAddress = async (e: FormEvent) => {
    e.preventDefault();
    setAddressPhoneError(null);

    if (!addressDistrictId) {
      toast.error("Lütfen il ve ilçe seçin.");
      return;
    }
    const phone = addressPhone.trim().replace(/\s+/g, "");
    if (phone && !PHONE_PATTERN.test(phone)) {
      setAddressPhoneError("Geçerli bir telefon numarası girin (örn. 0532 111 22 33).");
      return;
    }

    setSavingAddress(true);
    try {
      const created = await identityApi.createAddress({
        title: addressTitle,
        fullAddress: addressFull,
        districtId: addressDistrictId,
        phone: phone || null,
      });
      setAddresses((prev) => [created, ...prev]);
      setAddressTitle("");
      setAddressFull("");
      setAddressDistrictId("");
      setAddressPhone("");
      toast.success("Adresiniz eklendi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adres eklenemedi.");
    } finally {
      setSavingAddress(false);
    }
  };

  const confirmDeleteAddress = async () => {
    if (!deleteAddressTarget) return;
    try {
      await identityApi.deleteAddress(deleteAddressTarget.id);
      setAddresses((prev) => prev.filter((a) => a.id !== deleteAddressTarget.id));
      toast.success("Adres silindi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setDeleteAddressTarget(null);
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

  const confirmDeleteAvatar = async () => {
    setAvatarDeleteConfirmOpen(false);
    setDeletingAvatar(true);
    try {
      await identityApi.deleteAvatar();
      toast.success("Fotoğrafınız kaldırıldı.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaldırılamadı.");
    } finally {
      setDeletingAvatar(false);
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
          {me?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel
            <img
              src={`${IDENTITY_URL}${me.avatarUrl}`}
              alt={me.fullName ?? me.email}
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="absolute -right-1.5 -bottom-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white text-xs shadow"
          >
            📷
          </button>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-4 text-lg font-bold text-foreground">Kayıtlı Adreslerim</h3>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz kayıtlı adresiniz yok.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {addresses.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] font-bold text-foreground">{a.title}</div>
                        <button
                          type="button"
                          onClick={() => setDeleteAddressTarget(a)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Sil
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.fullAddress}, {a.region}
                      </p>
                      {a.phone && <p className="mt-1 text-xs text-muted-foreground">Tel: {a.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={submitAddress} className="rounded-lg border border-border p-5">
              <h3 className="mb-5 text-base font-semibold text-foreground">Yeni Adres Ekle</h3>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="addressTitle">Adres Başlığı</Label>
                <Input
                  id="addressTitle"
                  placeholder="Örn. Muayenehane"
                  value={addressTitle}
                  onChange={(e) => setAddressTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="addressFull">Açık Adres</Label>
                <Input
                  id="addressFull"
                  value={addressFull}
                  onChange={(e) => setAddressFull(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4 grid gap-1.5">
                <Label>İl / İlçe</Label>
                <ProvinceDistrictSelect districtId={addressDistrictId} onDistrictIdChange={setAddressDistrictId} />
              </div>
              <div className="mb-4 grid gap-1.5">
                <Label htmlFor="addressPhone">Telefon</Label>
                <Input
                  id="addressPhone"
                  placeholder="0532 111 22 33"
                  value={addressPhone}
                  onChange={(e) => {
                    setAddressPhone(e.target.value);
                    setAddressPhoneError(null);
                  }}
                />
                {addressPhoneError && <p className="text-xs text-red-600">{addressPhoneError}</p>}
              </div>
              <Button type="submit" disabled={savingAddress} className="mt-1">
                {savingAddress ? "Ekleniyor…" : "Adresi Ekle"}
              </Button>
            </form>
          </div>
        )}

        {activeTab === "egitim" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-5">
              <h3 className="mb-4 text-lg font-bold text-foreground">Eğitim Bilgilerim</h3>
              <p className="mb-5 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                Uzmanlık alanınız kayıt sırasında verdiğiniz belgeyle doğrulandı, bu nedenle burada
                değiştirilemez.
              </p>
              <div className="mb-5 grid gap-1.5">
                <Label>Uzmanlık Alanı</Label>
                <Input value={doctorProfile?.specialty ?? ""} disabled />
              </div>

              <form onSubmit={submitEducation} className="border-t border-[#F0F2F3] pt-5">
                <p className="mb-4 text-xs text-muted-foreground">
                  Mezun olduğunuz okul ve mezuniyet yılı — bu bilgiler kendiniz girer/düzenlersiniz,
                  doğrulama gerekmez.
                </p>
                <div className="mb-4 grid gap-1.5">
                  <Label htmlFor="graduationSchool">Mezun Olunan Okul</Label>
                  <Input
                    id="graduationSchool"
                    placeholder="Örn. Ankara Üniversitesi Tıp Fakültesi"
                    value={graduationSchool}
                    onChange={(e) => setGraduationSchool(e.target.value)}
                  />
                </div>
                <div className="mb-4 grid gap-1.5">
                  <Label htmlFor="graduationYear">Mezuniyet Yılı</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    min={1950}
                    max={2100}
                    placeholder="Örn. 2018"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={savingEducation}>
                  {savingEducation ? "Güncelleniyor…" : "Güncelle"}
                </Button>
              </form>
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

        {activeTab === "yorumlar" && (
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">Yorumlarım</h3>
            <Tabs defaultValue="urun">
              <TabsList>
                <TabsTrigger value="urun">Ürün Yorumlarım ({myReviews.length})</TabsTrigger>
                <TabsTrigger value="topluluk">Topluluk Yorumlarım ({myComments.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="urun">
                {myReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz bir ilana yorum yapmadınız.</p>
                ) : (
                  <div className="flex flex-col">
                    {myReviews.map(({ review, listing }) => (
                      <div key={review.id} className="border-t border-[#F0F2F3] py-3.5 first:border-t-0">
                        <div className="flex items-center justify-between">
                          <Link
                            href={listing ? `/ilanlar/${listing.id}` : "#"}
                            className="text-[13px] font-bold text-foreground hover:text-brand"
                          >
                            {listing?.title ?? "İlan bulunamadı"}
                          </Link>
                          <span className="text-xs font-semibold text-amber-500">
                            {"★".repeat(review.rating)}
                            {"☆".repeat(5 - review.rating)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{review.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="topluluk">
                {myComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz bir konuya yorum yapmadınız.</p>
                ) : (
                  <div className="flex flex-col">
                    {myComments.map(({ comment, topic }) => (
                      <div key={comment.id} className="border-t border-[#F0F2F3] py-3.5 first:border-t-0">
                        <div className="text-[13px] font-bold text-foreground">
                          {topic?.title ?? "Konu bulunamadı"}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
                    <ListingImage images={listing.images} alt={listing.title} className="h-[110px] w-full" placeholderText="" />
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
                <Link
                  key={req.id}
                  href={`/talepler/${req.id}`}
                  className="flex items-center justify-between border-t border-[#F0F2F3] py-3.5 first:border-t-0 hover:text-brand"
                >
                  <div className="text-[13px] font-bold text-foreground">{req.title}</div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                      req.status === "open" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {req.status === "open" ? "Açık" : "Kapatıldı"}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "siparis" && (
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">Sipariş ve Kargo Bilgilerim</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz sipariş kaydınız yok.</p>
            ) : (
              <div className="flex flex-col">
                {orders.map(({ order, listing }) => (
                  <div key={order.id} className="border-t border-[#F0F2F3] py-3.5 first:border-t-0">
                    <div className="flex items-center justify-between">
                      <Link
                        href={listing ? `/ilanlar/${listing.id}` : "#"}
                        className="text-[13px] font-bold text-foreground hover:text-brand"
                      >
                        {listing?.title ?? "İlan bulunamadı"}
                      </Link>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod} · {currency(order.amount)} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                    </div>
                    {order.deliveryNote && (
                      <div className="mt-1 text-xs text-muted-foreground">Teslim notu: {order.deliveryNote}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil Fotoğrafım</DialogTitle>
            <DialogDescription>JPEG, PNG, WEBP veya GIF — en fazla 2 MB.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel
              <img
                src={`${IDENTITY_URL}${me.avatarUrl}`}
                alt={me.fullName ?? me.email}
                className="size-28 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white">
                {initials}
              </div>
            )}
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-md bg-[#141718] px-4 py-2 text-sm font-medium text-white">
                {uploadingAvatar ? "Yükleniyor…" : me?.avatarUrl ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={handleAvatarSelect}
                />
              </label>
              {me?.avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletingAvatar}
                  onClick={() => setAvatarDeleteConfirmOpen(true)}
                >
                  {deletingAvatar ? "Kaldırılıyor…" : "Kaldır"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={avatarDeleteConfirmOpen} onOpenChange={setAvatarDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fotoğraf kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>Profil fotoğrafınız kaldırılacak, yerine baş harfleriniz gösterilecek.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAvatar}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAddressTarget !== null} onOpenChange={(next) => !next && setDeleteAddressTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adres silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteAddressTarget?.title}&quot; adresi kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAddress}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
