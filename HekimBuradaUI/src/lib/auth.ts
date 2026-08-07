import { useSyncExternalStore } from "react";

const TOKEN_KEY = "hekimburada_access_token";
const REFRESH_TOKEN_KEY = "hekimburada_refresh_token";
const AUTH_CHANGE_EVENT = "hekimburada:auth-changed";

export const ADMIN_ROLES = ["Admin", "SuperAdmin", "RegionAdmin"] as const;

interface TokenClaims {
  role?: string | string[];
  email?: string;
  sub?: string;
  [key: string]: unknown;
}

/** İmza doğrulaması yapmaz — yalnızca client-side UI dallanması içindir. Gerçek yetkilendirme her admin ucunda sunucuda uygulanır. */
function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as TokenClaims;
  } catch {
    return null;
  }
}

/**
 * localStorage/sessionStorage'da düz bearer token + refresh token. Daha güvenli saklama
 * (örn. httpOnly cookie + BFF) ileride ele alınabilir — şimdilik access token süresi dolduğunda
 * api.ts'in authedReqAt'ı burada saklanan refresh token'la sessizce yeniliyor (bkz. api.ts).
 */
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  },
  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },
  /** Access token localStorage'da mı (remember=true) yoksa sessionStorage'da mı (remember=false) saklı — token yenilenince aynı yere yazmak için. */
  isRemembered: (): boolean => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(TOKEN_KEY) !== null;
  },
  /** remember=true (varsayılan): tarayıcı kapansa da oturum kalıcı olur (localStorage). false ("Beni Hatırla" işaretsiz): yalnızca bu sekme/oturum boyunca (sessionStorage). */
  setToken: (token: string, remember = true, refreshToken: string | null = null) => {
    const [store, other] = remember
      ? [window.localStorage, window.sessionStorage]
      : [window.sessionStorage, window.localStorage];

    store.setItem(TOKEN_KEY, token);
    other.removeItem(TOKEN_KEY);

    if (refreshToken) {
      store.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      store.removeItem(REFRESH_TOKEN_KEY);
    }
    other.removeItem(REFRESH_TOKEN_KEY);

    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  },
  clearToken: () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  },
  getRoles: (): string[] => {
    const token = auth.getToken();
    if (!token) return [];
    const claims = decodeToken(token);
    const role = claims?.role;
    if (!role) return [];
    return Array.isArray(role) ? role : [role];
  },
  isAdmin: (): boolean => {
    const roles = auth.getRoles();
    return ADMIN_ROLES.some((r) => roles.includes(r));
  },
  getEmail: (): string | null => {
    const token = auth.getToken();
    if (!token) return null;
    return decodeToken(token)?.email ?? null;
  },
  /** OpenIddict access token'ındaki 'sub' claim'i — Identity/Marketplace/Community'deki UserId'nin aynısı. */
  getUserId: (): string | null => {
    const token = auth.getToken();
    if (!token) return null;
    return decodeToken(token)?.sub ?? null;
  },
};

function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const EMPTY_ROLES: string[] = [];

// useSyncExternalStore, getSnapshot'ın token değişmediği sürece AYNI referansı döndürmesini
// bekler — auth.getRoles() her çağrıda yeni bir dizi oluşturduğundan doğrudan kullanılırsa
// sonsuz render döngüsüne yol açar. Token'a göre önbelleklenmiş bir referans tutuyoruz.
let rolesCacheToken: string | null | undefined;
let rolesCache: string[] = EMPTY_ROLES;

function getRolesSnapshot(): string[] {
  const token = auth.getToken();
  if (token !== rolesCacheToken) {
    rolesCacheToken = token;
    rolesCache = auth.getRoles();
  }
  return rolesCache;
}

/** localStorage'daki token'ı hydration-güvenli okur (SSR anlık görüntüsü hep "yok" döner, client'ta gerçek değere geçer). */
export function useHasToken(): boolean {
  return useSyncExternalStore(
    subscribeToAuthChanges,
    () => auth.getToken() !== null,
    () => false
  );
}

export function useAuthRoles(): string[] {
  return useSyncExternalStore(subscribeToAuthChanges, getRolesSnapshot, () => EMPTY_ROLES);
}
