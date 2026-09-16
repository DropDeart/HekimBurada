"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gatewayApi, type ContactMessage, type ContactMessageStatus } from "@/lib/api";

const PAGE_SIZE = 20;
const STATUSES: ContactMessageStatus[] = ["Yeni", "İnceleniyor", "Çözüldü"];
const FILTERS = ["Tümü", ...STATUSES] as const;

export default function AdminDestekTalepleriPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tümü");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gatewayApi.listContactMessages({
        page,
        pageSize: PAGE_SIZE,
        status: filter === "Tümü" ? undefined : filter,
      });
      setMessages(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/sayfa-filtre değişince veri çekme
    void load();
  }, [load]);

  const changeStatus = async (message: ContactMessage, status: ContactMessageStatus) => {
    setBusyId(message.id);
    try {
      await gatewayApi.updateContactMessageStatus(message.id, status);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Durum güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setBusyId(id);
    try {
      await gatewayApi.deleteContactMessage(id);
      setDeleteTarget(null);
      if (messages.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground">Destek Talepleri</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        İletişim formundan gelen mesajları görüntüleyin, durumlarını güncelleyin.
      </p>

      <div className="mb-4 inline-flex gap-0.5 rounded-lg bg-secondary p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={
              "h-8 rounded-md px-3 text-xs font-medium " +
              (filter === f ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Mesaj</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Gösterilecek talep yok.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>
                    <a href={`mailto:${m.email}`} className="text-brand hover:underline">
                      {m.email}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{m.body}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.status}
                      onValueChange={(v) => void changeStatus(m, v as ContactMessageStatus)}
                      disabled={busyId === m.id}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === m.id}
                      onClick={() => setDeleteTarget(m)}
                    >
                      Kaldır
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        page={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        disabled={loading}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destek talebi kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; kişisinden gelen mesaj kalıcı olarak kaldırılacak. Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
