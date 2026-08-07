export default function GizlilikPolitikasiPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Gizlilik Politikası</h1>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Kayıt sırasında verdiğiniz ad-soyad, e-posta, uzmanlık alanı, diploma/tescil numarası
          ve doğrulama belgesi yalnızca kimlik doğrulama amacıyla kullanılır ve admin dışındaki
          üyelerle paylaşılmaz.
        </p>
        <p>
          İlan ve taleplerinizde paylaştığınız bilgiler diğer doğrulanmış doktorlara açıktır.
          Hesabınızı sildiğinizde kişisel verileriniz yasal saklama süreleri dışında sistemden
          kaldırılır.
        </p>
      </div>
    </div>
  );
}
