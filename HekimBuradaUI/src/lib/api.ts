import { auth } from "./auth";

const IDENTITY_URL = process.env.NEXT_PUBLIC_IDENTITY_URL ?? "http://localhost:5090";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${IDENTITY_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string; title?: string };
      message = body.error ?? body.title ?? message;
    } catch {
      // gövde yok/JSON değil — statusText'e düş
    }
    throw new Error(message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Bearer token gerektiren istekler için — token yoksa/401 dönerse anlamlı bir hata fırlatır. */
async function authedReq<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  if (!token) {
    throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
  }

  return req<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  diplomaNo: string;
  region: string;
}

export interface RegisterResult {
  userId: string;
}

export interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface DoctorProfile {
  specialty: string;
  diplomaNo: string;
  region: string;
  verificationStatus: VerificationStatus;
  hasDocument: boolean;
}

export const identityApi = {
  register: (input: RegisterInput) =>
    req<RegisterResult>("/api/account/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  verifyEmail: (userId: string, code: string) =>
    req<void>("/api/account/verify-email", {
      method: "POST",
      body: JSON.stringify({ userId, code }),
    }),

  resendVerification: (userId: string) =>
    req<void>("/api/account/resend-verification", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  login: async (email: string, password: string): Promise<TokenResult> => {
    const res = await fetch(`${IDENTITY_URL}/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "spa-client",
        scope: "api",
        username: email,
        password,
      }),
    });

    if (!res.ok) {
      let message = "Giriş başarısız.";
      try {
        const body = (await res.json()) as { error_description?: string };
        message = body.error_description ?? message;
      } catch {
        // gövde yok/JSON değil
      }
      throw new Error(message);
    }

    return (await res.json()) as TokenResult;
  },

  doctorProfile: () => authedReq<DoctorProfile>("/api/account/doctor-profile"),

  uploadVerificationDocument: async (file: File): Promise<void> => {
    const token = auth.getToken();
    if (!token) {
      throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
    }

    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${IDENTITY_URL}/api/account/verification-document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      let message = "Belge yüklenemedi.";
      try {
        const body = (await res.json()) as { error?: string };
        message = body.error ?? message;
      } catch {
        // gövde yok/JSON değil
      }
      throw new Error(message);
    }
  },
};
