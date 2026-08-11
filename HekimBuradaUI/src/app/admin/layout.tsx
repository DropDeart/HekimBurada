"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminSidebar, LINKS } from "@/components/layout/AdminSidebar";
import { ADMIN_ROLES, auth } from "@/lib/auth";

/** pathname'e karşılık gelen LINKS girdisini bulur (en uzun/en spesifik eşleşen href — örn.
 * /admin/urunler/abc-123, "/admin" değil "/admin/urunler" girdisiyle eşleşmeli). */
function findRouteGuard(pathname: string) {
  const candidates = LINKS.filter(
    (l) => pathname === l.href || (l.href !== "/admin" && pathname.startsWith(`${l.href}/`))
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.href.length > a.href.length ? b : a));
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[] | null>(null);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) {
      router.push("/giris-yap");
      return;
    }
    const userRoles = auth.getRoles();
    if (!ADMIN_ROLES.some((r) => userRoles.includes(r))) {
      router.push("/");
      return;
    }
    // Menüde gizlenen bir sayfaya (RegionAdmin için örn. /admin/urunler) doğrudan URL ile
    // girilmesini de engelle — sidebar sadece görünürlüğü, bu ise gerçek erişimi kapatır.
    const guard = findRouteGuard(pathname);
    if (guard && !guard.roles.some((r) => userRoles.includes(r))) {
      router.replace("/admin");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta bir kere token/rol kontrolü; useSyncExternalStore'un SSR-uyum için zorunlu "false" ilk render'ı burada sahte /giris-yap yönlendirmesine yol açıyordu (E2E testte yakalandı)
    setRoles(userRoles);
  }, [router, pathname]);

  if (roles === null) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar roles={roles} />
      <main className="flex-1 bg-background p-6">{children}</main>
    </div>
  );
}
