import type { ReactNode } from "react";

/**
 * Prototipteki (Doktor Pazaryeri tasarımı) split-screen auth ekranı: solda görsel + başlık,
 * sağda form. Gerçek fotoğraf yerine placeholder bir çizgili doku kullanılıyor.
 */
export function AuthShell({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-wrap bg-white">
      <div
        className="relative flex min-h-[320px] flex-1 basis-[420px] items-end"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #EEF1F2, #EEF1F2 14px, #E4E8EA 14px, #E4E8EA 28px)",
        }}
      >
        <div className="p-14 text-foreground">
          <div className="mb-3.5 font-mono text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
            Görsel: doktorlar / klinik fotoğrafı
          </div>
          <h1 className="mb-3 max-w-[420px] text-[34px] leading-tight font-bold text-foreground">
            {heading}
          </h1>
          <p className="max-w-[400px] text-[15px] text-[#4A5053]">{subheading}</p>
        </div>
      </div>

      <div className="flex flex-1 basis-[420px] items-center justify-center p-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
