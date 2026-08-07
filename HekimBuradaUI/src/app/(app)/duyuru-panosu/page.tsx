import { ANNOUNCEMENTS } from "@/lib/staticContent";

export default function DuyuruPanosuPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Duyuru Panosu</h1>
      <p className="mb-8 text-sm text-muted-foreground">Platformdaki son gelişmeler.</p>
      <div className="flex flex-col">
        {ANNOUNCEMENTS.map((a) => (
          <div key={a.title} className="border-t border-border py-4 first:border-t-0">
            <div className="text-sm font-semibold text-foreground">{a.title}</div>
            <div className="text-xs text-muted-foreground">{a.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
