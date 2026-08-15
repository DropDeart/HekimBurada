import { IDENTITY_URL } from "./api";

const VERIFIER_KEY = "hekimburada_pkce_verifier";
const STATE_KEY = "hekimburada_pkce_state";
const REMEMBER_KEY = "hekimburada_pkce_remember";

export const CALLBACK_PATH = "/callback";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Google/Facebook/vb. sosyal girişi başlatır (PKCE, authorization_code akışı):
 * 1) code_verifier/state üretilip sessionStorage'a yazılır,
 * 2) tarayıcı Identity'nin dış sağlayıcı challenge ucuna gider (oradan Google'a, login sonrası
 *    geri Identity'ye — orada ASP.NET Identity cookie'siyle oturum açılır),
 * 3) Identity, kendi cookie'siyle bizim inşa ettiğimiz `/connect/authorize` URL'ine yönlendirir,
 * 4) OpenIddict authorization code üretip `redirect_uri`'ye (bu SPA'daki /callback) geri döner.
 * Identity'nin cookie tabanlı oturumu ile bu SPA'nın Bearer token tabanlı oturumu FARKLI
 * mekanizmalar olduğundan bu köprü (authorization_code + PKCE) gerekli — düz bir "harici giriş"
 * butonu tek başına SPA'yı login etmiş saymaz (bkz. proje notu).
 */
export async function startExternalLogin(provider: string, remember: boolean): Promise<void> {
  const verifier = randomString(64);
  const state = randomString(24);
  const challenge = await sha256Base64Url(verifier);

  window.sessionStorage.setItem(VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(STATE_KEY, state);
  window.sessionStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");

  const redirectUri = `${window.location.origin}${CALLBACK_PATH}`;
  const authorizeUrl =
    "/connect/authorize?client_id=web&response_type=code" +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("api offline_access")}` +
    `&code_challenge=${challenge}&code_challenge_method=S256` +
    `&state=${state}`;

  // provider, Identity'nin kayıtlı authentication scheme adıyla BİREBİR aynı olmalı (örn. "Google",
  // küçük harfe çevrilmemeli) — bkz. AccountApiController.ExternalLogin, Challenge(properties, provider).
  const externalLoginUrl =
    `${IDENTITY_URL}/api/account/external/${encodeURIComponent(provider)}` +
    `?returnUrl=${encodeURIComponent(authorizeUrl)}`;

  window.location.href = externalLoginUrl;
}

export interface PkceExchangeInput {
  verifier: string;
  redirectUri: string;
}

/** /callback sayfasının kod değişimi için PKCE verifier'ı okur — CSRF için state doğrulanır, tek kullanımlık olduğundan hemen silinir. */
export function consumePkceState(receivedState: string | null): PkceExchangeInput | null {
  const savedState = window.sessionStorage.getItem(STATE_KEY);
  const verifier = window.sessionStorage.getItem(VERIFIER_KEY);
  window.sessionStorage.removeItem(STATE_KEY);
  window.sessionStorage.removeItem(VERIFIER_KEY);

  if (!verifier || !savedState || !receivedState || savedState !== receivedState) {
    return null;
  }

  return { verifier, redirectUri: `${window.location.origin}${CALLBACK_PATH}` };
}

/** "Beni Hatırla" tercihini /callback'e taşır (login sayfasındaki checkbox akış boyunca korunsun diye). */
export function consumeRememberFlag(): boolean {
  const value = window.sessionStorage.getItem(REMEMBER_KEY);
  window.sessionStorage.removeItem(REMEMBER_KEY);
  return value !== "0";
}
