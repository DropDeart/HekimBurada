import { CONTACT_COLUMNS } from "@/lib/staticContent";

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-bold text-foreground">İletişim</h1>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div>
          <div className="mb-3 text-sm font-bold text-foreground">Bize Ulaşın</div>
          <div className="flex flex-col gap-2">
            {CONTACT_COLUMNS.support.map((s) => (
              <div key={s.label} className="text-sm text-muted-foreground">
                {s.label}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 text-sm font-bold text-foreground">Kurumsal</div>
          <div className="flex flex-col gap-2">
            {CONTACT_COLUMNS.corporate.map((c) => (
              <div key={c.label} className="text-sm text-muted-foreground">
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
