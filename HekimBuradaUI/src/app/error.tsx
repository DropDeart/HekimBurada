"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Sunucuya otomatik raporlama yok (bkz. proje kararı) — en azından tarayıcı konsoluna düşsün.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-lg font-bold text-foreground">
        Hekim<span className="text-brand">Burada</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Bir şeyler ters gitti</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsiniz.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={reset}>
          Tekrar Dene
        </Button>
        <Link href="/">
          <Button>Ana Sayfaya Dön</Button>
        </Link>
      </div>
    </div>
  );
}
