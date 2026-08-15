"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FaGoogle, FaFacebook, FaGithub, FaApple } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { identityApi } from "@/lib/api";
import { startExternalLogin } from "@/lib/externalAuth";

const PROVIDER_ICONS: Record<string, ReactNode> = {
  google: <FaGoogle />,
  facebook: <FaFacebook />,
  github: <FaGithub />,
  apple: <FaApple />,
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google ile devam et",
  facebook: "Facebook ile devam et",
  github: "GitHub ile devam et",
  apple: "Apple ile devam et",
  microsoft: "Microsoft ile devam et",
};

/**
 * Identity'de config'te ClientId'si dolu olan (aktif) dış sağlayıcıları listeler, her biri için
 * bir buton render eder. Hiç aktif sağlayıcı yoksa (henüz hiçbiri bağlanmadıysa) hiçbir şey
 * render etmez — giriş/kayıt sayfalarında boş bir bölüm görünmesin diye.
 */
export function SocialLoginButtons({ remember = true }: { remember?: boolean }) {
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    identityApi.providers().then(setProviders).catch(() => {});
  }, []);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        veya
        <div className="h-px flex-1 bg-border" />
      </div>

      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-center gap-2"
          onClick={() => {
            void startExternalLogin(provider, remember);
          }}
        >
          {PROVIDER_ICONS[provider.toLowerCase()]}
          {PROVIDER_LABELS[provider.toLowerCase()] ?? `${provider} ile devam et`}
        </Button>
      ))}
    </div>
  );
}
