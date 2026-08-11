"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gatewayApi, type Announcement } from "@/lib/api";

/** En son görülen duyuru ID'si — bir sonraki ziyarette aynı duyuru tekrar popup olarak çıkmasın diye. */
const LAST_SEEN_KEY = "hekimburada_last_seen_announcement_id";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

/** Yeni bir duyuru eklendiğinde, siteye giren her ziyaretçiye (giriş yapmış/yapmamış fark etmez)
 * kapatılabilir bir popup olarak gösterir — bir kere kapatılınca localStorage'a işaretlenir, aynı
 * duyuru bir daha açılmaz. (app)/layout.tsx içinde site genelinde tek sefer render edilir. */
export function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    gatewayApi
      .listAnnouncements({ pageSize: 20 })
      .then((r) => {
        const latest = [...r.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
        if (!latest) return;
        const lastSeenId = window.localStorage.getItem(LAST_SEEN_KEY);
        if (latest.id !== lastSeenId) {
          setAnnouncement(latest);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (announcement) {
      window.localStorage.setItem(LAST_SEEN_KEY, announcement.id);
    }
    setOpen(false);
  };

  if (!announcement) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>{formatDate(announcement.publishedAt)}</DialogDescription>
        </DialogHeader>
        <p className="text-sm whitespace-pre-wrap text-foreground">{announcement.body}</p>
        <DialogFooter>
          <Button onClick={dismiss}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
