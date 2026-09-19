"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Heart, MessageSquare, Menu, Search, User as UserIcon, X } from "lucide-react";
import { toast } from "sonner";
import { connectPresence } from "@/lib/presenceHub";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_ROLES, auth, useAuthRoles, useHasToken } from "@/lib/auth";
import {
  communityApi,
  GATEWAY_URL,
  gatewayApi,
  identityApi,
  isAnnouncementActive,
  marketplaceApi,
  messagingApi,
  type Announcement,
  type AppNotification,
  type CommunityCategory,
  type MarketplaceCategory,
  type MarketplaceRequest,
  type MenuItem,
  type Membership,
  type Offer,
} from "@/lib/api";
import { CONTACT_COLUMNS } from "@/lib/staticContent";
import { MegaMenu } from "./MegaMenu";

/** 5'ten fazla alt kategorisi olan bir grup, mega-menüde tek uzun sütun yerine 2 sütuna yayılır. */
const WIDE_SUBCATEGORY_THRESHOLD = 5;

/** Mega menülerdeki "son N" listeleri (talepler, duyurular, topluluklarım) bu sayıyla sınırlanır —
 * daha fazlası için ilgili "Tümünü Gör" linki kullanılır. */
const RECENT_LIST_LIMIT = 5;

const FALLBACK_NAV_LINKS: MenuItem[] = [{ id: "fallback-home", location: "header", label: "Ana Sayfa", url: "/", sortOrder: 0 }];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

