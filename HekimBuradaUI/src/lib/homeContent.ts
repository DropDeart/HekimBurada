/**
 * Ana sayfanın ve /sss sayfasının pazarlama metinleri — backend'de karşılığı olan bir entity'si yok,
 * bilinçli olarak sabit içerik. Tek kaynakta durmasının sebebi: ana sayfadaki kısa SSS bloğu ile
 * /sss sayfasının aynı soruları göstermesi (ikisi ayrışırsa Google'a çelişkili içerik gider).
 *
 * NOT: Burada asla doğrulanamayan sayısal iddia (üye sayısı, ilan sayısı vb.) tutmuyoruz — platform
 * henüz halka açılmadı, böyle bir rakam arama sonucunda gerçek bir taahhüde dönüşüyor.
 */

/** "Nasıl çalışır?" üç adımı. İkonlar HowItWorks bileşeninde sırayla eşleştirilir. */
export const HOW_IT_WORKS = [
  {
    title: "Kayıt ol, belgeni yükle",
    body: "E-posta ile kayıt olup diplomanı ve tabip odası kaydını yüklüyorsun. Onay gelene kadar profilin gizli kalıyor; ilan verme ve topluluklar açılmıyor.",
  },
  {
    title: "İlan ver ya da talep aç",
    body: "Satmak, bağışlamak veya bedelsiz vermek istediğin ürünü fotoğraf, fiyat ve şehirle yayınla. Aradığın bir şey varsa bütçeni yazıp talep aç.",
  },
  {
    title: "Teklifleş, mesajlaş, teslim et",
    body: "Gelen teklifleri kabul et veya reddet, detayları mesajlarda konuş. Karşındaki de doğrulanmış hekim olduğu için kimle konuştuğunu biliyorsun.",
  },
] as const;

/** Doğrulama sürecinin dört adımı — /dogrulama-sureci sayfasının özeti. */
export const VERIFICATION_STEPS = [
  {
    title: "Kayıt ve kimlik bilgisi",
    body: "Ad, soyad ve iletişim bilgisi doğrulanır.",
  },
  {
    title: "Diploma kontrolü",
    body: "Diploma ve uzmanlık belgesi kişi bazlı incelenir.",
  },
  {
    title: "Tabip odası kaydı",
    body: "Aktif oda üyeliği teyit edilmeden ilan verme açılmaz.",
  },
  {
    title: "Onay ve üyelik",
    body: "Onaydan sonra ilan verme, teklif alma, mesajlaşma ve topluluk erişiminin tamamı açılır.",
  },
] as const;

/**
 * İlan yayınlarken seçilebilen ödeme yöntemleri. `value` alanları backend'deki
 * Listing.PaymentMethod değerleriyle birebir aynı olmalı — /ilanlar sayfasındaki süzgeç ve
 * ilan detayındaki akış bu değerlere bakıyor.
 */
export const PAYMENT_METHODS = [
  { value: "kart", label: "Kredi kartı", short: "Kart" },
  { value: "elden", label: "Elden teslim", short: "Elden teslim" },
  { value: "bagis", label: "Bağış ile ödeme", short: "Bağış ile" },
  { value: "bedelsiz", label: "Bedelsiz ürün", short: "Bedelsiz" },
  { value: "referans", label: "Referans linkli indirim", short: "Referanslı" },
] as const;

/**
 * Ana sayfada gösterilecek alt kategoriler. ID yerine İSİMLE eşleştiriliyor: kategori ağacı admin
 * panelinden yönetiliyor ve ID'ler ortamdan ortama (lokal/prod) değişiyor, isim ise sabit.
 * Eşleşme bulunamazsa kart sessizce atlanır — yanlış linkli kart göstermektense hiç göstermemek iyi.
 */
export const FEATURED_SUBCATEGORIES = [
  { name: "Tıbbi Cihaz", blurb: "Ultrason, EKG, monitör" },
  { name: "Muayenehane", blurb: "Devren muayenehane, klinik" },
  { name: "Muayenehane Mobilyası", blurb: "Masa, tabure, sedye" },
  { name: "Bilgisayar ve Elektronik", blurb: "Dizüstü, tablet, kamera" },
  { name: "Kitap ve Yayın", blurb: "TUS kaynakları, atlas" },
  { name: "Otomobil", blurb: "İkinci el araç ilanları" },
] as const;

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Sıkça sorulan sorular. İlk {@link HOME_FAQ_COUNT} tanesi ana sayfada, tamamı /sss sayfasında
 * gösterilir; /sss ayrıca bu listeden FAQPage JSON-LD üretir.
 */
export const FAQ: FaqItem[] = [
  {
    question: "Kimler üye olabilir?",
    answer:
      "Türkiye'de diploması ve tabip odası kaydı doğrulanabilen hekimler ve diş hekimleri. Şirketler, tedarikçiler ve öğrenciler üye olamaz.",
  },
  {
    question: "Üyelik ücretli mi?",
    answer:
      "Kayıt, ilan verme, talep açma ve topluluk kullanımı ücretsizdir.",
  },
  {
    question: "Sadece tıbbi ürün mü satılıyor?",
    answer:
      "Hayır. Tıbbi cihaz ve muayenehane ekipmanının yanında elektronik, ev eşyası, kitap, giyim, bebek ürünleri, emlak ve araç ilanları da var — ikinci el pazaryerinin tamamı hekimlere açık.",
  },
  {
    question: "Ödeme ve teslimat nasıl yapılıyor?",
    answer:
      "Teklif kabul edildikten sonra taraflar mesajlar üzerinden anlaşır. Kredi kartı, elden teslim, bedelsiz ve bağış ile ödeme seçenekleri ilanda belirtilir.",
  },
  {
    question: "Belgem ne kadar sürede onaylanır?",
    answer:
      "Belgeleriniz elle incelenir. Eksik veya okunmayan belgede e-posta ile dönüş yapılır; sürecin hangi adımda olduğunu profilinizden takip edebilirsiniz.",
  },
  {
    question: "İlanımı ücretsiz olarak bağışlayabilir miyim?",
    answer:
      "Evet. İlanı yayınlarken ödeme yöntemi olarak \"bedelsiz ürün\" seçerseniz ürün karşılıksız verilir. \"Bağış ile ödeme\" seçeneğinde ise alıcı, bedelini sizin belirlediğiniz kuruma bağışlar ve dekontu ilana ekler.",
  },
  {
    question: "İlanım neden yayına girmedi?",
    answer:
      "Yeni ilanlar yayına girmeden önce incelenir. Eksik fotoğraf, yanıltıcı başlık veya platform kurallarına aykırı ürün içeren ilanlar reddedilir; ilanlarım sayfasından durumunu ve ret gerekçesini görebilirsiniz.",
  },
  {
    question: "Hesabımı nasıl silerim?",
    answer:
      "Profil sayfanızdan hesap silme talebinde bulunabilirsiniz. Açık ilanlarınız ve bekleyen teklifleriniz varsa önce onların kapanması gerekir.",
  },
];

/** Ana sayfada gösterilen soru sayısı — kalanı /sss sayfasında. */
export const HOME_FAQ_COUNT = 5;
