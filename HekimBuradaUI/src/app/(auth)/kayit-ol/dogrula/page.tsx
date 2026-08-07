"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { identityApi } from "@/lib/api";

const CODE_LENGTH = 6;
const CODE_LIFETIME_SECONDS = 5 * 60;

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function DogrulaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CODE_LIFETIME_SECONDS);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  if (!userId) {
    return (
      <AuthShell heading="Doğrulama" subheading="Geçersiz bağlantı.">
        <p className="text-sm text-muted-foreground">
          Doğrulama bağlantısı geçersiz.{" "}
          <Link href="/kayit-ol" className="font-semibold text-brand">
            Yeniden kayıt olun
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  const code = digits.join("");
  const isComplete = code.length === CODE_LENGTH;

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ""));
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await identityApi.verifyEmail(userId, code);
      toast.success("E-posta doğrulandı. Giriş sayfasına yönlendiriliyorsunuz…");
      setTimeout(() => router.push("/giris-yap"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Doğrulama başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      await identityApi.resendVerification(userId);
      setDigits(Array(CODE_LENGTH).fill(""));
      setSecondsLeft(CODE_LIFETIME_SECONDS);
      toast.success("Yeni kod gönderildi.");
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod gönderilemedi.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      heading="E-postanızı doğrulayın"
      subheading="HekimBurada, yalnızca doğrulanmış doktorların katılabildiği kapalı bir pazar yeridir."
    >
      <h2 className="mb-1 text-xl font-bold text-foreground">Doğrulama kodu</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {email ? (
          <>
            <span className="font-medium text-foreground">{email}</span> adresine gönderilen
            6 haneli kodu girin.
          </>
        ) : (
          "E-posta adresinize gönderilen 6 haneli kodu girin."
        )}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>
      )}

      <div className="mb-5 flex justify-between gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="h-14 w-12 rounded-lg border border-input text-center text-xl font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        ))}
      </div>

      <Button onClick={submit} disabled={!isComplete || loading} className="w-full">
        {loading ? "Doğrulanıyor…" : "Doğrula"}
      </Button>

      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{secondsLeft > 0 ? `Kodun süresi: ${formatTimer(secondsLeft)}` : "Kodun süresi doldu."}</span>
        <button
          type="button"
          onClick={resend}
          disabled={secondsLeft > 0 || resending}
          className="font-semibold text-brand hover:opacity-80 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
        >
          {resending ? "Gönderiliyor…" : "Kodu yeniden gönder"}
        </button>
      </div>
    </AuthShell>
  );
}

export default function DogrulaPage() {
  return (
    <Suspense fallback={null}>
      <DogrulaContent />
    </Suspense>
  );
}