function getInitials(email: string | null) {
  if (!email) return "H";
  return email.slice(0, 2).toUpperCase();
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const hasToken = useHasToken();
  const roles = useAuthRoles();
  const isAdmin = ADMIN_ROLES.some((r) => roles.includes(r));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [communityCategories, setCommunityCategories] = useState<CommunityCategory[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isVerifiedDoctor, setIsVerifiedDoctor] = useState(false);
  const [navLinks, setNavLinks] = useState<MenuItem[]>(FALLBACK_NAV_LINKS);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Duyuru panosu/navbar banner'ı login öncesi de görünür — anonim, hasToken'a bağlı değil.
    // pageSize 5'ten geniş çekilip aktif olmayanlar (süresi geçmiş/henüz yayınlanmamış) elenip son
    // RECENT_LIST_LIMIT tanesi gösteriliyor — aksi halde ilk 5 kayıt arasında aktif olmayan varsa
    // eksik gösterim olurdu.
    gatewayApi
      .listAnnouncements({ pageSize: 20 })
      .then((r) =>
        setAnnouncements(
          r.items
            .filter((a) => isAnnouncementActive(a))
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
            .slice(0, RECENT_LIST_LIMIT)
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Header linkleri ve logo admin tarafından yönetiliyor — anonim, herkese açık.
    gatewayApi
      .listMenuItems({ location: "header" })
      .then((items) => { if (items.length > 0) setNavLinks(items); })
      .catch(() => {});
    gatewayApi
      .getSiteSettings()
      .then((s) => setLogoUrl(s.logoUrl))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    // Onaylı doktorun artık "Belge Durumu"na bakmasına gerek yok — link sadece pending/rejected'ta
    // anlamlı. Admin hesaplarının DoctorProfile'ı olmayabilir (404) — o durumda link zaten yanlış
    // olurdu, catch ile sessizce gizli kalır.
    identityApi
      .doctorProfile()
      .then((p) => setIsVerifiedDoctor(p.verificationStatus === "approved"))
      .catch(() => {});
  }, [hasToken]);

  // Kategori ağacı ve topluluk listesi anonime açık (Marketplace/Community okuma uçları) — mega
  // menüler girişsiz ziyaretçiye de dolu gelsin diye token'dan BAĞIMSIZ çekiliyor. Bu menüler her
  // sayfanın en üstünde olduğu için eskiden arama motoru her sayfada üç kez "Görüntülemek için
  // giriş yapın" okuyordu.
  useEffect(() => {
    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items))
      .catch(() => {});
    communityApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCommunityCategories(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    // Talepler hâlâ giriş gerektiriyor: RequestsController'ın okuma uçları anonime açılmadı.
    marketplaceApi
      .listRequests({ pageSize: 20 })
      .then((r) =>
        setRequests(
          [...r.items]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, RECENT_LIST_LIMIT)
        )
      )
      .catch(() => {});
    communityApi
      .listMemberships({ pageSize: 200 })
      .then((r) => setMemberships(r.items))
      .catch(() => {});

    const myId = auth.getUserId();
    if (!myId) return;
    marketplaceApi
      .listListings({ pageSize: 100 })
      .then((listingsRes) => {
        const myListingIds = new Set(
          listingsRes.items.filter((l) => l.sellerId === myId).map((l) => l.id)
        );
        if (myListingIds.size === 0) return;
        marketplaceApi
          .listOffers({ pageSize: 100 })
          .then((offersRes) => {
            setPendingOffers(
              offersRes.items.filter((o) => o.status === "pending" && myListingIds.has(o.listingId))
            );
          })
          .catch(() => {});
      })
      .catch(() => {});

    Promise.all([marketplaceApi.listNotifications(), communityApi.listNotifications(), messagingApi.listNotifications()])
      .then(([marketplaceNotifs, communityNotifs, messagingNotifs]) => {
        setNotifications(
          [...marketplaceNotifs, ...communityNotifs, ...messagingNotifs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      })
      .catch(() => {});
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken) return;
    // Uygulama genelinde bağlı kalan presence bağlantısı — kullanıcı çevrimiçi sayılır (bkz.
    // Messaging/Hubs/PresenceHub.cs) ve teklif/mesaj gibi olaylarda anlık bildirim burada düşer,
    // zil sayfa yenilenmeden güncellenir.
    const disconnect = connectPresence((notification) => {
      toast(notification.title, { description: notification.body });
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: notification.title,
          body: notification.body,
          linkPath: notification.linkPath,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
    return disconnect;
  }, [hasToken]);

  /** Zil açılınca her iki servisteki bildirimleri de okunmuş işaretler (basit "hepsini okundu" deseni). */
  const openNotifications = (open: boolean) => {
    setNotifOpen(open);
    if (open && notifications.some((n) => !n.isRead)) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      marketplaceApi.markAllNotificationsRead().catch(() => {});
      communityApi.markAllNotificationsRead().catch(() => {});
      messagingApi.markAllNotificationsRead().catch(() => {});
    }
  };

  const logout = () => {
    auth.clearToken();
    router.push("/");
  };

  /** İlan verme/favorilere alma/yorum yapma gibi yetki gerektiren aksiyonlar için ortak desen: girişliyse hedefe, değilse login'e. */
  const goToAuthGatedRoute = (route: string) => {
    router.push(hasToken ? route : "/giris-yap");
  };

  const submitSearch = () => {
    const q = searchQuery.trim();
    router.push(q ? `/ilanlar?q=${encodeURIComponent(q)}` : "/ilanlar");
    setSearchQuery("");
  };

  const topCategories = categories.filter((c) => !c.parentId);
  const subCategoriesOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);
  const memberCountOf = (categoryId: string) =>
    memberships.filter((m) => m.categoryId === categoryId).length;
  const myId = auth.getUserId();
  const myCommunityCategories = communityCategories.filter((c) =>
    memberships.some((m) => m.categoryId === c.id && m.userId === myId)
  );

  return (
    <header className="border-b border-border bg-white">
      {announcements.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-[#141718] px-4 py-2 text-xs text-white">
          <span>📌</span>
          <span className="truncate">{announcements[0].title}</span>
          <Link href="/duyuru-panosu" className="font-semibold text-brand whitespace-nowrap">
            Duyuru Panosu →
          </Link>
        </div>
      )}

      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center text-lg font-bold text-foreground">
            {logoUrl ? (
              <Image
                src={`${GATEWAY_URL}${logoUrl}`}
                alt="HekimBurada"
                width={160}
                height={44}
                priority
                className="h-11 w-auto"
              />
            ) : (
              <>
                Hekim<span className="text-brand">Burada</span>
              </>
            )}
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.url}
                className={pathname === link.url ? "text-foreground" : "hover:text-foreground"}
              >
                {link.label}
              </Link>
            ))}

            <MegaMenu
              label="Kategoriler"
              panel={
                // Kategoriler anonime açık. Sunucuda render edilirken liste henüz boş olduğu için
                // (veri useEffect'te geliyor) yedek içerik ARAMA MOTORUNUN gördüğü şeydir — burada
                // eskiden "Görüntülemek için giriş yapın" yazıyordu ve her sayfanın en üstünde
                // Google'a bu düşüyordu. Yerine gerçek bir bağlantı kondu.
                topCategories.length > 0 ? (
                  <div className="flex min-w-[420px] flex-nowrap gap-7">
                    {topCategories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Henüz kategori eklenmedi.</p>
                    ) : (
                      topCategories.map((cat) => {
                        const subs = subCategoriesOf(cat.id);
                        const isWide = subs.length > WIDE_SUBCATEGORY_THRESHOLD;
                        return (
                          <div key={cat.id} className={isWide ? "min-w-[260px]" : "min-w-[150px]"}>
                            <button
                              onClick={() => router.push(`/ilanlar?kategori=${cat.id}`)}
                              className="mb-2 text-left text-[13px] font-bold text-foreground"
                            >
                              {cat.name}
                            </button>
                            <div className={isWide ? "grid grid-cols-2 gap-x-4" : "flex flex-col"}>
                              {subs.map((sub) => (
                                <button
                                  key={sub.id}
                                  onClick={() =>
                                    router.push(`/ilanlar?kategori=${cat.id}&alt=${sub.id}`)
                                  }
                                  className="py-1 text-left text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <Link
                    href="/ilanlar"
                    className="block min-w-[200px] text-xs font-semibold text-brand"
                  >
                    Tüm kategorileri gör
                  </Link>
                )
              }
            />

            <MegaMenu
              label="Talepler"
              panel={
                hasToken ? (
                  <div className="flex min-w-[420px] gap-8">
                    <div className="min-w-[140px]">
                      <div className="mb-2.5 text-xs font-bold text-foreground">
                        Talep Kategorileri
                      </div>
                      {[...new Set(requests.map((r) => r.categoryId))].map((catId) => (
                        <div key={catId} className="py-1 text-xs text-muted-foreground">
                          {categories.find((c) => c.id === catId)?.name ?? "Diğer"}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="mb-2.5 text-xs font-bold text-foreground">Son Talepler</div>
                      {requests.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Henüz talep yok.</p>
                      ) : (
                        requests.map((req) => (
                          <Link
                            key={req.id}
                            href={`/talepler/${req.id}`}
                            className="block border-t border-[#F0F2F3] py-1.5 text-xs font-semibold text-foreground hover:text-brand"
                          >
                            {req.title}
                          </Link>
                        ))
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <Link href="/talepler" className="text-xs font-semibold text-brand">
                          Tüm Talepleri Gör
                        </Link>
                        <button
                          onClick={() => goToAuthGatedRoute("/talep-ver")}
                          className="rounded-md bg-[#141718] px-2.5 py-1.5 text-[11px] font-medium text-white"
                        >
                          + Talep Oluştur
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Talepler hâlâ giriş gerektiriyor (RequestsController anonime açılmadı), ama bu
                  // yedek metin sunucu tarafında da render edildiği için giriş duvarı cümlesi
                  // yerine gerçek bir bağlantı gösteriliyor.
                  <Link
                    href="/talepler"
                    className="block min-w-[200px] text-xs font-semibold text-brand"
                  >
                    Talepleri gör
                  </Link>
                )
              }
            />

            <MegaMenu
              label="Duyuru Panosu"
              panel={
                <div className="min-w-[260px]">
                  <div className="mb-2.5 text-xs font-bold text-foreground">Son Duyurular</div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Henüz duyuru yok.</p>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className="border-t border-[#F0F2F3] py-1.5">
                        <div className="text-xs font-semibold text-foreground">{a.title}</div>
                        <div className="text-[11px] text-muted-foreground">{formatDate(a.publishedAt)}</div>
                      </div>
                    ))
                  )}
                  <Link href="/duyuru-panosu" className="mt-3 block text-xs font-semibold text-brand">
                    Tüm Duyurular
                  </Link>
                </div>
              }
            />

            <MegaMenu
              label="İletişim"
              panel={
                <div className="flex min-w-[300px] gap-8">
                  <div>
                    <div className="mb-2.5 text-xs font-bold text-foreground">Bize Ulaşın</div>
                    {CONTACT_COLUMNS.support.map((s) => (
                      <div key={s.label} className="py-1 text-xs text-muted-foreground">
                        {s.label}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="mb-2.5 text-xs font-bold text-foreground">Kurumsal</div>
                    {CONTACT_COLUMNS.corporate.map((c) => (
                      <div key={c.label} className="py-1 text-xs text-muted-foreground">
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              }
            />

            <MegaMenu
              label="Topluluk"
              panel={
                hasToken ? (
                  <div className="min-w-[260px]">
                    <div className="mb-2.5 text-xs font-bold text-foreground">Topluluklarım</div>
                    {myCommunityCategories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Henüz bir topluluğa üye değilsiniz.</p>
                    ) : (
                      myCommunityCategories.slice(0, RECENT_LIST_LIMIT).map((c) => (
                        <Link
                          key={c.id}
                          href={`/topluluk/${c.id}`}
                          className="flex justify-between border-t border-[#F0F2F3] py-1.5 text-xs hover:text-brand"
                        >
                          <span className="font-semibold text-foreground">{c.name}</span>
                          <span className="text-muted-foreground">{memberCountOf(c.id)} üye</span>
                        </Link>
                      ))
                    )}
                    <Link href="/topluluk" className="mt-3 block text-xs font-semibold text-brand">
                      Tüm Topluluklar
                    </Link>
                  </div>
                ) : (
                  // "Topluluklarım" doğası gereği girişe bağlı; girişsiz ziyaretçiye topluluk
                  // listesine giden bağlantı gösteriliyor (topluluk adları anonime açık).
                  <Link
                    href="/topluluk"
                    className="block min-w-[200px] text-xs font-semibold text-brand"
                  >
                    Branş topluluklarını gör
                  </Link>
                )
              }
            />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <label className="hidden w-48 items-center gap-2 rounded-[10px] border border-border bg-muted px-3 py-2 text-muted-foreground focus-within:border-brand/50 md:flex lg:w-64">
            <Search size={16} className="shrink-0" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="İlan, kategori veya branş ara"
              className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <button
            onClick={submitSearch}
            className="text-foreground hover:text-brand md:hidden"
            aria-label="İlanlarda ara"
          >
            <Search size={20} />
          </button>

          <button
            onClick={() => goToAuthGatedRoute("/favoriler")}
            className="hidden text-foreground hover:text-brand sm:block"
            aria-label="Favorilerim"
          >
            <Heart size={20} />
          </button>

          {hasToken && (
            <button
              onClick={() => router.push("/mesajlar")}
              className="hidden text-foreground hover:text-brand sm:block"
              aria-label="Mesajlar"
            >
              <MessageSquare size={20} />
            </button>
          )}

          {hasToken && (
            <Sheet open={notifOpen} onOpenChange={openNotifications}>
              <SheetTrigger asChild>
                <button
                  className="relative hidden text-foreground hover:text-brand sm:block"
                  aria-label="Bildirimler"
                >
                  <Bell size={20} />
                  {pendingOffers.length + notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {pendingOffers.length + notifications.filter((n) => !n.isRead).length}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Bildirimler</SheetTitle>
                </SheetHeader>

                <div className="text-xs font-bold text-foreground">Yeni Teklifler</div>
                {pendingOffers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Bekleyen teklif yok.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {pendingOffers.map((o) => (
                      <Link
                        key={o.id}
                        href={`/ilanlar/${o.listingId}`}
                        onClick={() => setNotifOpen(false)}
                        className="rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        {o.amount.toLocaleString("tr-TR")} ₺ teklif
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-2 border-t border-border pt-4 text-xs font-bold text-foreground">
                  Tüm Bildirimler
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Henüz bildirim yok.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.linkPath}
                        onClick={() => setNotifOpen(false)}
                        className="flex flex-col items-start gap-0.5 rounded-md px-2.5 py-2 hover:bg-muted"
                      >
                        <span className={n.isRead ? "text-sm text-foreground" : "text-sm font-semibold text-foreground"}>
                          {n.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{n.body}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          )}

          {hasToken ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
                  aria-label="Hesap menüsü"
                >
                  {getInitials(auth.getEmail())}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/profil">Profilim</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ilanlarim">İlanlarım</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/taleplerim">Taleplerim</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/mesajlar">Mesajlar</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin Paneli</Link>
                  </DropdownMenuItem>
                )}
                {!isVerifiedDoctor && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/kayit-ol/belge-yukle">Belge Durumu</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Çıkış Yap</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => router.push("/giris-yap")}
              className="text-foreground hover:text-brand"
              aria-label="Giriş yap"
            >
              <UserIcon size={22} />
            </button>
          )}

          <button
            className="text-foreground md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Menü"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-3 md:hidden">
          {[
            { href: "/", label: "Ana Sayfa" },
            { href: "/ilanlar", label: "İlanlar" },
            { href: "/talepler", label: "Talepler" },
            { href: "/duyuru-panosu", label: "Duyuru Panosu" },
            { href: "/topluluk", label: "Topluluk" },
            { href: "/iletisim", label: "İletişim" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={() => {
              setMobileOpen(false);
              goToAuthGatedRoute("/favoriler");
            }}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Heart size={18} />
            Favorilerim
          </button>

          {hasToken && (
            <button
              onClick={() => {
                setMobileOpen(false);
                router.push("/mesajlar");
              }}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MessageSquare size={18} />
              Mesajlar
            </button>
          )}

          {hasToken ? (
            <button
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
              className="rounded-md px-2 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Çıkış Yap
            </button>
          ) : (
            <Link
              href="/giris-yap"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-semibold text-brand hover:opacity-80"
            >
              Giriş Yap / Kayıt Ol
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
