"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ListingPreviewCard } from "@/components/listing/ListingPreviewCard";
import {
  identityApi,
  MARKETPLACE_URL,
  marketplaceApi,
  regionsApi,
  type ListingKind,
  type MarketplaceCategory,
  type Province,
} from "@/lib/api";
import { auth } from "@/lib/auth";
import { CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

type StepId = "category" | "info" | "payment" | "feature" | "preview";

/**
 * Adımlar kategorinin listingKind'ine göre değişir — "product" dışındaki kategorilerde Ödeme
 * Yöntemi adımı hiç yok (bkz. proje notu: konut/araba/iş ilanı gibi kategoriler için ayrı bir
 * ödeme akışı anlamsız). "info" adımının içeriği de kind'e göre değişir (bkz. render kısmı).
 */
function stepsForKind(kind: ListingKind): { id: StepId; label: string }[] {
  const steps: { id: StepId; label: string }[] = [
    { id: "category", label: "Kategori" },
    { id: "info", label: kind === "product" ? "Ürün Bilgileri" : "İlan Bilgileri" },
  ];
  if (kind === "product") {
    steps.push({ id: "payment", label: "Ödeme Yöntemi" });
  }
  steps.push({ id: "feature", label: "Öne Çıkar" }, { id: "preview", label: "Önizleme" });
  return steps;
}

const PAYMENT_METHODS = [
  {
    id: "bagis",
    label: "Bağış ile Ödeme",
    hint: "Ürün bedeli kadar belirli bir noktaya bağış yapıp dekontunu paylaşınız.",
  },
  {
    id: "bedelsiz",
    label: "Bedelsiz Ürün",
    hint: "Bu ürün için fiyat bilgisi bulunmamaktadır. İhtiyaç sahibine devredilecektir.",
  },
  {
    id: "referans",
    label: "Referans Linkli %50+ İndirim",
    hint: "Ürünün orijinal fiyatı belirtilmeli, belirlenecek satış fiyatı bu fiyatın en fazla yarısı (%50 veya daha fazla indirim) olmalıdır.",
  },
  {
    id: "kart",
    label: "Kredi Kartı",
    hint: "Alıcı, ödemeyi kredi kartıyla yapar.",
  },
  {
    id: "elden",
    label: "Elden Teslim",
    hint: "Teklif sonucu taraflar ücretleri elden teslim edeceklerdir.",
  },
];

const CONDITIONS = ["Yeni", "Az Kullanılmış", "Kullanılmış"];

// BaseForge CodeGen'in ürettiği Listing.durationDays alanı yalnızca bu dört değeri kabul ediyor
// (bkz. api.ts CreateListingInput — durationDays: 15 | 30 | 60 | 90).
const DURATION_OPTIONS = [15, 30, 60, 90] as const;

// Öne çıkarma şu an bilgilendirme amaçlı — platformda henüz gerçek bir ödeme altyapısı (ör. iyzico)
// yok, bu yüzden burada gösterilen ücret tahsil edilmiyor (bkz. proje kararı). Ödeme sağlayıcı
// entegre edildiğinde bu sabit değer gerçek bir tahsilat akışına bağlanmalı.
const FEATURED_PRICE_TL = 49;

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function IlanVerPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [city, setCity] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("kart");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [referansUrl, setReferansUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [durationDays, setDurationDays] = useState<(typeof DURATION_OPTIONS)[number]>(30);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    identityApi
      .doctorProfile()
      .then((p) => {
        if (p.verificationStatus === "approved") {
          setAllowed(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));

    marketplaceApi
      .listCategories({ pageSize: 100 })
      .then((r) => setCategories(r.items))
      .catch(() => {});

    regionsApi.list().then(setProvinces).catch(() => {});
  }, []);

  const topCategories = categories.filter((c) => !c.parentId);
  const subCategories = categoryId ? categories.filter((c) => c.parentId === categoryId) : [];
  const selectedCategory = categories.find((c) => c.id === (subId ?? categoryId));
  const kind: ListingKind = selectedCategory?.listingKind ?? "product";
  const steps = stepsForKind(kind);
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStepId = steps[safeStepIndex]?.id;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await marketplaceApi.uploadImage(file);
      setImageUrls((prev) => [...prev, url]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const publish = async () => {
    const userId = auth.getUserId();
    if (!userId || !categoryId) return;
    setPublishing(true);
    try {
      // Fiyat/ödeme/durum, seçilen kategorinin türüne göre farklı anlam taşır — bkz. stepsForKind
      // doc yorumu. "job" (iş ilanı vb.) fiyatsız/ödemesiz düz bir ilan, "big_ticket" (konut/araba
      // vb.) sadece fiyat gösterir, ödeme yöntemi her zaman "elden" (platform üzerinden gerçek bir
      // ödeme akışı yok, tüm kategorilerde nihai teslim/ödeme alıcı-satıcı arasında).
      const effectiveCondition = kind === "job" ? "" : condition;
      const effectivePrice = kind === "job" ? null : price ? Number(price) : null;
      const effectivePaymentMethod = kind === "product" ? paymentMethod : kind === "big_ticket" ? "elden" : "yok";
      const effectiveOriginalPrice = kind === "product" && paymentMethod === "referans" ? (originalPrice ? Number(originalPrice) : null) : null;
      const effectiveReferansUrl = kind === "product" && paymentMethod === "referans" ? referansUrl || null : null;

      await marketplaceApi.createListing({
        title,
        description,
        condition: effectiveCondition,
        price: effectivePrice,
        originalPrice: effectiveOriginalPrice,
        paymentMethod: effectivePaymentMethod,
        referansUrl: effectiveReferansUrl,
        city,
        images: JSON.stringify(imageUrls),
        durationDays,
        isFeatured,
        categoryId: subId ?? categoryId,
        sellerId: userId,
      });
      toast.success("İlanınız onaya gönderildi — admin onayladıktan sonra yayına alınacak.");
      router.push("/ilanlarim");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İlan yayınlanamadı.");
    } finally {
      setPublishing(false);
    }
  };

  if (checking) {
    return null;
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">İlan Ver</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          İlan verebilmek için doktor doğrulamanızın admin tarafından onaylanmış olması gerekir.
        </p>
        <Button onClick={() => router.push("/kayit-ol/belge-yukle")}>Belge Durumumu Gör</Button>
      </div>
    );
  }

  return (
    <div className="px-6 py-7 sm:px-10">
      <div className="mb-7 flex items-center justify-center">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 w-6 shrink-0 transition-colors duration-300 sm:w-10",
                  safeStepIndex >= i ? "bg-brand" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-2 px-1">
              <div
                className={cn(
                  "flex size-6.5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300",
                  safeStepIndex > i
                    ? "bg-brand text-white"
                    : safeStepIndex === i
                      ? "bg-[#141718] text-white"
                      : "bg-border text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-semibold whitespace-nowrap transition-colors duration-300 sm:inline",
                  safeStepIndex === i ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-h-[360px] rounded-[10px] border border-border bg-white p-7">
          <div key={currentStepId} className="animate-in fade-in slide-in-from-right-4 duration-300">
            {currentStepId === "category" && (
              <div>
                <h3 className="mb-5 text-lg font-bold text-foreground">Kategori Seçin</h3>
                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  {topCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCategoryId(c.id);
                        setSubId(null);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-[1.5px] p-3 text-left text-[13px] font-semibold",
                        categoryId === c.id
                          ? "border-brand bg-[#F3FBF7] text-brand"
                          : "border-border bg-white"
                      )}
                    >
                      <CategoryIcon icon={c.icon} className="size-4 shrink-0" />
                      {c.name}
                    </button>
                  ))}
                </div>
                {categoryId && subCategories.length > 0 && (
                  <div className="max-w-xs">
                    <h4 className="mb-2.5 text-xs font-bold text-muted-foreground">Alt Kategori</h4>
                    <Select value={subId ?? ""} onValueChange={(v) => setSubId(v || null)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Alt kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {currentStepId === "info" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-foreground">
                  {kind === "product" ? "Ürün Bilgileri" : "İlan Bilgileri"}
                </h3>
                <div>
                  <label className="text-xs text-muted-foreground">İlan Başlığı</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={kind === "job" ? "Örn. Aile Hekimliği Uzmanı Aranıyor" : "Örn. Portatif Ultrason Cihazı"}
                    className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Açıklama</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={kind === "job" ? "Pozisyon, çalışma şartları vb." : "Ürün durumu, kullanım süresi vb."}
                    className="min-h-[90px] w-full rounded-lg border border-input p-2.5 text-[13px] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  {kind !== "job" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Durum</label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">Şehir</label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {kind === "big_ticket" && (
                  <div>
                    <label className="text-xs text-muted-foreground">Fiyat</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="₺"
                      className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Teslim ve ödeme alıcı-satıcı arasında elden gerçekleşir.
                    </p>
                  </div>
                )}
                <div className="rounded-[10px] border-[1.5px] border-dashed border-[#C9CFD2] bg-[#FAFBFB] p-4.5 text-center">
                  <div className="mb-2 text-sm font-semibold text-foreground">Fotoğraflar</div>
                  {imageUrls.length > 0 && (
                    <div className="mb-3 flex flex-wrap justify-center gap-2">
                      {imageUrls.map((url) => (
                        <div key={url} className="relative h-14 w-20 overflow-hidden rounded-md bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel */}
                          <img src={`${MARKETPLACE_URL}${url}`} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                            aria-label="Görseli kaldır"
                            className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-white"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="inline-block cursor-pointer rounded-md border border-input bg-white px-3.5 py-1.5 text-[13px] font-semibold">
                    {uploading ? "Yükleniyor…" : "Fotoğraf Ekle"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={handlePhotoSelect}
                    />
                  </label>
                </div>
              </div>
            )}

            {currentStepId === "payment" && (
              <div>
                <h3 className="mb-1.5 text-lg font-bold text-foreground">Ödeme Yöntemi</h3>
                <p className="mb-4.5 text-xs text-muted-foreground">
                  Bu ilan için alıcıların kullanabileceği ödeme yöntemini seçin.
                </p>
                <div className="mb-4 flex flex-col gap-2.5">
                  {PAYMENT_METHODS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border-[1.5px] px-3.5 py-3 text-left text-[13px] font-semibold",
                        paymentMethod === p.id
                          ? "border-brand bg-[#F3FBF7]"
                          : "border-border bg-white"
                      )}
                    >
                      {p.label}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => e.stopPropagation()}
                            className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Info className="size-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{p.hint}</TooltipContent>
                      </Tooltip>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs text-muted-foreground">Fiyat</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="₺"
                      className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                    />
                  </div>
                  {paymentMethod === "referans" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Orijinal Fiyat</label>
                      <input
                        type="number"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="₺"
                        className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                      />
                    </div>
                  )}
                </div>
                {paymentMethod === "referans" && (
                  <div className="mt-3.5">
                    <label className="text-xs text-muted-foreground">
                      Referans / Satın Alma Linki
                    </label>
                    <input
                      value={referansUrl}
                      onChange={(e) => setReferansUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {currentStepId === "feature" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="mb-3 text-lg font-bold text-foreground">Öne Çıkar</h3>
                  <button
                    onClick={() => setIsFeatured((v) => !v)}
                    className="flex w-full items-center gap-3.5 rounded-[10px] border-[1.5px] border-border p-4 text-left"
                  >
                    <div
                      className={cn(
                        "size-5 shrink-0 rounded-[5px]",
                        isFeatured ? "bg-brand" : "bg-border"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-foreground">İlanımı 7 Gün Öne Çıkar</div>
                        <div className="text-sm font-bold text-brand">{currency(FEATURED_PRICE_TL)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ana sayfada &quot;Öne Çıkan İlanlar&quot; bölümünde üstte gösterilir.
                      </div>
                    </div>
                  </button>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Ödeme altyapımız henüz devreye alınmadı, bu ücret şu an tahsil edilmiyor.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">İlan Süresi</label>
                  <Select
                    value={String(durationDays)}
                    onValueChange={(v) => setDurationDays(Number(v) as (typeof DURATION_OPTIONS)[number])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} gün
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    İlanınız bu süre sonunda otomatik olarak süresi dolmuş sayılır.
                  </p>
                </div>
              </div>
            )}

            {currentStepId === "preview" && (
              <div>
                <h3 className="mb-5 text-lg font-bold text-foreground">Önizleme ve Yayınla</h3>
                <p className="mb-5 text-[13px] text-muted-foreground">
                  İlanınız yayınlandıktan sonra admin onayına gönderilecek, onaylandığında herkese
                  açık hale gelecektir.
                </p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mb-3 w-full">
                      Önizle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>İlan Önizlemesi</DialogTitle>
                    </DialogHeader>
                    <ListingPreviewCard
                      variant="full"
                      images={imageUrls}
                      title={title}
                      categoryName={selectedCategory?.name ?? ""}
                      price={price ? Number(price) : null}
                      showPrice={kind !== "job"}
                      condition={kind !== "job" ? condition : undefined}
                      city={city}
                      description={description}
                      isFeatured={isFeatured}
                    />
                  </DialogContent>
                </Dialog>

                <Button onClick={publish} disabled={publishing} className="w-full">
                  {publishing ? "Yayınlanıyor…" : "İlanı Yayınla"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-7 flex justify-between">
            {safeStepIndex > 0 ? (
              <Button variant="outline" onClick={() => setStepIndex((s) => s - 1)}>
                ← Geri
              </Button>
            ) : (
              <span />
            )}
            {safeStepIndex < steps.length - 1 && (
              <Button
                onClick={() => setStepIndex((s) => s + 1)}
                disabled={safeStepIndex === 0 && !categoryId}
              >
                İleri →
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            CANLI ÖNİZLEME
          </div>
          <ListingPreviewCard
            variant="compact"
            images={imageUrls}
            title={title}
            categoryName={selectedCategory?.name ?? ""}
            price={price ? Number(price) : null}
            showPrice={kind !== "job"}
            city={city}
            description={description}
            isFeatured={isFeatured}
          />
        </div>
      </div>
    </div>
  );
}
