export default function HakkimizdaPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Hakkımızda</h1>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          HekimBurada, yalnızca doğrulanmış doktorların katılabildiği kapalı bir 2. el pazaryeri
          ve topluluk platformudur. Kayıt olan her doktorun kimliği, diploma/tescil bilgisi ve
          uzmanlık alanı admin onayından geçer — platformdaki hiçbir kullanıcı doğrulanmamış
          değildir.
        </p>
        <p>
          Amacımız, meslektaşların tıbbi cihaz, muayenehane ekipmanı, araç ve daha fazlasını
          güvenle alıp satabildiği; branşlarına özel topluluklarda tartışıp bilgi
          paylaşabildiği bir ortam kurmak.
        </p>
      </div>
    </div>
  );
}
