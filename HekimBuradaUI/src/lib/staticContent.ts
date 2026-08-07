/**
 * Backend'de karşılığı olmayan (Announcement/Contact entity'si yok) sabit içerikler.
 * Navbar mega-menüsü ve ilgili tam sayfa aynı veriyi paylaşır.
 */
export const ANNOUNCEMENTS = [
  { title: "Yeni kategori: Radyoloji Cihazları eklendi", date: "3 Ağu 2026" },
  { title: "Platform kullanım kuralları güncellendi", date: "28 Tem 2026" },
  { title: "Doğrulama süreci hızlandırıldı", date: "20 Tem 2026" },
];

export const CONTACT_COLUMNS = {
  support: [{ label: "Sıkça Sorulan Sorular" }, { label: "Destek Talebi Oluştur" }, { label: "destek@hekimburada.com" }],
  corporate: [{ label: "Hakkımızda" }, { label: "Kariyer" }, { label: "Basın" }],
};
