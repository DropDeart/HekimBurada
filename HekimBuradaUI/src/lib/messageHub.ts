import * as signalR from "@microsoft/signalr";
import { MESSAGING_URL, type Message } from "./api";
import { auth } from "./auth";

/** Bir teklife özel canlı sohbet bağlantısı — Messaging'in /hubs/messages hub'ı (bkz. Program.cs). */
export function connectToOfferChat(offerId: string, onMessage: (message: Message) => void) {
  const token = auth.getToken();
  if (!token) {
    return () => {};
  }

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${MESSAGING_URL}/hubs/messages?offerId=${offerId}&access_token=${token}`)
    .withAutomaticReconnect()
    .build();

  connection.on("messageReceived", (message: Message) => onMessage(message));
  connection.start().catch(() => {});

  return () => {
    connection.stop();
  };
}
