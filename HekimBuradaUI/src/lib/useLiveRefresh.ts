import { useEffect } from "react";
import { LIVE_NOTIFICATION_EVENT } from "./presenceHub";

/**
 * Presence bağlantısından (bkz. presenceHub.ts) canlı bir bildirim geldiğinde verilen fonksiyonu
 * çağırır — kullanıcı aynı sayfadayken (örn. bir ilanın teklif listesinde) yeni veri F5 atmadan
 * görünsün diye (bkz. proje kararı). `callback` kararlı bir referans olmalı (useCallback).
 */
export function useLiveRefresh(callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener(LIVE_NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(LIVE_NOTIFICATION_EVENT, handler);
  }, [callback]);
}
