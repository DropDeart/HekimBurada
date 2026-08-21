"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { communityApi } from "@/lib/api";

const STEP_TITLES = ["Topluluğu tanımla", "Erişim ve kurallar", "Özet"];
const KIND_OPTIONS = ["Branş", "Okul", "Bölge"];

interface CreateCommunityWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (categoryId: string) => void;
}

export function CreateCommunityWizard({ open, onOpenChange, onCreated }: CreateCommunityWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState(KIND_OPTIONS[0]);
  const [isClosed, setIsClosed] = useState(true);
  const [rules, setRules] = useState(
    "1. Hasta kimliği paylaşılmaz.\n2. İlan ve satış paylaşımı yasak.\n3. Kaynaksız tedavi önerisi kaldırılır."
  );
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setStep(0);
    setName("");
    setDescription("");
    setKind(KIND_OPTIONS[0]);
    setIsClosed(true);
    setRules("1. Hasta kimliği paylaşılmaz.\n2. İlan ve satış paylaşımı yasak.\n3. Kaynaksız tedavi önerisi kaldırılır.");
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const create = async () => {
    setCreating(true);
    try {
      const id = await communityApi.createCategory({ name, kind, description, isClosed, rules });
      toast.success("Topluluk kuruldu — moderatörüsün.");
      onCreated(id);
      close();
      router.push(`/topluluk/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Topluluk kurulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const next = () => {
    if (step === 0 && !name.trim()) {
      toast.error("Topluluk adı gerekli.");
      return;
    }
    if (step === STEP_TITLES.length - 1) {
      void create();
      return;
    }
    setStep((s) => s + 1);
  };

  const prev = () => {
    if (step === 0) {
      close();
      return;
    }
    setStep((s) => s - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-1 text-xs font-medium text-brand">
            Adım {step + 1} / {STEP_TITLES.length}
          </div>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
        </DialogHeader>

        <div className="mb-5 flex gap-2">
          {STEP_TITLES.map((title, i) => (
            <div key={title} className="flex-1">
              <div className={cn("mb-1.5 h-1 rounded-full", i <= step ? "bg-brand" : "bg-secondary")} />
              <div className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
                {title}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {step === 0 && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Topluluk adı</label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                  placeholder="örn. Girişimsel Kardiyoloji Hekimleri"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Kısa açıklama</label>
                <Textarea
                  placeholder="Bu topluluk kimler için, neyi tartışıyor?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                        kind === k
                          ? "bg-foreground text-background"
                          : "border border-border bg-background hover:bg-muted"
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Grup türü</label>
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
                      Herkes görür, yalnızca doğrulanmış doktorlar konuşabilir.
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
                    <span className="text-xs text-muted-foreground">Katılım ve okuma tamamen serbest.</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Topluluk kuralları</label>
                <Textarea className="min-h-28" value={rules} onChange={(e) => setRules(e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="rounded-xl bg-secondary p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Özet</div>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Ad</span>
                  <strong className="text-foreground">{name || "—"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tür</span>
                  <strong className="text-foreground">{kind}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Grup</span>
                  <strong className="text-foreground">{isClosed ? "Kapalı" : "Açık"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Moderatör</span>
                  <strong className="text-foreground">Sen</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={prev} disabled={creating}>
            {step === 0 ? "Vazgeç" : "Geri"}
          </Button>
          <Button onClick={next} disabled={creating}>
            {creating ? "Kuruluyor…" : step === STEP_TITLES.length - 1 ? "Topluluğu oluştur" : "Devam et"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
