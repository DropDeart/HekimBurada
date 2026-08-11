/**
 * Backend'de karşılığı olmayan (Contact entity'si yok) sabit içerik. Announcement artık gerçek veri —
 * bkz. gatewayApi.listAnnouncements (Gateway servisi).
 */
export const CONTACT_COLUMNS = {
  support: [{ label: "Sıkça Sorulan Sorular" }, { label: "Destek Talebi Oluştur" }, { label: "destek@hekimburada.com" }],
  corporate: [{ label: "Hakkımızda" }, { label: "Kariyer" }, { label: "Basın" }],
};
