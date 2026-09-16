"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { communityApi, type CommunityCategory } from "@/lib/api";

const KIND_OPTIONS = ["Branş", "Okul", "Bölge"];

interface EditCommunityDialogProps {
  category: CommunityCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Var olan bir topluluğun ayarlarını (ad/tür/açıklama/görünürlük/kurallar) düzenler — CreateCommunityWizard'ın
 * tek adımlık, düzenleme moduna uyarlanmış hâli. Yalnızca moderatör/site admin'e gösterilir. */
export function EditCommunityDialog({ category, open, onOpenChange, onSaved }: EditCommunityDialogProps) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  const [kind, setKind] = useState(category.kind);
  const [isClosed, setIsClosed] = useState(category.isClosed);
  const [rules, setRules] = useState(category.rules);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog her açılışta kategorinin güncel değerleriyle sıfırlanır
    setName(category.name);
    setDescription(category.description);
    setKind(category.kind);
    setIsClosed(category.isClosed);
    setRules(category.rules);
  }, [open, category]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Topluluk adı gerekli.");
      return;
    }
    setSaving(true);
    try {
      await communityApi.updateCategory(category.id, { name, kind, description, isClosed, rules });
      toast.success("Topluluk ayarları güncellendi.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Topluluk ayarları</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Topluluk adı</label>
            <input
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Kısa açıklama</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Topluluk türü</label>
            <div className="flex gap-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-9 rounded-lg px-3.5 text-sm font-medium",
                    kind === k ? "bg-foreground text-background" : "border border-border bg-background hover:bg-muted"
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Görünürlük</label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsClosed(true)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl p-3.5 text-left",
                  isClosed ? "border border-brand bg-brand-soft" : "border border-border bg-background hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium text-foreground">Kapalı grup</span>
                <span className="text-xs text-muted-foreground">
                  İçeriği yalnızca giriş yapmış kullanıcılar görür — Google&apos;da görünmez.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsClosed(false)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl p-3.5 text-left",
                  !isClosed ? "border border-brand bg-brand-soft" : "border border-border bg-background hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium text-foreground">Açık grup</span>
                <span className="text-xs text-muted-foreground">
                  Konu/yorumları giriş yapmadan da herkes okuyabilir, Google&apos;da görünür. Yorum/konu açmak ve
                  katılmak yine giriş ister.
                </span>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Topluluk kuralları</label>
            <Textarea className="min-h-28" value={rules} onChange={(e) => setRules(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Vazgeç
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
