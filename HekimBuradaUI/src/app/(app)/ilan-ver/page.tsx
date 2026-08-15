"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { identityApi, MARKETPLACE_URL, marketplaceApi, type ListingKind, type MarketplaceCategory } from "@/lib/api";
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
  { id: "bagis", label: "Bağış ile Ödeme" },
  { id: "bedelsiz", label: "Bedelsiz Ürün" },
  { id: "referans", label: "Referans Linkli %50+ İndirim" },
  { id: "kart", label: "Kredi Kartı" },
  { id: "elden", label: "Elden Teslim" },
];

const CONDITIONS = ["Yeni", "Az Kullanılmış", "Kullanılmış"];

function currency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function IlanVerPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
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
        durationDays: 30,
        isFeatured,
        categoryId: subId ?? categoryId,
        sellerId: userId,
      });
      toast.success("İlanınız yayınlandı.");
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
      <div className="mb-7 flex flex-wrap justify-center gap-3.5">
        {steps.map((s, i) => {
          const isDone = safeStepIndex > i;
          const isActive = safeStepIndex === i;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-6.5 items-center justify-center rounded-full text-xs font-bold",
                  isDone
                    ? "bg-brand text-white"
                    : isActive
                      ? "bg-[#141718] text-white"
                      : "bg-border text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-h-[360px] rounded-[10px] border border-border bg-white p-7">
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
                  <select
                    value={subId ?? ""}
                    onChange={(e) => setSubId(e.target.value || null)}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-[13px]"
                  >
                    <option value="">Alt kategori seçin</option>
                    {subCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
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
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Şehir</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Örn. İstanbul"
                    className="w-full border-0 border-b border-input bg-transparent py-2 text-sm outline-none"
                  />
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
                      "rounded-lg border-[1.5px] px-3.5 py-3 text-left text-[13px] font-semibold",
                      paymentMethod === p.id
                        ? "border-brand bg-[#F3FBF7]"
                        : "border-border bg-white"
                    )}
                  >
                    {p.label}
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
            <div>
              <h3 className="mb-5 text-lg font-bold text-foreground">Öne Çıkar</h3>
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
                <div>
                  <div className="text-sm font-bold text-foreground">
                    İlanımı 7 Gün Öne Çıkar
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ana sayfada &quot;Öne Çıkan İlanlar&quot; bölümünde üstte gösterilir.
                  </div>
                </div>
              </button>
            </div>
          )}

          {currentStepId === "preview" && (
            <div>
              <h3 className="mb-5 text-lg font-bold text-foreground">Önizleme ve Yayınla</h3>
              <p className="mb-5 text-[13px] text-muted-foreground">
                İlanınız yayınlandıktan sonra herkese açık hale gelecektir.
              </p>
              <Button onClick={publish} disabled={publishing} className="w-full">
                {publishing ? "Yayınlanıyor…" : "İlanı Yayınla"}
              </Button>
            </div>
          )}

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
          <div className="overflow-hidden rounded-[10px] border border-border bg-white">
            {imageUrls.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element -- kullanıcı tarafından yüklenen keyfi harici görsel
              <img src={`${MARKETPLACE_URL}${imageUrls[0]}`} alt="" className="h-[140px] w-full object-cover" />
            ) : (
              <div className="flex h-[140px] items-center justify-center bg-[repeating-linear-gradient(135deg,#EEF1F2,#EEF1F2_12px,#E4E8EA_12px,#E4E8EA_24px)] font-mono text-[11px] text-[#9AA1A5]">
                İLAN GÖRSELİ
              </div>
            )}
            <div className="p-3.5">
              <div className="mb-1 text-[11px] font-bold text-brand">
                {selectedCategory?.name ?? "Kategori seçilmedi"}
              </div>
              <div className="mb-1 text-sm font-bold text-foreground">
                {title || "İlan Başlığı"}
              </div>
              {kind === "job" ? (
                <div className="text-[13px] text-muted-foreground">İlan (fiyatsız)</div>
              ) : (
                <div className="text-[15px] font-bold text-brand">
                  {price ? currency(Number(price)) : "Fiyat belirtilmedi"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
