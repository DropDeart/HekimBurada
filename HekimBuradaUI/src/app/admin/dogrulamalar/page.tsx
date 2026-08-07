"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, adminApi, type VerificationRow, type VerificationStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_TABS: { label: string; value: VerificationStatus | "all" }[] = [
  { label: "Bekleyen", value: "pending" },
  { label: "Onaylanan", value: "approved" },
  { label: "Reddedilen", value: "rejected" },
  { label: "Tümü", value: "all" },
];

const STATUS_BADGE: Record<VerificationStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-brand-soft text-brand",
  rejected: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function DogrulamalarPage() {
  const [status, setStatus] = useState<VerificationStatus | "all">("pending");
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listVerifications(status === "all" ? undefined : status);
      setRows(data);
    } catch (err) {
      // 403: bölgesi tanımlı olmayan bir RegionAdmin için backend erişimi reddediyor —
      // bunu hata olarak göstermek yerine sessizce boş liste gösteriyoruz.
      if (err instanceof ApiError && err.status === 403) {
        setRows([]);
      } else {
        toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/filtre değişince veri çekme (React'in "Fetching data" deseni); projede henüz data-fetching kütüphanesi yok
    void load();
  }, [load]);

  const approve = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await adminApi.approveVerification(userId);
      toast.success("Doktor onaylandı.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onaylanamadı.");
    } finally {
      setBusyUserId(null);
    }
  };

  const reject = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await adminApi.rejectVerification(userId);
      toast.success("Kayıt reddedildi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reddedilemedi.");
    } finally {
      setBusyUserId(null);
    }
  };

  const viewDocument = async (userId: string) => {
    try {
      const blob = await adminApi.verificationDocumentBlob(userId);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Belge açılamadı.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Doğrulama Kuyruğu</h1>
        <p className="text-sm text-muted-foreground">
          Doktorluk belgesi yüklenen kayıtları inceleyip onaylayın veya reddedin.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={status === tab.value ? "default" : "outline"}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-posta</TableHead>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Uzmanlık</TableHead>
              <TableHead>Diploma No</TableHead>
              <TableHead>Bölge</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Belge</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Gösterilecek kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.fullName ?? "—"}</TableCell>
                  <TableCell>{row.specialty}</TableCell>
                  <TableCell>{row.diplomaNo}</TableCell>
                  <TableCell>{row.region}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold",
                        STATUS_BADGE[row.verificationStatus]
                      )}
                    >
                      {STATUS_LABEL[row.verificationStatus]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.hasDocument ? (
                      <button
                        onClick={() => viewDocument(row.userId)}
                        className="text-xs font-semibold text-brand hover:opacity-80"
                      >
                        Görüntüle
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Yok</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.verificationStatus === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!row.hasDocument || busyUserId === row.userId}
                          onClick={() => approve(row.userId)}
                        >
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyUserId === row.userId}
                          onClick={() => reject(row.userId)}
                        >
                          Reddet
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
