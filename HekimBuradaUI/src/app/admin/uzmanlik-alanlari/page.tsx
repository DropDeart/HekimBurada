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
import { adminApi, specialtiesApi, type Specialty } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function UzmanlikAlanlariPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Specialty | null>(null);
  const canAdd = auth.getRoles().includes("SuperAdmin");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSpecialties(await specialtiesApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.addSpecialty(name);
      toast.success("Uzmanlık alanı eklendi.");
      setName("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (s: Specialty) => {
    setEditing(s);
    setEditName(s.name);
    setEditError(null);
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await adminApi.updateSpecialty(editing.id, editName);
      toast.success("Uzmanlık alanı güncellendi.");
      setEditing(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const remove = async (s: Specialty) => {
    setBusyId(s.id);
    try {
      await adminApi.deleteSpecialty(s.id);
      setSpecialties((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Uzmanlık alanı silindi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Uzmanlık Alanları</h1>
          <p className="text-sm text-muted-foreground">
            Kayıt formundaki uzmanlık alanı seçim listesi.
          </p>
        </div>

        {canAdd && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setError(null);
                setName("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>Yeni Ekle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Uzmanlık Alanı</DialogTitle>
              </DialogHeader>

              <form onSubmit={submit} className="flex flex-col gap-3">
                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    {error}
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="specialtyName">Ad</Label>
                  <Input
                    id="specialtyName"
                    placeholder="Örn. Enfeksiyon Hastalıkları ve Klinik Mikrobiyolojisi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={150}
                    autoFocus
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Ekleniyor…" : "Ekle"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              {canAdd && <TableHead>İşlemler</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : specialties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  Gösterilecek kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              specialties.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  {canAdd && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === s.id}
                          onClick={() => setDeleteTarget(s)}
                        >
                          Sil
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uzmanlık Alanını Düzenle</DialogTitle>
          </DialogHeader>

          <form onSubmit={submitEdit} className="flex flex-col gap-3">
            {editError && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{editError}</div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="editSpecialtyName">Ad</Label>
              <Input
                id="editSpecialtyName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={150}
                autoFocus
                required
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
            <AlertDialogTitle>Uzmanlık alanı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; silinecek. Bu alanı daha önce seçmiş doktorların
              profilinde değişiklik yapılmaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove(deleteTarget)}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
