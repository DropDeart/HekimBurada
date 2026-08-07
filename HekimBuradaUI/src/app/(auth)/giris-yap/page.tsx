"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identityApi } from "@/lib/api";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

export default function GirisYapPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await identityApi.login(email, password);
      auth.setToken(token.access_token, rememberMe, token.refresh_token ?? null);
      toast.success("Giriş başarılı.");

      if (auth.isAdmin()) {
        router.push("/admin");
        return;
      }

      try {
        const profile = await identityApi.doctorProfile();
        router.push(profile.verificationStatus === "approved" ? "/" : "/kayit-ol/belge-yukle");
      } catch {
        // Sosyal girişle oluşmuş, henüz DoctorProfile'ı olmayan hesaplar için de belge yükleme adımına yönlendir.
        router.push("/kayit-ol/belge-yukle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="Meslektaşlar arası güvenilir 2. el alışveriş."
      subheading="HekimBurada, yalnızca doğrulanmış doktorların katılabildiği kapalı bir pazar yeridir."
    >
      <div className="mb-7 flex gap-6 border-b border-border">
        <span className="border-b-2 border-foreground pb-3 text-base font-semibold text-foreground">
          Giriş Yap
        </span>
        <Link
          href="/kayit-ol"
          className="pb-3 text-base font-semibold text-muted-foreground hover:text-foreground"
        >
          Kayıt Ol
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            placeholder="ornek@doktor.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Şifre</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          Beni Hatırla
        </label>

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Hesabın yok mu?{" "}
        <Link href="/kayit-ol" className="font-semibold text-brand hover:opacity-80">
          Kayıt ol
        </Link>
      </p>
    </AuthShell>
  );
}
