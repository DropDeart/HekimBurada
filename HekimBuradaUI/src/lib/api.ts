import { auth } from "./auth";

export const IDENTITY_URL = process.env.NEXT_PUBLIC_IDENTITY_URL ?? "http://localhost:5090";
/** Diğer servislerin aksine dışa açık — yüklenen ilan görsellerinin (/uploads/...) src'ini oluşturmak için frontend bileşenlerinde doğrudan kullanılıyor. */
export const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "http://localhost:5100";
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:5110";
export const MESSAGING_URL = process.env.NEXT_PUBLIC_MESSAGING_URL ?? "http://localhost:5120";
/** Diğer servislerin aksine dışa açık — yüklenen görsellerin (/uploads/...) src'ini oluşturmak için (ör. logo/favicon/carousel önizlemesi) frontend bileşenlerinde doğrudan kullanılıyor. */
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";

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

/** Aynı anda birden fazla istek 401 alırsa hepsi tek bir refresh çağrısını paylaşır. */
let refreshInFlight: Promise<string> | null = null;

/** Access token süresi dolduğunda saklanan refresh token'la sessizce yeni bir çift alır. */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) {
    auth.clearToken();
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  const remember = auth.isRemembered();
  const res = await fetch(`${IDENTITY_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "spa-client",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    auth.clearToken();
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  const token = (await res.json()) as TokenResult;
  auth.setToken(token.access_token, remember, token.refresh_token ?? null);
  return token.access_token;
}

/** Bearer token gerektiren istekler için — token yoksa anlamlı bir hata fırlatır, 401 alırsa refresh token'la bir kez yeniden dener. */
async function authedReqAt<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  if (!token) {
    throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
  }

  try {
    return await reqAt<T>(baseUrl, path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      throw err;
    }

    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
    const newToken = await refreshInFlight;

    return reqAt<T>(baseUrl, path, {
      ...init,
      headers: { Authorization: `Bearer ${newToken}`, ...(init?.headers ?? {}) },
    });
  }
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
  districtId: string;
}

export interface RegisterResult {
  userId: string;
}

export interface TokenResult {
  access_token: string;
  refresh_token?: string;
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
  graduationSchool: string | null;
  graduationYear: number | null;
}

export interface Address {
  id: string;
  title: string;
  fullAddress: string;
  districtId: string;
  /** "İlçe, İl" biçiminde önceden biçimlendirilmiş görünen ad — backend'den gelir. */
  region: string;
  phone: string | null;
  createdAt: string;
}

export interface UserLookupRow {
  id: string;
  email: string;
  fullName: string | null;
}

export interface Specialty {
  id: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  name: string;
  districts: District[];
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

/** Kayıt formundaki (login öncesi) ve admin panelindeki (RegionAdmin bölge ataması) kademeli il/ilçe
 * seçimi için — anonim, tek çağrıda tüm il/ilçe ağacı. */
export const regionsApi = {
  list: () => req<Province[]>("/api/regions"),
};

export const identityApi = {
  /** Aktif dış kimlik sağlayıcıları (Google/Facebook/vb.) — sadece config'te ClientId dolu olanlar döner. Anonim. */
  providers: () => req<string[]>("/api/account/providers"),

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
        scope: "api offline_access",
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

  /** Sosyal girişle (Google/Facebook) oluşan hesaplarda specialty/diplomaNo/region boş kalıyor —
   * belge yüklemeden önce bunları tamamlamak için (bkz. kayit-ol/belge-yukle sayfası). */
  updateDoctorProfile: (input: { specialty: string; diplomaNo: string; districtId: string }) =>
    authedReq<void>("/api/account/doctor-profile", { method: "PUT", body: JSON.stringify(input) }),

  updateEducation: (input: { graduationSchool: string | null; graduationYear: number | null }) =>
    authedReq<void>("/api/account/doctor-profile/education", { method: "PUT", body: JSON.stringify(input) }),

  listAddresses: () => authedReq<Address[]>("/api/account/addresses"),

  createAddress: (input: { title: string; fullAddress: string; districtId: string; phone: string | null }) =>
    authedReq<Address>("/api/account/addresses", { method: "POST", body: JSON.stringify(input) }),

  deleteAddress: (id: string) => authedReq<void>(`/api/account/addresses/${id}`, { method: "DELETE" }),

  /** Kullanıcı ID'lerinden email/ad soyad çözer — Admin rolü gerektirmez (bkz. UsersLookupApiController),
   * topluluk üye listesi gibi admin-dışı ekranlarda isim göstermek için. */
  lookupUsers: (ids: string[]) =>
    ids.length === 0
      ? Promise.resolve<UserLookupRow[]>([])
      : authedReq<UserLookupRow[]>(`/api/users?ids=${ids.join(",")}`),

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

  deleteAvatar: () => authedReq<void>("/api/account/avatar", { method: "DELETE" }),

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
  listVerifications: (status?: VerificationStatus, params?: { page?: number; pageSize?: number }) =>
    authedReq<PagedResult<VerificationRow>>(
      `/api/admin/verifications${toQuery({ ...params, status })}`
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

  updateSpecialty: (id: string, name: string) =>
    authedReq<Specialty>(`/api/admin/specialties/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),

  deleteSpecialty: (id: string) =>
    authedReq<void>(`/api/admin/specialties/${id}`, { method: "DELETE" }),
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

  listUsers: (params?: { page?: number; pageSize?: number }) =>
    authedReq<PagedResult<AdminUserRow>>(`/api/admin/users${toQuery(params)}`),

  addUser: (input: { fullName: string | null; email: string }) =>
    authedReq<AdminUserRow>("/api/admin/users", { method: "POST", body: JSON.stringify(input) }),

  deleteUser: (id: string) => authedReq<void>(`/api/admin/users/${id}`, { method: "DELETE" }),

  addRole: (id: string, role: string) =>
    authedReq<void>(`/api/admin/users/${id}/roles`, { method: "POST", body: JSON.stringify({ role }) }),

  removeRole: (id: string, role: string) =>
    authedReq<void>(`/api/admin/users/${id}/roles/${role}`, { method: "DELETE" }),

  /** RegionAdmin rolünü VE doğrulama kuyruğunu filtrelemek için kullanılan "region" claim'ini (artık
   * Province.Id — il bazlı, o ildeki tüm ilçeleri kapsar) tek seferde atar (yalnızca SuperAdmin) —
   * bkz. DoctorVerificationController.AssignRegionAdmin. Sade addRole("RegionAdmin") çağrısı bu
   * claim'i atamadığından RegionAdmin'in kuyruğu boş görünürdü. */
  assignRegionAdmin: (id: string, provinceId: string) =>
    authedReq<void>(`/api/admin/users/${id}/region-admin`, {
      method: "POST",
      body: JSON.stringify({ provinceId }),
    }),
};

