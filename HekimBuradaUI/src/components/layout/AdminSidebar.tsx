"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  MessageSquareWarning,
  Megaphone,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldQuestion,
  Stethoscope,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

const ALL_ADMIN_ROLES = ["Admin", "SuperAdmin", "RegionAdmin"];
// RegionAdmin'in tek görevi kendi bölgesindeki doktor doğrulama kuyruğu (bkz. Identity/Data/SeedData.cs
// RegionAdminRole doc yorumu) — ürün/kategori/yorum/duyuru/kural/ayar yönetiminde yetkisi yok.
const STAFF_ADMIN_ROLES = ["Admin", "SuperAdmin"];

/** Route -> izinli roller eşlemesi. admin/layout.tsx'teki sayfa seviyesi erişim koruması da bunu
 * okur, böylece "menüde gizli ama URL'den erişilebilir" tutarsızlığı oluşmaz. */
export const LINKS = [
  { href: "/admin", label: "Ana Sayfa", icon: Home, roles: ALL_ADMIN_ROLES },
  {
    href: "/admin/dogrulamalar",
    label: "Kullanıcı Doğrulama",
    icon: ShieldCheck,
    roles: ["SuperAdmin", "RegionAdmin"],
  },
  { href: "/admin/urunler", label: "Ürün Yönetimi", icon: Package, roles: STAFF_ADMIN_ROLES },
  {
    href: "/admin/kategoriler",
    label: "Kategori Yönetimi",
    icon: LayoutGrid,
    roles: STAFF_ADMIN_ROLES,
  },
  {
    href: "/admin/yorumlar",
    label: "Yorum Moderasyonu",
    icon: MessageSquareWarning,
    roles: STAFF_ADMIN_ROLES,
  },
  { href: "/admin/duyurular", label: "Duyuru Yönetimi", icon: Megaphone, roles: STAFF_ADMIN_ROLES },
  { href: "/admin/destek-talepleri", label: "Destek Talepleri", icon: Mail, roles: STAFF_ADMIN_ROLES },
  {
    href: "/admin/kurallar",
    label: "Kurallar ve Yetkiler",
    icon: ShieldQuestion,
    roles: STAFF_ADMIN_ROLES,
  },
  {
    href: "/admin/kullanicilar",
    label: "Kullanıcı Yönetimi",
    icon: Users,
    roles: STAFF_ADMIN_ROLES,
  },
  {
    href: "/admin/uzmanlik-alanlari",
    label: "Uzmanlık Alanları",
    icon: Stethoscope,
    roles: ["SuperAdmin"],
  },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings, roles: STAFF_ADMIN_ROLES },
  {
    href: "/admin/loglar",
    label: "Sistem Logları",
    icon: ScrollText,
    roles: ["SuperAdmin"],
  },
];

export function AdminSidebar({ roles }: { roles: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    auth.clearToken();
    router.push("/giris-yap");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {LINKS.filter((link) => link.roles.some((r) => roles.includes(r))).map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={18} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-1 border-t border-border p-4">
      <Link
        href="/"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeftRight size={18} />
        Siteye Dön
      </Link>
      <button
        onClick={() => {
          setMobileOpen(false);
          logout();
        }}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut size={18} />
        Çıkış Yap
      </button>
    </div>
  );

  return (
    <>
      {/* Mobil/tablet (lg altı) — sabit sidebar yerine üst bar + sağdan kayan menü. Önceden
          sidebar hiçbir breakpoint'te gizlenmiyordu, w-64 sabit genişliğiyle dar ekranda
          içeriği neredeyse tamamen ekran dışına itiyordu. */}
      <header className="flex items-center justify-between border-b border-border bg-white p-4 lg:hidden">
        <div className="text-base font-bold text-foreground">
          Hekim<span className="text-brand">Burada</span>{" "}
          <span className="text-sm font-normal text-muted-foreground">Admin</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button aria-label="Admin menüsü" className="rounded-md p-1.5 text-foreground hover:bg-muted">
              <Menu size={22} />
            </button>
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle>Admin Menüsü</SheetTitle>
            </SheetHeader>
            {nav}
            {footer}
          </SheetContent>
        </Sheet>
      </header>

      {/* Masaüstü (lg+) — sabit sol sidebar. */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-white lg:flex">
        <div className="border-b border-border p-4 text-lg font-bold text-foreground">
          Hekim<span className="text-brand">Burada</span>{" "}
          <span className="text-sm font-normal text-muted-foreground">Admin</span>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
