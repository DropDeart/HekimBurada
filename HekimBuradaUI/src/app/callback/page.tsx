"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IDENTITY_URL, identityApi } from "@/lib/api";
import { auth } from "@/lib/auth";
import { consumePkceState, consumeRememberFlag } from "@/lib/externalAuth";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setError("Giriş iptal edildi veya sağlayıcı tarafında başarısız oldu.");
        return;
      }
      if (!code) {
        setError("Geçersiz geri dönüş bağlantısı — kod bulunamadı.");
        return;
      }

      const pkce = consumePkceState(state);
      if (!pkce) {
        setError("Oturum doğrulanamadı, lütfen tekrar deneyin.");
        return;
      }
      const remember = consumeRememberFlag();

      try {
        const res = await fetch(`${IDENTITY_URL}/connect/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: "web",
            code,
            redirect_uri: pkce.redirectUri,
            code_verifier: pkce.verifier,
          }),
        });

        if (!res.ok) {
          throw new Error("token exchange failed");
        }

        const token = (await res.json()) as TokenResponse;
        auth.setToken(token.access_token, remember, token.refresh_token ?? null);

        if (auth.isAdmin()) {
          router.replace("/admin");
          return;
        }

        try {
          const profile = await identityApi.doctorProfile();
          router.replace(profile.verificationStatus === "approved" ? "/" : "/kayit-ol/belge-yukle");
        } catch {
          // Sosyal girişle oluşmuş, henüz DoctorProfile'ı olmayan hesaplar için de belge yükleme adımına yönlendir.
          router.replace("/kayit-ol/belge-yukle");
        }
      } catch {
        setError("Giriş tamamlanamadı, lütfen tekrar deneyin.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca mount'ta bir kez çalışmalı, kod tek kullanımlık
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {error ? (
        <div className="text-center">
          <p className="mb-3 text-sm text-red-700">{error}</p>
          <a href="/giris-yap" className="text-sm font-semibold text-brand hover:opacity-80">
            Giriş sayfasına dön
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Giriş yapılıyor…</p>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-6" />}>
      <CallbackInner />
    </Suspense>
  );
}
