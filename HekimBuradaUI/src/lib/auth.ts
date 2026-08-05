const TOKEN_KEY = "hekimburada_access_token";

/**
 * v1: localStorage'da düz bearer token. Refresh-token akışı ve daha güvenli saklama
 * (örn. httpOnly cookie + BFF) sonraki bir adımda ele alınacak — şimdilik login/register
 * akışını uçtan uca çalıştırmak öncelikli.
 */
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string) => {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken: () => {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};
