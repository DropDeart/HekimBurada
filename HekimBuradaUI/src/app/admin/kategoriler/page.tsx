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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketplaceApi, type ListingKind, type MarketplaceCategory } from "@/lib/api";
import { CATEGORY_ICON_KEYS, CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  product: "Ürün (durum + fiyat + ödeme yöntemi)",
  big_ticket: "Büyük Değerli (konut/araba — sadece fiyat, elden teslim)",
  job: "İlan / İş (fiyatsız, düz ilan)",
};

export default function AdminKategorilerPage() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [listingKind, setListingKind] = useState<ListingKind>("product");
  const [icon, setIcon] = useState<string>(CATEGORY_ICON_KEYS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Kategoriler bir ağaç olarak gösteriliyor (üst/alt kategori ilişkisi) — sayfa sayfa gezinme bu
      // yapıyı bölerdi (bir alt kategori üst kategorisinden farklı bir sayfaya düşebilir). Bunun
      // yerine tamamını çekiyoruz; sunucu tarafı sayfa başına en fazla 100 kayıt döndürdüğünden
      // (bkz. PagedRequest.PageSize clamp) burada sayfalar arasında döngüyle topluyoruz.
      const all: MarketplaceCategory[] = [];
      let page = 1;
      while (true) {
        const res = await marketplaceApi.listCategories({ page, pageSize: 100 });
        all.push(...res.items);
        if (all.length >= res.totalCount || res.items.length === 0) break;
        page++;
      }
      setCategories(all);
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
    setSubmitting(true);
    try {
      await marketplaceApi.createCategory({ name, parentId: parentId || null, listingKind, icon });
      toast.success("Kategori eklendi.");
      setName("");
      setParentId("");
      setListingKind("product");
      setIcon(CATEGORY_ICON_KEYS[0]);
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await marketplaceApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi — alt kategorileri veya ilanları olabilir.");
    } finally {
      setBusyId(null);
    }
  };

  const topCategories = categories.filter((c) => !c.parentId);

  const orderedCategories = topCategories.flatMap((top) => [
    top,
    ...categories.filter((c) => c.parentId === top.id),
  ]);
  const orphanCategories = categories.filter((c) => !orderedCategories.includes(c));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Kategori Yönetimi</h1>
          <p className="text-sm text-muted-foreground">Ana ve alt kategorileri yönetin.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Yeni Kategori</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kategori</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="catName">Ad</Label>
                <Input id="catName" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label>Üst Kategori (opsiyonel)</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ana kategori olarak ekle" />
                  </SelectTrigger>
                  <SelectContent>
                    {topCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>İlan Türü</Label>
                <Select value={listingKind} onValueChange={(v) => setListingKind(v as ListingKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LISTING_KIND_LABELS) as ListingKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {LISTING_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>İkon</Label>
                <div className="grid grid-cols-8 gap-1.5">
                  {CATEGORY_ICON_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      aria-label={key}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border text-base",
                        icon === key
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-border bg-white text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <CategoryIcon icon={key} />
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Ekleniyor…" : "Ekle"}
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
              <TableHead>İkon</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>Üst Kategori</TableHead>
              <TableHead>İlan Türü</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : (
              [...orderedCategories, ...orphanCategories].map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground">
                    <CategoryIcon icon={c.icon} className="size-4" />
                  </TableCell>
                  <TableCell className={c.parentId ? "pl-8" : "font-semibold"}>{c.name}</TableCell>
                  <TableCell>{categories.find((p) => p.id === c.parentId)?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {LISTING_KIND_LABELS[c.listingKind] ?? c.listingKind}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === c.id}
                      onClick={() => remove(c.id)}
                    >
                      Sil
                    </Button>
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
