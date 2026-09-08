import { IDENTITY_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const BG_COLORS = [
  "bg-red-100 text-red-700",
  "bg-amber-100 text-amber-700",
  "bg-brand-soft text-brand",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
];

/** İsim/e-postadan tutarlı bir renk seçer — aynı kullanıcı her yerde aynı renkte görünsün diye. */
function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

/**
 * Küçük kullanıcı avatarı — fotoğraf varsa gösterir, yoksa isim/e-postanın baş harfini renkli bir
 * daire içinde gösterir (bkz. proje kararı — sohbet balonlarında kimin yazdığı belli olsun diye).
 */
export function UserAvatar({
  avatarUrl,
  name,
  size = 24,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
}) {
  const label = name?.trim() || "?";
  const initial = label.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- harici (Google vb.) veya Identity'nin kendi statik dosyası olabilir
      <img
        src={avatarUrl.startsWith("http") ? avatarUrl : `${IDENTITY_URL}${avatarUrl}`}
        alt={label}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", colorFor(label))}
    >
      {initial}
    </div>
  );
}
