"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  GATEWAY_URL,
  gatewayApi,
  type CarouselSlide,
  type MenuItem,
  type MenuItemLocation,
  type SiteSettings,
} from "@/lib/api";

export default function AdminAyarlarPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground">Ayarlar</h1>
      <p className="mb-5 max-w-lg text-sm text-muted-foreground">
        Logo, favicon, SEO, header/footer menüleri ve anasayfa carousel&apos;ini yönetin.
      </p>

      <Tabs defaultValue="genel">
        <TabsList>
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="header">Header Menü</TabsTrigger>
          <TabsTrigger value="footer">Footer Menü</TabsTrigger>
          <TabsTrigger value="carousel">Carousel</TabsTrigger>
        </TabsList>

        <TabsContent value="genel" className="mt-4">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="header" className="mt-4">
          <MenuItemsSection location="header" title="Header Linkleri" urlMode="existing-pages" />
        </TabsContent>

        <TabsContent value="footer" className="mt-4 flex flex-col gap-6">
          <MenuItemsSection location="footer_platform" title="Platform Sütunu" />
          <MenuItemsSection location="footer_rules" title="Kurallar Sütunu" />
        </TabsContent>

        <TabsContent value="carousel" className="mt-4">
          <CarouselTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const emptySettings: SiteSettings = {
  logoUrl: null,
  faviconUrl: null,
  gaMeasurementId: null,
  defaultMetaTitle: null,
  defaultMetaDescription: null,
};

function GeneralTab() {
  const [form, setForm] = useState<SiteSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gatewayApi.getSiteSettings();
      setForm(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ayarlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await gatewayApi.uploadImage(file, "site");
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo yüklenemedi.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadFavicon = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const url = await gatewayApi.uploadImage(file, "site");
      setForm((f) => ({ ...f, faviconUrl: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Favicon yüklenemedi.");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await gatewayApi.updateSiteSettings(form);
      setForm(saved);
      toast.success("Ayarlar kaydedildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }

  return (
    <form onSubmit={save} className="flex max-w-xl flex-col gap-5">
      <div className="grid gap-1.5">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin panelde yüklenen keyfi harici görsel, next/image optimizasyonuna gerek yok
            <img src={`${GATEWAY_URL}${form.logoUrl}`} alt="Logo" className="h-10 rounded border border-border bg-white p-1" />
          ) : (
            <div className="flex h-10 w-20 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
              Yok
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLogo(file);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()}>
            {uploadingLogo ? "Yükleniyor…" : "Görsel Seç"}
          </Button>
          {form.logoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}>
              Kaldır
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Favicon</Label>
        <div className="flex items-center gap-3">
          {form.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin panelde yüklenen keyfi harici görsel, next/image optimizasyonuna gerek yok
            <img src={`${GATEWAY_URL}${form.faviconUrl}`} alt="Favicon" className="h-8 w-8 rounded border border-border bg-white p-1" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-border text-[9px] text-muted-foreground">
              Yok
            </div>
          )}
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,.ico"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFavicon(file);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploadingFavicon} onClick={() => faviconInputRef.current?.click()}>
            {uploadingFavicon ? "Yükleniyor…" : "Görsel Seç"}
          </Button>
          {form.faviconUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, faviconUrl: null }))}>
              Kaldır
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="gaId">Google Analytics Measurement ID</Label>
        <Input
          id="gaId"
          placeholder="G-XXXXXXXXXX"
          value={form.gaMeasurementId ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, gaMeasurementId: e.target.value || null }))}
        />
        <p className="text-xs text-muted-foreground">Boş bırakılırsa siteye GA script&apos;i eklenmez.</p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="metaTitle">Varsayılan Meta Title</Label>
        <Input
          id="metaTitle"
          maxLength={200}
          placeholder="HekimBurada"
          value={form.defaultMetaTitle ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, defaultMetaTitle: e.target.value || null }))}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="metaDescription">Varsayılan Meta Description</Label>
        <Textarea
          id="metaDescription"
          maxLength={500}
          value={form.defaultMetaDescription ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, defaultMetaDescription: e.target.value || null }))}
        />
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

const LOCATION_LABELS: Record<MenuItemLocation, string> = {
  header: "Header",
  footer_platform: "Footer — Platform",
  footer_rules: "Footer — Kurallar",
};

