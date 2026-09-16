import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { CONTACT_COLUMNS, CONTACT_EMAIL, OFFICE_ADDRESS } from "@/lib/staticContent";

export const metadata: Metadata = {
  title: "İletişim",
  description: `HekimBurada destek ve kurumsal iletişim bilgileri — ${CONTACT_EMAIL} üzerinden bize ulaşın.`,
};

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
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-brand hover:underline">
              {CONTACT_EMAIL}
            </a>
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

      <div className="mt-12">
        <div className="mb-3 text-sm font-bold text-foreground">Destek Talebi Oluştur</div>
        <ContactForm />
      </div>

      <div className="mt-12">
        <div className="mb-3 text-sm font-bold text-foreground">Adres</div>
        <p className="mb-4 text-sm text-muted-foreground">{OFFICE_ADDRESS.full}</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <iframe
            title="HekimBurada konum haritası"
            src={`https://www.google.com/maps?q=${encodeURIComponent(OFFICE_ADDRESS.mapsQuery)}&output=embed`}
            className="h-[320px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
