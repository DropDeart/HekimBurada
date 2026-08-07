"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Home,
  LayoutGrid,
  LogOut,
  MessageSquareWarning,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  ShieldQuestion,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

const ALL_ADMIN_ROLES = ["Admin", "SuperAdmin", "RegionAdmin"];

const LINKS = [
  { href: "/admin", label: "Ana Sayfa", icon: Home, roles: ALL_ADMIN_ROLES },
  {
    href: "/admin/dogrulamalar",
    label: "Kullanıcı Doğrulama",
    icon: ShieldCheck,
    roles: ["SuperAdmin", "RegionAdmin"],
  },
  { href: "/admin/urunler", label: "Ürün Yönetimi", icon: Package, roles: ALL_ADMIN_ROLES },
  {
    href: "/admin/kategoriler",
    label: "Kategori Yönetimi",
    icon: LayoutGrid,
    roles: ALL_ADMIN_ROLES,
  },
  {
    href: "/admin/yorumlar",
    label: "Yorum Moderasyonu",
    icon: MessageSquareWarning,
    roles: ALL_ADMIN_ROLES,
  },
  { href: "/admin/duyurular", label: "Duyuru Yönetimi", icon: Megaphone, roles: ALL_ADMIN_ROLES },
  {
    href: "/admin/kurallar",
    label: "Kurallar ve Yetkiler",
    icon: ShieldQuestion,
    roles: ALL_ADMIN_ROLES,
  },
  {
    href: "/admin/kullanicilar",
    label: "Kullanıcı Yönetimi",
    icon: Users,
    roles: ["Admin"],
  },
  {
    href: "/admin/uzmanlik-alanlari",
    label: "Uzmanlık Alanları",
    icon: Stethoscope,
    roles: ["SuperAdmin"],
  },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings, roles: ALL_ADMIN_ROLES },
];

export function AdminSidebar({ roles }: { roles: string[] }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border p-4 text-lg font-bold text-foreground">
        Hekim<span className="text-brand">Burada</span>{" "}
        <span className="text-sm font-normal text-muted-foreground">Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {LINKS.filter((link) => link.roles.some((r) => roles.includes(r))).map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
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

      <div className="flex flex-col gap-1 border-t border-border p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftRight size={18} />
          Siteye Dön
        </Link>
        <button
          onClick={() => {
            auth.clearToken();
            router.push("/giris-yap");
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut size={18} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
