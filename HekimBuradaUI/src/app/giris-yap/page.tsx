"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identityApi } from "@/lib/api";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

export default function GirisYapPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await identityApi.login(email, password);
      auth.setToken(token.access_token);
      toast.success("Giriş başarılı.");

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
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

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
