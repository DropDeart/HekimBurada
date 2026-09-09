import * as signalR from "@microsoft/signalr";
import { MESSAGING_URL } from "./api";
import { auth } from "./auth";

export interface LiveNotification {
  title: string;
  body: string;
  linkPath: string;
}

/** Navbar'ın kurduğu tek presence bağlantısından, o an açık olan HERHANGİ bir sayfaya "veri bayatladı,
 * kendini yenile" sinyali — sayfa bileşenleri bunu dinleyip kendi load()/loadAll() fonksiyonlarını
 * tekrar çağırır (bkz. proje kararı: aynı sayfadayken F5 gerekmesin). */
export const LIVE_NOTIFICATION_EVENT = "hekimburada:notification";

/**
 * Uygulama genelinde (her sayfada, sadece sohbet ekranında değil) bağlı kalınan presence bağlantısı —
 * kullanıcının "çevrimiçi" sayılmasını sağlar (bkz. Messaging/Hubs/PresenceHub.cs) ve teklif/mesaj
 * gibi olaylarda anlık push bildirimlerini alır. Token yoksa/çıkış yapılırsa bağlanmaz.
 */
export function connectPresence(onNotification: (notification: LiveNotification) => void) {
  const token = auth.getToken();
  if (!token) {
    return () => {};
  }

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${MESSAGING_URL}/hubs/presence?access_token=${token}`)
    .withAutomaticReconnect()
    .build();

  connection.on("notificationReceived", (notification: LiveNotification) => {
    onNotification(notification);
    window.dispatchEvent(new CustomEvent<LiveNotification>(LIVE_NOTIFICATION_EVENT, { detail: notification }));
  });
  connection.start().catch(() => {});

  return () => {
    connection.stop();
  };
}
