"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : specialties.length === 0 ? (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground">
                  Gösterilecek kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              specialties.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
