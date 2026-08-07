"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ADMIN_ROLES, auth } from "@/lib/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta bir kere token/rol kontrolü; useSyncExternalStore'un SSR-uyum için zorunlu "false" ilk render'ı burada sahte /giris-yap yönlendirmesine yol açıyordu (E2E testte yakalandı)
    setRoles(userRoles);
  }, [router]);

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
