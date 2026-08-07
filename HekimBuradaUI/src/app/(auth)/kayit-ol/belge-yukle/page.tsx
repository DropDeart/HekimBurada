"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Dropzone } from "@/components/upload/Dropzone";
import { Button } from "@/components/ui/button";
import { identityApi, type DoctorProfile } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function BelgeYuklePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const data = await identityApi.doctorProfile();
      setProfile(data);
      if (data.verificationStatus === "approved") {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil bilgisi alınamadı.");
    } finally {
      setLoadingProfile(false);
    }
  }, [router]);

  useEffect(() => {
    if (!auth.getToken()) {
      router.push("/giris-yap");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni); projede henüz data-fetching kütüphanesi yok
    void loadProfile();
  }, [router, loadProfile]);

  const submit = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await identityApi.uploadVerificationDocument(file);
      toast.success("Belge yüklendi, admin onayı bekleniyor.");
      setFile(null);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belge yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  if (loadingProfile) {
    return (
      <AuthShell heading="Doktorluk belgesi" subheading="Yükleniyor…">
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </AuthShell>
    );
  }

  if (!profile) {
    return (
      <AuthShell heading="Doktorluk belgesi" subheading="Bir sorun oluştu.">
        <p className="text-sm text-red-600">{error ?? "Profil bulunamadı."}</p>
      </AuthShell>
    );
  }

  // Belge yüklenmiş ve inceleme bekleniyor (henüz reddedilmedi) — bekleme ekranı.
  if (profile.hasDocument && profile.verificationStatus === "pending") {
    return (
      <AuthShell
        heading="Neredeyse tamam"
        subheading="HekimBurada, yalnızca doğrulanmış doktorların katılabildiği kapalı bir pazar yeridir."
      >
        <div className="mb-4 inline-block rounded-md bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
          İNCELENİYOR
        </div>
        <h2 className="mb-2 text-xl font-bold text-foreground">Belgeniz admin onayında</h2>
        <p className="text-sm text-muted-foreground">
          Doktorluk belgeniz yüklendi ve inceleme kuyruğuna alındı. Admin onayladığında
          hesabınız tam olarak aktif olacak — bu genellikle kısa sürede tamamlanır.
        </p>
      </AuthShell>
    );
  }

  const isRejected = profile.verificationStatus === "rejected";

  return (
    <AuthShell
      heading="Son bir adım kaldı"
      subheading="HekimBurada, yalnızca doğrulanmış doktorların katılabildiği kapalı bir pazar yeridir."
    >
      <h2 className="mb-1 text-xl font-bold text-foreground">Doktorluk belgesi yükleyin</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {profile.specialty} · {profile.diplomaNo} · {profile.region}
      </p>

      {isRejected && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
          Yüklediğiniz belge admin tarafından reddedildi. Lütfen yeni bir belge yükleyin.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>
      )}

      <Dropzone file={file} onFileChange={setFile} disabled={uploading} />

      <Button onClick={submit} disabled={!file || uploading} className="mt-4 w-full">
        {uploading ? "Yükleniyor…" : "Belgeyi Gönder"}
      </Button>
    </AuthShell>
  );
}
