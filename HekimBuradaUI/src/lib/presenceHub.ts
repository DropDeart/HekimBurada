import * as signalR from "@microsoft/signalr";
import { MESSAGING_URL } from "./api";
import { auth } from "./auth";

export interface LiveNotification {
  title: string;
  body: string;
  linkPath: string;
}

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

  connection.on("notificationReceived", (notification: LiveNotification) => onNotification(notification));
  connection.start().catch(() => {});

  return () => {
    connection.stop();
  };
}
