import { auth } from "./auth";

const IDENTITY_URL = process.env.NEXT_PUBLIC_IDENTITY_URL ?? "http://localhost:5090";
const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "http://localhost:5100";
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:5110";
export const MESSAGING_URL = process.env.NEXT_PUBLIC_MESSAGING_URL ?? "http://localhost:5120";

/** HTTP status kodunu taşır — örn. 403 Forbidden'ı çağıran tarafın sessizce (hata toast'ı göstermeden) ele alabilmesi için. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/**
 * BaseForge CodeGen'in ürettiği servisler (Marketplace/Community) doğrulama hatalarını
 * ASP.NET'in standart ValidationProblemDetails şekliyle döner: {title, errors: {Alan: [mesaj]}} —
 * Identity'nin elle yazılmış {error} şeklinden farklı. İkisini de tek mesaja indirger.
 */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: string;
      title?: string;
      errors?: Record<string, string[]>;
    };
    if (body.errors) {
      const first = Object.values(body.errors)[0]?.[0];
      if (first) return first;
    }
    return body.error ?? body.title ?? fallback;
  } catch {
    return fallback;
  }
}

async function reqAt<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    throw new ApiError(await extractErrorMessage(res, res.statusText), res.status);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Bearer token gerektiren istekler için — token yoksa/401 dönerse anlamlı bir hata fırlatır. */
async function authedReqAt<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  if (!token) {
    throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
  }

  return reqAt<T>(baseUrl, path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
}

const req = <T>(path: string, init?: RequestInit) => reqAt<T>(IDENTITY_URL, path, init);
const authedReq = <T>(path: string, init?: RequestInit) => authedReqAt<T>(IDENTITY_URL, path, init);

/** BaseForge CodeGen'in ürettiği tüm liste uçlarının ortak sayfalama şekli. */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export interface Specialty {
  id: string;
  name: string;
}

export interface Me {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  roles: string[];
}

/** Kayıt formundan (login öncesi) çağrılır — anonim. */
export const specialtiesApi = {
  list: () => req<Specialty[]>("/api/specialties"),
};

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

  me: () => authedReq<Me>("/api/account/me"),

  updateProfile: (fullName: string | null) =>
    authedReq<void>("/api/account/profile", {
      method: "PUT",
      body: JSON.stringify({ fullName }),
    }),

  changePassword: (currentPassword: string | null, newPassword: string) =>
    authedReq<void>("/api/account/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  uploadAvatar: async (file: File): Promise<string> => {
    const token = auth.getToken();
    if (!token) {
      throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
    }

    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${IDENTITY_URL}/api/account/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      throw new ApiError(await extractErrorMessage(res, "Fotoğraf yüklenemedi."), res.status);
    }

    return ((await res.json()) as { avatarUrl: string }).avatarUrl;
  },

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

export interface VerificationRow {
  userId: string;
  email: string;
  fullName: string | null;
  specialty: string;
  diplomaNo: string;
  region: string;
  verificationStatus: VerificationStatus;
  hasDocument: boolean;
}

