export default function DogrulamaSureciPage() {
  const steps = [
    {
      title: "E-posta ve uzmanlık bilgilerinizle kayıt olun",
      desc: "Ad-soyad, e-posta, uzmanlık alanınız (listeden seçilir), diploma/tescil numaranız ve bölgenizi girin.",
    },
    {
      title: "E-postanızı doğrulayın",
      desc: "Kayıt sonrası e-postanıza gelen 6 haneli kodu girerek adresinizi doğrulayın.",
    },
    {
      title: "Doktorluk belgenizi yükleyin",
      desc: "JPEG, PNG veya PDF formatında doktorluk belgenizi (e-Devlet doktor bilgi bankası dosyası vb.) profilinizden yükleyin.",
    },
    {
      title: "Admin onayı",
      desc: "Belgeniz admin tarafından incelenir; onaylandığında hesabınız tam olarak aktif olur.",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Doğrulama Süreci</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        HekimBurada, yalnızca doğrulanmış doktorların katılabildiği kapalı bir platformdur.
        Doğrulama şu adımlardan oluşur:
      </p>
      <div className="flex flex-col gap-5">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-4">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {i + 1}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{step.title}</div>
              <div className="text-sm text-muted-foreground">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