/** Header menüsünde yönetim kolaylığı ve bozuk link riskini önlemek için serbest URL yerine sitenin
 * gerçek sayfalarından seçilir — alt menü/özel URL yönetimi kasıtlı olarak desteklenmiyor. */
const SITE_PAGES: { label: string; url: string }[] = [
  { label: "Ana Sayfa", url: "/" },
  { label: "İlanlar", url: "/ilanlar" },
  { label: "İlan Ver", url: "/ilan-ver" },
  { label: "Talepler", url: "/talepler" },
  { label: "Talep Ver", url: "/talep-ver" },
  { label: "Duyuru Panosu", url: "/duyuru-panosu" },
  { label: "Topluluk", url: "/topluluk" },
  { label: "Hakkımızda", url: "/hakkimizda" },
  { label: "İletişim", url: "/iletisim" },
  { label: "Kullanım Koşulları", url: "/kullanim-kosullari" },
  { label: "Gizlilik Politikası", url: "/gizlilik-politikasi" },
  { label: "Doğrulama Süreci", url: "/dogrulama-sureci" },
];

interface MenuItemFormState {
  label: string;
  url: string;
  sortOrder: number;
}

function emptyMenuItemForm(): MenuItemFormState {
  return { label: "", url: "", sortOrder: 0 };
}

