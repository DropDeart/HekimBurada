import { ORDER_STATUS_LABELS, type Order } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Sipariş durumu rozeti — ilan detayı (alıcı/satıcı) ve Profilim &gt; Sipariş sekmesinde aynı görünüm
 * (bkz. /simplify incelemesi — önceden 3 dosyada ayrı ayrı kopyalanmıştı). `className` çağıranın
 * kendi metin boyutunu (ör. `text-[11px]` vs `text-xs`) geçmesine izin verir. */
export function OrderStatusBadge({ order, className }: { order: Order; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 font-semibold",
        order.status === "delivered" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground",
        className ?? "text-xs"
      )}
    >
      {ORDER_STATUS_LABELS[order.status]}
    </span>
  );
}

/** Kargo firması/takip no metni — çağıran, hiç kargo bilgisi yoksa sarmalayıcıyı (span/div) hiç
 * render etmemekten sorumlu (bkz. mevcut `{(shippingCarrier || trackingNumber) && (...)}` deseni). */
export function OrderShippingInfo({ order, fallback = "Kargo" }: { order: Order; fallback?: string }) {
  return (
    <>
      {order.shippingCarrier ?? fallback}
      {order.trackingNumber && ` · Takip No: ${order.trackingNumber}`}
    </>
  );
}
