import * as signalR from "@microsoft/signalr";
import { MESSAGING_URL, type Message } from "./api";
import { auth } from "./auth";

/** Karşı taraf, sohbetteki mesajları okundu işaretlediğinde ("görüldü" tiki) yayınlanır — bkz. MarkMessagesReadHandler. */
export interface MessagesReadPayload {
  offerId: string;
  readAt: string;
}

/** Bir teklife özel canlı sohbet bağlantısı — Messaging'in /hubs/messages hub'ı (bkz. Program.cs). */
export function connectToOfferChat(
  offerId: string,
  onMessage: (message: Message) => void,
  onRead?: (payload: MessagesReadPayload) => void
) {
  const token = auth.getToken();
  if (!token) {
    return () => {};
  }

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${MESSAGING_URL}/hubs/messages?offerId=${offerId}&access_token=${token}`)
    .withAutomaticReconnect()
    .build();

  connection.on("messageReceived", (message: Message) => onMessage(message));
  if (onRead) {
    connection.on("messagesRead", (payload: MessagesReadPayload) => onRead(payload));
  }
  connection.start().catch(() => {});

  return () => {
    connection.stop();
  };
}
