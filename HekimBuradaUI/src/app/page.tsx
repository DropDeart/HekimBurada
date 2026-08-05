"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default function Home() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(Boolean(auth.getToken()));
  }, []);

  if (hasToken === null) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <h1 className="text-2xl font-bold text-foreground">HekimBurada</h1>
      {hasToken ? (
        <>
          <p className="text-sm text-muted-foreground">
            Giriş yapıldı. Pazaryeri/topluluk sayfaları henüz yapım aşamasında.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              auth.clearToken();
              window.location.reload();
            }}
          >
            Çıkış yap
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Doktorlara özel 2. el pazaryeri ve topluluk platformu.
          </p>
          <Link href="/giris-yap">
            <Button>Giriş yap / Kayıt ol</Button>
          </Link>
        </>
      )}
    </main>
  );
}