function MenuItemsSection({
  location,
  title,
  urlMode = "free-text",
}: {
  location: MenuItemLocation;
  title: string;
  urlMode?: "existing-pages" | "free-text";
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<MenuItemFormState>(emptyMenuItemForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<MenuItemFormState>(emptyMenuItemForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gatewayApi.listMenuItems({ location });
      setItems(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Menü linkleri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/location değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.url) {
      toast.error("URL gerekli.");
      return;
    }
    setCreateSubmitting(true);
    try {
      await gatewayApi.createMenuItem({ location, label: createForm.label.trim(), url: createForm.url.trim(), sortOrder: createForm.sortOrder });
      toast.success("Link eklendi.");
      setCreateOpen(false);
      setCreateForm(emptyMenuItemForm());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link eklenemedi.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const startEdit = (item: MenuItem) => {
    setEditing(item);
    setEditForm({ label: item.label, url: item.url, sortOrder: item.sortOrder });
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.url) {
      toast.error("URL gerekli.");
      return;
    }
    setEditSubmitting(true);
    try {
      await gatewayApi.updateMenuItem(editing.id, {
        location,
        label: editForm.label.trim(),
        url: editForm.url.trim(),
        sortOrder: editForm.sortOrder,
      });
      toast.success("Link güncellendi.");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link güncellenemedi.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await gatewayApi.deleteMenuItem(deleteTarget.id);
      toast.success("Link silindi.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <Dialog open={createOpen} onOpenChange={(next) => { setCreateOpen(next); if (!next) setCreateForm(emptyMenuItemForm()); }}>
          <DialogTrigger asChild>
            <Button size="sm">Link Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{LOCATION_LABELS[location]} — Yeni Link</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`create-label-${location}`}>Etiket</Label>
                <Input
                  id={`create-label-${location}`}
                  value={createForm.label}
                  onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                  maxLength={100}
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`create-url-${location}`}>URL</Label>
                {urlMode === "existing-pages" ? (
                  <Select value={createForm.url} onValueChange={(v) => setCreateForm((f) => ({ ...f, url: v }))}>
                    <SelectTrigger id={`create-url-${location}`}>
                      <SelectValue placeholder="Bir sayfa seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_PAGES.map((p) => (
                        <SelectItem key={p.url} value={p.url}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`create-url-${location}`}
                    value={createForm.url}
                    onChange={(e) => setCreateForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="/kampanyalar"
                    required
                  />
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`create-sort-${location}`}>Sıra</Label>
                <Input
                  id={`create-sort-${location}`}
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
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
              <TableHead>Etiket</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Sıra</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  Henüz link eklenmedi.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-muted-foreground">{item.url}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                        Düzenle
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busyId === item.id} onClick={() => setDeleteTarget(item)}>
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

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Linki Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`edit-label-${location}`}>Etiket</Label>
              <Input
                id={`edit-label-${location}`}
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                maxLength={100}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`edit-url-${location}`}>URL</Label>
              {urlMode === "existing-pages" ? (
                <Select value={editForm.url} onValueChange={(v) => setEditForm((f) => ({ ...f, url: v }))}>
                  <SelectTrigger id={`edit-url-${location}`}>
                    <SelectValue placeholder="Bir sayfa seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_PAGES.map((p) => (
                      <SelectItem key={p.url} value={p.url}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`edit-url-${location}`}
                  value={editForm.url}
                  onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                  required
                />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`edit-sort-${location}`}>Sıra</Label>
              <Input
                id={`edit-sort-${location}`}
                type="number"
                value={editForm.sortOrder}
                onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
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
            <AlertDialogTitle>Link silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.label}&quot; menüden kaldırılacak.
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

interface SlideFormState {
  eyebrow: string;
  title: string;
  description: string;
  linkUrl: string;
  buttonLabel: string;
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const DEFAULT_SLIDE_BACKGROUND = "#141718";

function emptySlideForm(): SlideFormState {
  return {
    eyebrow: "",
    title: "",
    description: "",
    linkUrl: "",
    buttonLabel: "",
    backgroundType: "color",
    backgroundColor: DEFAULT_SLIDE_BACKGROUND,
    backgroundImageUrl: "",
    sortOrder: 0,
    isActive: true,
  };
}

function CarouselTab() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SlideFormState>(emptySlideForm);
  const [createBgUploading, setCreateBgUploading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const createBgFileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<CarouselSlide | null>(null);
  const [editForm, setEditForm] = useState<SlideFormState>(emptySlideForm);
  const [editBgUploading, setEditBgUploading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editBgFileRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<CarouselSlide | null>(null);
  const [imageRemoveTarget, setImageRemoveTarget] = useState<
    { scope: "create" | "edit"; field: "backgroundImageUrl" } | null
  >(null);

  const confirmRemoveImage = () => {
    if (!imageRemoveTarget) return;
    const setter = imageRemoveTarget.scope === "create" ? setCreateForm : setEditForm;
    setter((f) => ({ ...f, [imageRemoveTarget.field]: "" }));
    setImageRemoveTarget(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gatewayApi.listCarouselSlides({ activeOnly: false });
      setSlides([...res].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slaytlar alınamadı.");
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
    if (createForm.backgroundType === "image" && !createForm.backgroundImageUrl) {
      toast.error("Arka plan görseli gerekli.");
      return;
    }
    setCreateSubmitting(true);
    try {
      await gatewayApi.createCarouselSlide({
        imageUrl: "",
        eyebrow: createForm.eyebrow.trim() || null,
        title: createForm.title.trim() || null,
        description: createForm.description.trim() || null,
        linkUrl: createForm.linkUrl.trim() || null,
        buttonLabel: createForm.buttonLabel.trim() || null,
        backgroundType: createForm.backgroundType,
        backgroundColor: createForm.backgroundType === "color" ? createForm.backgroundColor || null : null,
        backgroundImageUrl: createForm.backgroundType === "image" ? createForm.backgroundImageUrl || null : null,
        sortOrder: createForm.sortOrder,
        isActive: createForm.isActive,
      });
      toast.success("Slayt eklendi.");
      setCreateOpen(false);
      setCreateForm(emptySlideForm());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slayt eklenemedi.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const startEdit = (slide: CarouselSlide) => {
    setEditing(slide);
    setEditForm({
      eyebrow: slide.eyebrow ?? "",
      title: slide.title ?? "",
      description: slide.description ?? "",
      linkUrl: slide.linkUrl ?? "",
      buttonLabel: slide.buttonLabel ?? "",
      backgroundType: slide.backgroundType === "image" ? "image" : "color",
      backgroundColor: slide.backgroundColor ?? DEFAULT_SLIDE_BACKGROUND,
      backgroundImageUrl: slide.backgroundImageUrl ?? "",
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
    });
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (editForm.backgroundType === "image" && !editForm.backgroundImageUrl) {
      toast.error("Arka plan görseli gerekli.");
      return;
    }
    setEditSubmitting(true);
    try {
      await gatewayApi.updateCarouselSlide(editing.id, {
        imageUrl: "",
        eyebrow: editForm.eyebrow.trim() || null,
        title: editForm.title.trim() || null,
        description: editForm.description.trim() || null,
        linkUrl: editForm.linkUrl.trim() || null,
        buttonLabel: editForm.buttonLabel.trim() || null,
        backgroundType: editForm.backgroundType,
        backgroundColor: editForm.backgroundType === "color" ? editForm.backgroundColor || null : null,
        backgroundImageUrl: editForm.backgroundType === "image" ? editForm.backgroundImageUrl || null : null,
        sortOrder: editForm.sortOrder,
        isActive: editForm.isActive,
      });
      toast.success("Slayt güncellendi.");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slayt güncellenemedi.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await gatewayApi.deleteCarouselSlide(deleteTarget.id);
      toast.success("Slayt silindi.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slayt silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Anasayfa Carousel&apos;i</h2>
        <Dialog open={createOpen} onOpenChange={(next) => { setCreateOpen(next); if (!next) setCreateForm(emptySlideForm()); }}>
          <DialogTrigger asChild>
            <Button size="sm">Slayt Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Slayt</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="create-slide-eyebrow">Üst Etiket (opsiyonel)</Label>
                <Input
                  id="create-slide-eyebrow"
                  value={createForm.eyebrow}
                  onChange={(e) => setCreateForm((f) => ({ ...f, eyebrow: e.target.value }))}
                  placeholder="GÜVENİLİR PAZAR YERİ"
                  maxLength={60}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="create-slide-title">Başlık (opsiyonel)</Label>
                <Input
                  id="create-slide-title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Açıklama (opsiyonel)</Label>
                <RichTextEditor
                  value={createForm.description}
                  onChange={(html) => setCreateForm((f) => ({ ...f, description: html }))}
                  placeholder="Slayt açıklaması…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="create-slide-link">Link (opsiyonel)</Label>
                <Input
                  id="create-slide-link"
                  value={createForm.linkUrl}
                  onChange={(e) => setCreateForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="/ilanlar"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="create-slide-button">Buton Metni (opsiyonel)</Label>
                <Input
                  id="create-slide-button"
                  value={createForm.buttonLabel}
                  onChange={(e) => setCreateForm((f) => ({ ...f, buttonLabel: e.target.value }))}
                  placeholder="İlanlara Göz At"
                  maxLength={50}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Arka Plan</Label>
                <RadioGroup
                  value={createForm.backgroundType}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, backgroundType: v as "color" | "image" }))}
                  className="flex flex-row gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="color" id="create-slide-bg-color" />
                    <Label htmlFor="create-slide-bg-color" className="font-normal">Renk</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="image" id="create-slide-bg-image" />
                    <Label htmlFor="create-slide-bg-image" className="font-normal">Görsel</Label>
                  </div>
                </RadioGroup>
                {createForm.backgroundType === "color" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={createForm.backgroundColor}
                      onChange={(e) => setCreateForm((f) => ({ ...f, backgroundColor: e.target.value }))}
                      className="h-8 w-14 cursor-pointer rounded border border-border"
                    />
                    <span className="text-xs text-muted-foreground">{createForm.backgroundColor}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {createForm.backgroundImageUrl ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin panelde yüklenen keyfi harici görsel */}
                        <img src={`${GATEWAY_URL}${createForm.backgroundImageUrl}`} alt="" className="h-12 w-20 rounded border border-border object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageRemoveTarget({ scope: "create", field: "backgroundImageUrl" })}
                          aria-label="Görseli kaldır"
                          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-12 w-20 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
                        Yok
                      </div>
                    )}
                    <input
                      ref={createBgFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setCreateBgUploading(true);
                        try {
                          const url = await gatewayApi.uploadImage(file, "carousel");
                          setCreateForm((f) => ({ ...f, backgroundImageUrl: url }));
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Görsel yüklenemedi.");
                        } finally {
                          setCreateBgUploading(false);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={createBgUploading} onClick={() => createBgFileRef.current?.click()}>
                      {createBgUploading ? "Yükleniyor…" : "Görsel Seç"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="create-slide-sort">Sıra</Label>
                <Input
                  id="create-slide-sort"
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-slide-active"
                  checked={createForm.isActive}
                  onCheckedChange={(checked) => setCreateForm((f) => ({ ...f, isActive: checked === true }))}
                />
                <Label htmlFor="create-slide-active">Aktif</Label>
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
              <TableHead>Görsel</TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Sıra</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : slides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                  Henüz slayt eklenmedi.
                </TableCell>
              </TableRow>
            ) : (
              slides.map((slide) => (
                <TableRow key={slide.id}>
                  <TableCell>
                    {slide.backgroundType === "image" && slide.backgroundImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin panelde yüklenen keyfi harici görsel
                      <img src={`${GATEWAY_URL}${slide.backgroundImageUrl}`} alt="" className="h-10 w-16 rounded border border-border object-cover" />
                    ) : (
                      <div
                        className="h-10 w-16 rounded border border-border"
                        style={{ backgroundColor: slide.backgroundColor ?? DEFAULT_SLIDE_BACKGROUND }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{slide.title ?? "—"}</TableCell>
                  <TableCell>{slide.sortOrder}</TableCell>
                  <TableCell>
                    <span
                      className={
                        slide.isActive
                          ? "rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand"
                          : "rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {slide.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(slide)}>
                        Düzenle
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busyId === slide.id} onClick={() => setDeleteTarget(slide)}>
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

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slaytı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-slide-eyebrow">Üst Etiket (opsiyonel)</Label>
              <Input
                id="edit-slide-eyebrow"
                value={editForm.eyebrow}
                onChange={(e) => setEditForm((f) => ({ ...f, eyebrow: e.target.value }))}
                placeholder="GÜVENİLİR PAZAR YERİ"
                maxLength={60}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-slide-title">Başlık (opsiyonel)</Label>
              <Input
                id="edit-slide-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={200}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Açıklama (opsiyonel)</Label>
              <RichTextEditor
                value={editForm.description}
                onChange={(html) => setEditForm((f) => ({ ...f, description: html }))}
                placeholder="Slayt açıklaması…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-slide-link">Link (opsiyonel)</Label>
              <Input
                id="edit-slide-link"
                value={editForm.linkUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, linkUrl: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-slide-button">Buton Metni (opsiyonel)</Label>
              <Input
                id="edit-slide-button"
                value={editForm.buttonLabel}
                onChange={(e) => setEditForm((f) => ({ ...f, buttonLabel: e.target.value }))}
                placeholder="İlanlara Göz At"
                maxLength={50}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Arka Plan</Label>
              <RadioGroup
                value={editForm.backgroundType}
                onValueChange={(v) => setEditForm((f) => ({ ...f, backgroundType: v as "color" | "image" }))}
                className="flex flex-row gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="color" id="edit-slide-bg-color" />
                  <Label htmlFor="edit-slide-bg-color" className="font-normal">Renk</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="image" id="edit-slide-bg-image" />
                  <Label htmlFor="edit-slide-bg-image" className="font-normal">Görsel</Label>
                </div>
              </RadioGroup>
              {editForm.backgroundType === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editForm.backgroundColor}
                    onChange={(e) => setEditForm((f) => ({ ...f, backgroundColor: e.target.value }))}
                    className="h-8 w-14 cursor-pointer rounded border border-border"
                  />
                  <span className="text-xs text-muted-foreground">{editForm.backgroundColor}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {editForm.backgroundImageUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin panelde yüklenen keyfi harici görsel */}
                      <img src={`${GATEWAY_URL}${editForm.backgroundImageUrl}`} alt="" className="h-12 w-20 rounded border border-border object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageRemoveTarget({ scope: "edit", field: "backgroundImageUrl" })}
                        aria-label="Görseli kaldır"
                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-12 w-20 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
                      Yok
                    </div>
                  )}
                  <input
                    ref={editBgFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setEditBgUploading(true);
                      try {
                        const url = await gatewayApi.uploadImage(file, "carousel");
                        setEditForm((f) => ({ ...f, backgroundImageUrl: url }));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Görsel yüklenemedi.");
                      } finally {
                        setEditBgUploading(false);
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={editBgUploading} onClick={() => editBgFileRef.current?.click()}>
                    {editBgUploading ? "Yükleniyor…" : "Değiştir"}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-slide-sort">Sıra</Label>
              <Input
                id="edit-slide-sort"
                type="number"
                value={editForm.sortOrder}
                onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-slide-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm((f) => ({ ...f, isActive: checked === true }))}
              />
              <Label htmlFor="edit-slide-active">Aktif</Label>
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
            <AlertDialogTitle>Slayt silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title ?? "Bu slayt"}&quot; anasayfadan kaldırılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={imageRemoveTarget !== null} onOpenChange={(next) => !next && setImageRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Görsel kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              Görsel formdan kaldırılacak — slaytı kaydetmeden önce yeni bir görsel seçmeniz gerekir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveImage}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
