"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { marketplaceApi, type MarketplaceCategory } from "@/lib/api";
import { auth, useHasToken } from "@/lib/auth";

export default function TalepVerPage() {
  const router = useRouter();
  const hasToken = useHasToken();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasToken) return;
    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items))
      .catch(() => {});
  }, [hasToken]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const userId = auth.getUserId();
    if (!userId) return;
    setSubmitting(true);
    try {
      await marketplaceApi.createRequest({
        title,
        description,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        categoryId,
        requesterId: userId,
      });
      toast.success("Talebiniz yayınlandı.");
      router.push("/talepler");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Talep oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Talep Oluştur</h1>
        <p className="text-sm text-muted-foreground">Talep oluşturmak için giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="mb-6 text-xl font-bold text-foreground">Talep Oluştur</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="title">Talep Başlığı</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn. Kullanılmış otoskop arıyorum"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="description">Açıklama</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[90px] w-full rounded-lg border border-input p-2.5 text-sm outline-none"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="category">Kategori</Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="budgetMax">Bütçe (opsiyonel)</Label>
          <Input
            id="budgetMax"
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="₺"
          />
        </div>
        <Button type="submit" disabled={submitting || !categoryId} className="mt-1 w-full">
          {submitting ? "Yayınlanıyor…" : "Talebi Yayınla"}
        </Button>
      </form>
    </div>
  );
}
