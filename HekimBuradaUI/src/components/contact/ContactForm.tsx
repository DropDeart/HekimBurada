"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { gatewayApi } from "@/lib/api";

/** İletişim formu — herkese açık, giriş gerektirmez (bkz. ContactMessagesController.Create). */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !body.trim()) {
      toast.error("Ad, e-posta ve mesaj alanları gerekli.");
      return;
    }
    setSending(true);
    try {
      await gatewayApi.createContactMessage({ name: name.trim(), email: email.trim(), body: body.trim() });
      setSent(true);
      setName("");
      setEmail("");
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="rounded-lg border border-border bg-secondary p-4 text-sm text-foreground">
        Mesajınız alındı, en kısa sürede size dönüş yapacağız.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        placeholder="Adınız"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        placeholder="E-posta adresiniz"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Textarea
        className="min-h-28"
        placeholder="Mesajınız"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={sending}>
          {sending ? "Gönderiliyor…" : "Gönder"}
        </Button>
      </div>
    </div>
  );
}