export const adminApi = {
  listVerifications: (status?: VerificationStatus) =>
    authedReq<VerificationRow[]>(
      `/api/admin/verifications${status ? `?status=${encodeURIComponent(status)}` : ""}`
    ),

  approveVerification: (userId: string) =>
    authedReq<void>(`/api/admin/verifications/${userId}/approve`, { method: "POST" }),

  rejectVerification: (userId: string) =>
    authedReq<void>(`/api/admin/verifications/${userId}/reject`, { method: "POST" }),

  /** Belge bir dosya akışı döndürüyor (JSON değil) — Bearer header gerektiği için düz <a href> ile açılamaz. */
  verificationDocumentBlob: async (userId: string): Promise<Blob> => {
    const token = auth.getToken();
    if (!token) {
      throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
    }

    const res = await fetch(`${IDENTITY_URL}/api/admin/verification-document/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Belge alınamadı.");
    }

    return res.blob();
  },

  /** Yalnızca SuperAdmin — backend de aynı kısıtı uygular (403 döner). */
  addSpecialty: (name: string) =>
    authedReq<Specialty>("/api/admin/specialties", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  emailConfirmed: boolean;
  roles: string[];
}

/** Yalnızca Admin rolü — AdminUsersApiController controller seviyesinde bunu zorunlu kılıyor. */
export const adminUsersApi = {
  listRoles: () => authedReq<string[]>("/api/admin/roles"),

  listUsers: () => authedReq<AdminUserRow[]>("/api/admin/users"),

  addUser: (input: { fullName: string | null; email: string }) =>
    authedReq<AdminUserRow>("/api/admin/users", { method: "POST", body: JSON.stringify(input) }),

  deleteUser: (id: string) => authedReq<void>(`/api/admin/users/${id}`, { method: "DELETE" }),

  addRole: (id: string, role: string) =>
    authedReq<void>(`/api/admin/users/${id}/roles`, { method: "POST", body: JSON.stringify({ role }) }),

  removeRole: (id: string, role: string) =>
    authedReq<void>(`/api/admin/users/${id}/roles/${role}`, { method: "DELETE" }),
};

// ---- Marketplace ----
// BaseForge CodeGen'in ürettiği tam CQRS CRUD servisleri — sunucu tarafında kategoriye/kullanıcıya
// göre filtre YOK (spec.yaml'da tanımlanmadı), bu yüzden liste uçları client-side filtrelenir.

const mReq = <T>(path: string, init?: RequestInit) => reqAt<T>(MARKETPLACE_URL, path, init);
const mAuthedReq = <T>(path: string, init?: RequestInit) => authedReqAt<T>(MARKETPLACE_URL, path, init);

export interface MarketplaceCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export type ListingStatus = "draft" | "active" | "sold" | "removed" | "expired";

export interface Listing {
  id: string;
  title: string;
  description: string;
  condition: string;
  price: number | null;
  originalPrice: number | null;
  paymentMethod: string;
  referansUrl: string | null;
  city: string;
  /** JSON-encoded string dizisi (backend'de düz string alan — encode/decode burada yapılır). */
  images: string;
  status: ListingStatus;
  durationDays: number;
  publishedAt: string | null;
  expiresAt: string | null;
  renewCount: number;
  isFeatured: boolean;
  viewCount: number;
  categoryId: string;
  sellerId: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  condition: string;
  price: number | null;
  originalPrice: number | null;
  paymentMethod: string;
  referansUrl: string | null;
  city: string;
  images: string;
  durationDays: 15 | 30 | 60 | 90;
  isFeatured: boolean;
  categoryId: string;
  sellerId: string;
}

export type OfferStatus = "pending" | "accepted" | "rejected";

export interface Offer {
  id: string;
  amount: number;
  status: OfferStatus;
  listingId: string;
  buyerId: string;
}

export type RequestStatus = "open" | "closed";

export interface MarketplaceRequest {
  id: string;
  title: string;
  description: string;
  budgetMax: number | null;
  status: RequestStatus;
  categoryId: string;
  requesterId: string;
}

export interface Favorite {
  id: string;
  listingId: string;
  userId: string;
}

/** Görsel/dosya yükleme — Marketplace ve Community'de aynı şekilde (POST /api/media). */
async function uploadMedia(baseUrl: string, file: File, category: string): Promise<string> {
  const token = auth.getToken();
  if (!token) {
    throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  const res = await fetch(`${baseUrl}/api/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    throw new ApiError(await extractErrorMessage(res, "Dosya yüklenemedi."), res.status);
  }

  return ((await res.json()) as { url: string }).url;
}

export const marketplaceApi = {
  listCategories: (params?: { page?: number; pageSize?: number; search?: string }) =>
    mAuthedReq<PagedResult<MarketplaceCategory>>(`/api/Categorys${toQuery(params)}`),

  createCategory: (input: { name: string; parentId?: string | null }) =>
    mAuthedReq<string>("/api/Categorys", { method: "POST", body: JSON.stringify(input) }),

  updateCategory: (id: string, input: { name: string; parentId?: string | null }) =>
    mAuthedReq<void>(`/api/Categorys/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteCategory: (id: string) => mAuthedReq<void>(`/api/Categorys/${id}`, { method: "DELETE" }),

  listListings: (params?: { page?: number; pageSize?: number; search?: string }) =>
    mAuthedReq<PagedResult<Listing>>(`/api/Listings${toQuery(params)}`),

  getListing: (id: string) => mAuthedReq<Listing>(`/api/Listings/${id}`),

  createListing: (input: CreateListingInput) =>
    mAuthedReq<string>("/api/Listings", { method: "POST", body: JSON.stringify(input) }),

  updateListing: (id: string, input: CreateListingInput) =>
    mAuthedReq<void>(`/api/Listings/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteListing: (id: string) => mAuthedReq<void>(`/api/Listings/${id}`, { method: "DELETE" }),

  renewListing: (id: string) => mAuthedReq<void>(`/api/Listings/${id}/renew`, { method: "POST" }),

  republishListing: (id: string) =>
    mAuthedReq<void>(`/api/Listings/${id}/republish`, { method: "POST" }),

  /** Anonim — ilan detay sayfası girişsiz de görüntülenebildiğinden auth gerektirmez. */
  incrementListingViewCount: (id: string) =>
    mReq<void>(`/api/Listings/${id}/increment-viewcount`, { method: "POST" }),

  listOffers: (params?: { page?: number; pageSize?: number; search?: string }) =>
    mAuthedReq<PagedResult<Offer>>(`/api/Offers${toQuery(params)}`),

  createOffer: (input: { amount: number; listingId: string; buyerId: string }) =>
    mAuthedReq<string>("/api/Offers", {
      method: "POST",
      body: JSON.stringify({ ...input, status: "pending" }),
    }),

  /** Kabul/red de dahil — backend'de ayrı bir uç yok, durumu PUT ile güncelliyoruz. */
  updateOfferStatus: (id: string, offer: Offer, status: OfferStatus) =>
    mAuthedReq<void>(`/api/Offers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...offer, status }),
    }),

  listRequests: (params?: { page?: number; pageSize?: number; search?: string }) =>
    mAuthedReq<PagedResult<MarketplaceRequest>>(`/api/Requests${toQuery(params)}`),

  createRequest: (input: {
    title: string;
    description: string;
    budgetMax: number | null;
    categoryId: string;
    requesterId: string;
  }) =>
    mAuthedReq<string>("/api/Requests", {
      method: "POST",
      body: JSON.stringify({ ...input, status: "open" }),
    }),

  deleteRequest: (id: string) => mAuthedReq<void>(`/api/Requests/${id}`, { method: "DELETE" }),

  listFavorites: (params?: { page?: number; pageSize?: number }) =>
    mAuthedReq<PagedResult<Favorite>>(`/api/Favorites${toQuery(params)}`),

  addFavorite: (listingId: string, userId: string) =>
    mAuthedReq<string>("/api/Favorites", { method: "POST", body: JSON.stringify({ listingId, userId }) }),

  removeFavorite: (id: string) => mAuthedReq<void>(`/api/Favorites/${id}`, { method: "DELETE" }),

  uploadImage: (file: File) => uploadMedia(MARKETPLACE_URL, file, "listings"),
};

// ---- Community ----

const cAuthedReq = <T>(path: string, init?: RequestInit) => authedReqAt<T>(COMMUNITY_URL, path, init);

export interface CommunityCategory {
  id: string;
  name: string;
}

export interface Membership {
  id: string;
  autoJoined: boolean;
  categoryId: string;
  userId: string;
}

export interface Topic {
  id: string;
  title: string;
  body: string;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  categoryId: string;
  authorId: string;
}

export interface CommunityComment {
  id: string;
  body: string;
  topicId: string;
  authorId: string;
}

export interface Like {
  id: string;
  topicId: string;
  authorId: string;
}

export const communityApi = {
  listCategories: (params?: { page?: number; pageSize?: number }) =>
    cAuthedReq<PagedResult<CommunityCategory>>(`/api/communitycategorys${toQuery(params)}`),

  createCategory: (name: string) =>
    cAuthedReq<string>("/api/communitycategorys", { method: "POST", body: JSON.stringify({ name }) }),

  deleteCategory: (id: string) =>
    cAuthedReq<void>(`/api/communitycategorys/${id}`, { method: "DELETE" }),

  listMemberships: (params?: { page?: number; pageSize?: number }) =>
    cAuthedReq<PagedResult<Membership>>(`/api/memberships${toQuery(params)}`),

  listTopics: (params?: { page?: number; pageSize?: number; search?: string }) =>
    cAuthedReq<PagedResult<Topic>>(`/api/topics${toQuery(params)}`),

  getTopic: (id: string) => cAuthedReq<Topic>(`/api/topics/${id}`),

  createTopic: (input: { title: string; body: string; categoryId: string; authorId: string }) =>
    cAuthedReq<string>("/api/topics", {
      method: "POST",
      body: JSON.stringify({ ...input, viewCount: 0, isPinned: false, isLocked: false }),
    }),

  deleteTopic: (id: string) => cAuthedReq<void>(`/api/topics/${id}`, { method: "DELETE" }),

  listComments: (params?: { page?: number; pageSize?: number }) =>
    cAuthedReq<PagedResult<CommunityComment>>(`/api/comments${toQuery(params)}`),

  createComment: (input: { body: string; topicId: string; authorId: string }) =>
    cAuthedReq<string>("/api/comments", { method: "POST", body: JSON.stringify(input) }),

  deleteComment: (id: string) => cAuthedReq<void>(`/api/comments/${id}`, { method: "DELETE" }),

  listLikes: (params?: { page?: number; pageSize?: number }) =>
    cAuthedReq<PagedResult<Like>>(`/api/likes${toQuery(params)}`),

  createLike: (input: { topicId: string; authorId: string }) =>
    cAuthedReq<string>("/api/likes", { method: "POST", body: JSON.stringify(input) }),

  removeLike: (id: string) => cAuthedReq<void>(`/api/likes/${id}`, { method: "DELETE" }),

  uploadImage: (file: File) => uploadMedia(COMMUNITY_URL, file, "topics"),
};

function toQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
}

// ---- Messaging ----
// Her Message bir OfferId'ye bağlı (bkz. spec) — teklif pazarlığı sohbeti bu şekilde modellenir.
// Liste ucunda offerId filtresi yok, client-side filtrelenir. Gerçek zamanlı teslimat için
// /hubs/messages SignalR hub'ı kullanılır (bkz. src/lib/messageHub.ts).

const msgAuthedReq = <T>(path: string, init?: RequestInit) =>
  authedReqAt<T>(MESSAGING_URL, path, init);

export interface Message {
  id: string;
  body: string;
  offerId: string;
  senderId: string;
}

export const messagingApi = {
  listMessages: (params?: { page?: number; pageSize?: number }) =>
    msgAuthedReq<PagedResult<Message>>(`/api/Messages${toQuery(params)}`),

  sendMessage: (input: { body: string; offerId: string; senderId: string }) =>
    msgAuthedReq<string>("/api/Messages", { method: "POST", body: JSON.stringify(input) }),
};
