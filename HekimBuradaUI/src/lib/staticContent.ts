/**
 * Backend'de karşılığı olmayan (Contact entity'si yok) sabit içerik. Announcement artık gerçek veri —
 * bkz. gatewayApi.listAnnouncements (Gateway servisi).
 */
export const CONTACT_COLUMNS = {
  support: [{ label: "Sıkça Sorulan Sorular" }, { label: "Destek Talebi Oluştur" }],
  corporate: [{ label: "Hakkımızda" }, { label: "Kariyer" }, { label: "Basın" }],
};

export const CONTACT_EMAIL = "info@hekimburada.com";

export const OFFICE_ADDRESS = {
  full: "Etlik Mahallesi Ayvalı Caddesi No:40/1, Keçiören/Ankara",
  mapsQuery: "Etlik Mahallesi Ayvalı Caddesi No:40/1, Keçiören/Ankara",
  streetAddress: "Etlik Mahallesi Ayvalı Caddesi No:40/1",
  addressLocality: "Keçiören",
  addressRegion: "Ankara",
  addressCountry: "TR",
};
