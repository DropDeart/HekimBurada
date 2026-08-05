"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identityApi } from "@/lib/api";

export default function KayitOlPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [diplomaNo, setDiplomaNo] = useState("");
  const [region, setRegion] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== password2) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (!acceptedTerms) {
      setError("Devam etmek için Kullanım Koşulları'nı kabul etmelisiniz.");
      return;
    }

    setLoading(true);
    try {
      const result = await identityApi.register({
        fullName,
        email,
        password,
        specialty,
        diplomaNo,
        region,
      });
      router.push(
        `/kayit-ol/dogrula?userId=${encodeURIComponent(result.userId)}&email=${encodeURIComponent(email)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
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
        <Link
          href="/giris-yap"
          className="pb-3 text-base font-semibold text-muted-foreground hover:text-foreground"
        >
          Giriş Yap
        </Link>
        <span className="border-b-2 border-foreground pb-3 text-base font-semibold text-foreground">
          Kayıt Ol
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="fullName">Ad Soyad</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="specialty">Uzmanlık Alanı</Label>
            <Input
              id="specialty"
              placeholder="Örn. Kardiyoloji"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="diplomaNo">Diploma / Tescil No</Label>
            <Input
              id="diplomaNo"
              value={diplomaNo}
              onChange={(e) => setDiplomaNo(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="region">Bölge</Label>
          <Input
            id="region"
            placeholder="Örn. Marmara"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password2">Şifre (tekrar)</Label>
          <Input
            id="password2"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="rounded-[10px] border border-dashed border-[#C9CFD2] bg-[#FAFBFB] p-4 text-center">
          <div className="mb-1 text-sm font-semibold text-foreground">
            Doktorluk Belgesi Yükleme
          </div>
          <div className="text-xs text-muted-foreground">
            E-postanızı doğruladıktan ve giriş yaptıktan sonra, hesabınızın admin onayına
            gönderilmesi için doktorluk belgenizi (JPEG/PNG) profilinizden yükleyeceksiniz.
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          <span>
            Kullanım Koşulları&apos;nı ve Aydınlatma Metni&apos;ni kabul ediyorum. Hesabım,
            e-posta doğrulaması ve admin onayı sonrasında aktif olacaktır.
          </span>
        </label>

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Oluşturuluyor…" : "Kayıt Ol ve Doğrulama Kodu Gönder"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Zaten hesabın var mı?{" "}
          <Link href="/giris-yap" className="font-semibold text-brand hover:opacity-80">
            Giriş yap
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
