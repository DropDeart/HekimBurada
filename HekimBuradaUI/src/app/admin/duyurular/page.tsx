"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { gatewayApi, type Announcement } from "@/lib/api";

const PAGE_SIZE = 100;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

interface FormState {
  title: string;
  body: string;
  publishedAt: Date | undefined;
}

function emptyForm(): FormState {
  return { title: "", body: "", publishedAt: new Date() };
}

export default function AdminDuyurularPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gatewayApi.listAnnouncements({ pageSize: PAGE_SIZE });
      setAnnouncements([...res.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
      setTotalCount(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duyurular alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.publishedAt) {
      setCreateError("Yayın tarihi gerekli.");
      return;
    }
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await gatewayApi.createAnnouncement({
        title: createForm.title.trim(),
        body: createForm.body.trim(),
        publishedAt: createForm.publishedAt.toISOString(),
      });
      toast.success("Duyuru eklendi.");
      setCreateOpen(false);
      setCreateForm(emptyForm());
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Duyuru eklenemedi.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const startEdit = (a: Announcement) => {
    setEditing(a);
    setEditForm({ title: a.title, body: a.body, publishedAt: new Date(a.publishedAt) });
    setEditError(null);
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.publishedAt) {
      setEditError("Yayın tarihi gerekli.");
      return;
    }
    setEditError(null);
    setEditSubmitting(true);
    try {
      await gatewayApi.updateAnnouncement(editing.id, {
        title: editForm.title.trim(),
        body: editForm.body.trim(),
        publishedAt: editForm.publishedAt.toISOString(),
        authorId: editing.authorId,
      });
      toast.success("Duyuru güncellendi.");
      setEditing(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Duyuru güncellenemedi.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await gatewayApi.deleteAnnouncement(deleteTarget.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Duyuru silindi.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duyuru silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold text-foreground">Duyuru Yönetimi</h1>
          <p className="text-sm text-muted-foreground">
            Duyuru panosuna ve navbar&apos;a yeni duyuru ekleyin veya mevcutları düzenleyin.
          </p>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(next) => {
            setCreateOpen(next);
            if (!next) {
              setCreateError(null);
              setCreateForm(emptyForm());
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>Yeni Duyuru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Duyuru</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="flex flex-col gap-3">
              {createError && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{createError}</div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="createTitle">Başlık</Label>
                <Input
                  id="createTitle"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="createBody">İçerik</Label>
                <Textarea
                  id="createBody"
                  value={createForm.body}
                  onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Yayın Tarihi</Label>
                <DatePicker
                  value={createForm.publishedAt}
                  onChange={(date) => setCreateForm((f) => ({ ...f, publishedAt: date }))}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSubmitting}>
                  {createSubmitting ? "Ekleniyor…" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Yayın Tarihi</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Gösterilecek duyuru yok.
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{formatDate(a.publishedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === a.id}
                        onClick={() => setDeleteTarget(a)}
                      >
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && totalCount > announcements.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          {announcements.length} / {totalCount} duyuru gösteriliyor.
        </p>
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duyuruyu Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-3">
            {editError && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{editError}</div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="editTitle">Başlık</Label>
              <Input
                id="editTitle"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={200}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="editBody">İçerik</Label>
              <Textarea
                id="editBody"
                value={editForm.body}
                onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Yayın Tarihi</Label>
              <DatePicker
                value={editForm.publishedAt}
                onChange={(date) => setEditForm((f) => ({ ...f, publishedAt: date }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duyuru silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; kalıcı olarak silinecek ve duyuru panosu/navbar&apos;dan
              kaldırılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