// ---- Marketplace ----
// BaseForge CodeGen'in ürettiği tam CQRS CRUD servisleri — sunucu tarafında kategoriye/kullanıcıya
// göre filtre YOK (spec.yaml'da tanımlanmadı), bu yüzden liste uçları client-side filtrelenir.

const mReq = <T>(path: string, init?: RequestInit) => reqAt<T>(MARKETPLACE_URL, path, init);
const mAuthedReq = <T>(path: string, init?: RequestInit) => authedReqAt<T>(MARKETPLACE_URL, path, init);

/** "product": durum+fiyat+ödeme yöntemi (mevcut/varsayılan). "big_ticket": konut/araba gibi —
 * sadece fiyat, ödeme yöntemi sabit "elden". "job": iş ilanı gibi — fiyat/ödeme/durum hiç yok,
 * düz ilan. ilan-ver sihirbazı bu değere göre adımlarını gösterir/gizler. */
export type ListingKind = "product" | "big_ticket" | "job";

export interface MarketplaceCategory {
  id: string;
  name: string;
  parentId: string | null;
  listingKind: ListingKind;
  /** Kategori kartında gösterilen react-icons anahtarı — bkz. lib/categoryIcons.tsx. */
  icon: string;
}

export type ListingStatus = "draft" | "pending" | "active" | "rejected" | "sold" | "removed" | "expired";

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

