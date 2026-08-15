"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Heart, Menu, Search, User as UserIcon, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_ROLES, auth, useAuthRoles, useHasToken } from "@/lib/auth";
import {
  communityApi,
  GATEWAY_URL,
  gatewayApi,
  identityApi,
  marketplaceApi,
  type Announcement,
  type CommunityCategory,
  type MarketplaceCategory,
  type MarketplaceRequest,
  type MenuItem,
  type Membership,
  type Offer,
} from "@/lib/api";
import { CONTACT_COLUMNS } from "@/lib/staticContent";
import { MegaMenu } from "./MegaMenu";
import { cn } from "@/lib/utils";

/** 5'ten fazla alt kategorisi olan bir grup, mega-menüde tek uzun sütun yerine 2 sütuna yayılır. */
const WIDE_SUBCATEGORY_THRESHOLD = 5;

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [communityCategories, setCommunityCategories] = useState<CommunityCategory[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isVerifiedDoctor, setIsVerifiedDoctor] = useState(false);
  const [navLinks, setNavLinks] = useState<MenuItem[]>(FALLBACK_NAV_LINKS);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Duyuru panosu/navbar banner'ı login öncesi de görünür — anonim, hasToken'a bağlı değil.
    gatewayApi
      .listAnnouncements({ pageSize: 5 })
      .then((r) => setAnnouncements([...r.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))))
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

  useEffect(() => {
    if (!hasToken) return;
    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items))
      .catch(() => {});
    marketplaceApi
      .listRequests({ pageSize: 5 })
      .then((r) => setRequests(r.items.slice(0, 3)))
      .catch(() => {});
    communityApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCommunityCategories(r.items))
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
  }, [hasToken]);

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
    setSearchOpen(false);
    setSearchQuery("");
  };

  const topCategories = categories.filter((c) => !c.parentId);
  const subCategoriesOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);
  const memberCountOf = (categoryId: string) =>
    memberships.filter((m) => m.categoryId === categoryId).length;

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
              // eslint-disable-next-line @next/next/no-img-element -- admin panelden yüklenen keyfi harici görsel
              <img src={`${GATEWAY_URL}${logoUrl}`} alt="HekimBurada" className="h-11 w-auto" />
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
                hasToken ? (
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
                  <p className="min-w-[200px] text-xs text-muted-foreground">
                    Görüntülemek için giriş yapın.
                  </p>
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
                          <div key={req.id} className="border-t border-[#F0F2F3] py-1.5">
                            <div className="text-xs font-semibold text-foreground">{req.title}</div>
                          </div>
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
                  <p className="min-w-[200px] text-xs text-muted-foreground">
                    Görüntülemek için giriş yapın.
                  </p>
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
                    <div className="mb-2.5 text-xs font-bold text-foreground">Branş Toplulukları</div>
                    {communityCategories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Henüz topluluk yok.</p>
                    ) : (
                      communityCategories.map((c) => (
                        <div
                          key={c.id}
                          className="flex justify-between border-t border-[#F0F2F3] py-1.5 text-xs"
                        >
                          <span className="font-semibold text-foreground">{c.name}</span>
                          <span className="text-muted-foreground">{memberCountOf(c.id)} üye</span>
                        </div>
                      ))
                    )}
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Kayıttaki branşınıza göre otomatik eklenirsiniz.
                    </p>
                  </div>
                ) : (
                  <p className="min-w-[200px] text-xs text-muted-foreground">
                    Görüntülemek için giriş yapın.
                  </p>
                )
              }
            />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center sm:flex">
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                searchOpen ? "mr-2 w-44" : "w-0"
              )}
            >
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                placeholder="İlan ara..."
                className="w-full rounded-lg border border-input px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
              />
            </div>
            <button
              onClick={() => {
                setSearchOpen((v) => {
                  const next = !v;
                  if (next) setTimeout(() => searchInputRef.current?.focus(), 0);
                  return next;
                });
              }}
              className="text-foreground hover:text-brand"
              aria-label="İlanlarda ara"
            >
              <Search size={20} />
            </button>
          </div>

          <button
            onClick={() => goToAuthGatedRoute("/favoriler")}
            className="hidden text-foreground hover:text-brand sm:block"
            aria-label="Favorilerim"
          >
            <Heart size={20} />
          </button>

          {hasToken && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative hidden text-foreground hover:text-brand sm:block"
                  aria-label="Bildirimler"
                >
                  <Bell size={20} />
                  {pendingOffers.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {pendingOffers.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[260px]">
                <div className="px-2.5 py-1.5 text-xs font-bold text-foreground">
                  Yeni Teklifler
                </div>
                {pendingOffers.length === 0 ? (
                  <p className="px-2.5 py-1.5 text-xs text-muted-foreground">
                    Bekleyen teklif yok.
                  </p>
                ) : (
                  pendingOffers.map((o) => (
                    <DropdownMenuItem key={o.id} asChild>
                      <Link href={`/ilanlar/${o.listingId}`}>
                        {o.amount.toLocaleString("tr-TR")} ₺ teklif
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
