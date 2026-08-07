import { useSyncExternalStore } from "react";

const TOKEN_KEY = "hekimburada_access_token";
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
 * v1: localStorage'da düz bearer token. Refresh-token akışı ve daha güvenli saklama
 * (örn. httpOnly cookie + BFF) sonraki bir adımda ele alınacak — şimdilik login/register
 * akışını uçtan uca çalıştırmak öncelikli.
 */
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  },
  /** remember=true (varsayılan): tarayıcı kapansa da oturum kalıcı olur (localStorage). false ("Beni Hatırla" işaretsiz): yalnızca bu sekme/oturum boyunca (sessionStorage). */
  setToken: (token: string, remember = true) => {
    if (remember) {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.sessionStorage.removeItem(TOKEN_KEY);
    } else {
      window.sessionStorage.setItem(TOKEN_KEY, token);
      window.localStorage.removeItem(TOKEN_KEY);
    }
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  },
  clearToken: () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
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