/** `Listing.images`'ı (JSON-encoded string dizisi) güvenle diziye çevirir — bozuk/boş veride sessizce []. */
export function parseListingImages(images: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(images ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
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

export interface RequestOffer {
  id: string;
  amount: number;
  status: OfferStatus;
  requestId: string;
  responderId: string;
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

export interface ListingReview {
  id: string;
  listingId: string;
  authorId: string;
  /** 1-5 arası. */
  rating: number;
  body: string;
  createdAt: string;
}

export type OrderPaymentMethod = "bagis" | "bedelsiz" | "referans" | "kart" | "elden";

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  paymentMethod: OrderPaymentMethod;
  amount: number;
  status: string;
  donationOrganization: string | null;
  donationReceiptUrl: string | null;
  buyerReferansUrl: string | null;
  deliveryNote: string | null;
  createdAt: string;
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

  createCategory: (input: { name: string; parentId?: string | null; listingKind: ListingKind; icon: string }) =>
    mAuthedReq<string>("/api/Categorys", { method: "POST", body: JSON.stringify(input) }),

  updateCategory: (id: string, input: { name: string; parentId?: string | null; listingKind: ListingKind; icon: string }) =>
    mAuthedReq<void>(`/api/Categorys/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteCategory: (id: string) => mAuthedReq<void>(`/api/Categorys/${id}`, { method: "DELETE" }),

  listListings: (params?: { page?: number; pageSize?: number; search?: string; status?: ListingStatus }) =>
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

  /** Yalnızca Admin/SuperAdmin — 'pending' bir ilanı yayına alır. */
  approveListing: (id: string) => mAuthedReq<void>(`/api/Listings/${id}/approve`, { method: "POST" }),

  /** Yalnızca Admin/SuperAdmin — 'pending' bir ilanı reddeder. */
  rejectListing: (id: string) => mAuthedReq<void>(`/api/Listings/${id}/reject`, { method: "POST" }),

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

  getRequest: (id: string) => mAuthedReq<MarketplaceRequest>(`/api/Requests/${id}`),

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

  /** Talep sahibinin talebi kapatması dahil — backend'de ayrı bir uç yok, tüm alanları PUT ile güncelliyoruz. */
  updateRequest: (id: string, request: MarketplaceRequest, status: RequestStatus) =>
    mAuthedReq<void>(`/api/Requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...request, status }),
    }),

  deleteRequest: (id: string) => mAuthedReq<void>(`/api/Requests/${id}`, { method: "DELETE" }),

  listRequestOffers: (params: { requestId: string; page?: number; pageSize?: number }) =>
    mAuthedReq<PagedResult<RequestOffer>>(`/api/request-offers${toQuery(params)}`),

  createRequestOffer: (input: { amount: number; requestId: string }) =>
    mAuthedReq<string>("/api/request-offers", {
      method: "POST",
      body: JSON.stringify({ ...input, status: "pending" }),
    }),

  /** Kabul/red de dahil — backend'de ayrı bir uç yok, durumu PUT ile güncelliyoruz. */
  updateRequestOfferStatus: (id: string, offer: RequestOffer, status: OfferStatus) =>
    mAuthedReq<void>(`/api/request-offers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...offer, status }),
    }),

  listFavorites: (params?: { page?: number; pageSize?: number }) =>
    mAuthedReq<PagedResult<Favorite>>(`/api/Favorites${toQuery(params)}`),

  addFavorite: (listingId: string, userId: string) =>
    mAuthedReq<string>("/api/Favorites", { method: "POST", body: JSON.stringify({ listingId, userId }) }),

  removeFavorite: (id: string) => mAuthedReq<void>(`/api/Favorites/${id}`, { method: "DELETE" }),

  uploadImage: (file: File) => uploadMedia(MARKETPLACE_URL, file, "listings"),

  /** Anonim — ilan detay sayfası girişsiz de görüntülenebildiğinden auth gerektirmez. listingId verilmezse tüm yorumlar döner. */
  listListingReviews: (params?: { listingId?: string; page?: number; pageSize?: number }) =>
    mReq<PagedResult<ListingReview>>(`/api/listing-reviews${toQuery(params)}`),

  createListingReview: (input: { listingId: string; rating: number; body: string }) =>
    mAuthedReq<string>("/api/listing-reviews", { method: "POST", body: JSON.stringify(input) }),

  deleteListingReview: (id: string) => mAuthedReq<void>(`/api/listing-reviews/${id}`, { method: "DELETE" }),

  /** Yalnızca çağıranın kendi siparişleri döner (alıcı olarak) — özel/finansal veri. */
  listOrders: (params?: { page?: number; pageSize?: number }) =>
    mAuthedReq<PagedResult<Order>>(`/api/orders${toQuery(params)}`),

  createOrder: (input: {
    listingId: string;
    paymentMethod: OrderPaymentMethod;
    amount: number;
    donationOrganization?: string | null;
    donationReceiptUrl?: string | null;
    buyerReferansUrl?: string | null;
    deliveryNote?: string | null;
  }) => mAuthedReq<string>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
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
  /** Kategorinin ilk üyesi mi — üye çıkarma yetkisi taşır (bkz. backend Membership.IsAdmin doc yorumu). */
  isAdmin: boolean;
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
  createdAt: string;
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

  /** Bir topluluğa katılma — backend UserId'yi çağıranın kendi kimliğiyle ezer, birden fazla topluluğa
   * katılmaya kısıt yok. */
  joinCommunity: (categoryId: string) =>
    cAuthedReq<string>("/api/memberships", {
      method: "POST",
      body: JSON.stringify({ categoryId, autoJoined: false }),
    }),

  /** Kendi üyeliğinden ayrılma veya (topluluk admin'iysen) başka bir üyeyi çıkarma. */
  removeMembership: (membershipId: string) =>
    cAuthedReq<void>(`/api/memberships/${membershipId}`, { method: "DELETE" }),

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

// ---- Gateway ----
// Announcement CRUD'u (duyuru panosu/navbar herkese açık, yönetimi admin panelinde) + site geneli
// ayarlar (logo/favicon/GA/SEO), header/footer menü linkleri, anasayfa carousel'i — diğer servisler
// frontend'e doğrudan bağlı, Gateway'e sadece bu site-content özellikleri için gidiliyor.

const gReq = <T>(path: string, init?: RequestInit) => reqAt<T>(GATEWAY_URL, path, init);
const gAuthedReq = <T>(path: string, init?: RequestInit) => authedReqAt<T>(GATEWAY_URL, path, init);

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** Duyuru görseli — boşsa duyuru panosu/navbar/popup görselsiz render eder. */
  imageUrl: string | null;
  publishedAt: string;
  authorId: string;
}

export interface SiteSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  gaMeasurementId: string | null;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
}

export type MenuItemLocation = "header" | "footer_platform" | "footer_rules";

export interface MenuItem {
  id: string;
  location: MenuItemLocation;
  label: string;
  url: string;
  sortOrder: number;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  /** Başlığın üstünde gösterilen küçük, büyük harfli etiket (ör. "GÜVENİLİR PAZAR YERİ") — boşsa
   * frontend'in varsayılan metnini kullanır. */
  eyebrow: string | null;
  title: string | null;
  /** RichTextEditor'dan gelen HTML — anasayfa hero'sunda dangerouslySetInnerHTML ile render edilir. */
  description: string | null;
  linkUrl: string | null;
  /** CTA buton metni — boşsa frontend "İlanlara Göz At" varsayılanını kullanır. */
  buttonLabel: string | null;
  /** "color" veya "image" — hero section arka planının nasıl render edileceğini belirler. */
  backgroundType: "color" | "image";
  /** Hero section arka plan rengi (hex) — backgroundType "color" iken kullanılır. */
  backgroundColor: string | null;
  /** Hero section'ı tam kaplayan arka plan görseli — backgroundType "image" iken kullanılır. Sağdaki
   * küçük kutu görseli olan imageUrl'den bağımsız, ayrı bir görsel. */
  backgroundImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const gatewayApi = {
  /** Duyuru panosu/navbar herkese açık (login öncesi de görünür) — anonim. */
  listAnnouncements: (params?: { page?: number; pageSize?: number }) =>
    gReq<PagedResult<Announcement>>(`/api/Announcements${toQuery(params)}`),

  /** Yalnızca Admin/SuperAdmin — backend AuthorId'yi çağıranın kendi kimliğiyle dolduruyor, burada
   * gönderilmiyor (boş string geçerli bir Guid değil; gönderilirse JSON deserialize aşamasında
   * patlayıp "The command field is required" hatasına yol açıyordu). */
  createAnnouncement: (input: { title: string; body: string; imageUrl: string | null; publishedAt: string }) =>
    gAuthedReq<string>("/api/Announcements", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateAnnouncement: (
    id: string,
    input: { title: string; body: string; imageUrl: string | null; publishedAt: string; authorId: string }
  ) => gAuthedReq<void>(`/api/Announcements/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteAnnouncement: (id: string) =>
    gAuthedReq<void>(`/api/Announcements/${id}`, { method: "DELETE" }),

  /** Anonim — root layout dahil herkes okuyabilir. */
  getSiteSettings: () => gReq<SiteSettings>("/api/site-settings"),

  updateSiteSettings: (input: SiteSettings) =>
    gAuthedReq<SiteSettings>("/api/site-settings", { method: "PUT", body: JSON.stringify(input) }),

  /** Anonim — Navbar/Footer herkese gösterir. `location` verilmezse tüm menü linkleri döner. */
  listMenuItems: (params?: { location?: MenuItemLocation }) =>
    gReq<MenuItem[]>(`/api/menu-items${toQuery(params)}`),

  createMenuItem: (input: { location: MenuItemLocation; label: string; url: string; sortOrder: number }) =>
    gAuthedReq<MenuItem>("/api/menu-items", { method: "POST", body: JSON.stringify(input) }),

  updateMenuItem: (id: string, input: { location: MenuItemLocation; label: string; url: string; sortOrder: number }) =>
    gAuthedReq<void>(`/api/menu-items/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteMenuItem: (id: string) => gAuthedReq<void>(`/api/menu-items/${id}`, { method: "DELETE" }),

  /** Anonim. `activeOnly` varsayılan false (query verilmezse) — admin sayfası pasifleri de görsün diye
   * açıkça `activeOnly:false` gönderir, anasayfa `activeOnly:true` gönderir. */
  listCarouselSlides: (params: { activeOnly: boolean }) =>
    gReq<CarouselSlide[]>(`/api/carousel-slides${toQuery({ activeOnly: String(params.activeOnly) })}`),

  createCarouselSlide: (input: Omit<CarouselSlide, "id">) =>
    gAuthedReq<CarouselSlide>("/api/carousel-slides", { method: "POST", body: JSON.stringify(input) }),

  updateCarouselSlide: (id: string, input: Omit<CarouselSlide, "id">) =>
    gAuthedReq<void>(`/api/carousel-slides/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteCarouselSlide: (id: string) => gAuthedReq<void>(`/api/carousel-slides/${id}`, { method: "DELETE" }),

  /** Logo/favicon/carousel görseli yükler — category "site" (logo/favicon) veya "carousel". */
  uploadImage: (file: File, category: "site" | "carousel" | "announcements") => uploadMedia(GATEWAY_URL, file, category),
};
