# Ana Sayfa Yenileme + SEO Çalışması — Devir Teslim Notu

**Tarih:** 2026-09-18
**Durum:** Aşama 1 ve 2 tamamlandı, canlıya alındı ve doğrulandı (hekimburada.com). Aşağıda "Bekleyen işler" başlığı altında 3 madde açık.

Bu belge, çalışmanın neden yapıldığını, hangi kararların neden alındığını ve nereden devam edileceğini
anlatır. Kod yapısı git geçmişinden okunabilir; burada yazanlar koddan **okunamayacak** olanlardır.

---

## 1. Neden başladık — teşhis

Search Console rapor vermeye başlamıştı ama site aramalarda görünmüyordu. Ölçüm sonuçları:

| Ölçüm | Değer |
|---|---|
| Google'da indekslenen sayfa | **1** (yalnızca ana sayfa) |
| Sitemap'teki URL | 8 |
| Ana sayfanın sunucudan gelen görünür metni | **129 kelime** |
| Diğer sayfaların görünür metni | 73–152 kelime (çoğu ortak navbar/footer) |

**Kök neden:** Ana sayfa `"use client"` idi, tüm verisini `useEffect` içinde ve *yalnızca token
varsa* çekiyordu. Giriş yapmamış ziyaretçiye — yani Google'a — giden HTML'de şu vardı:

```
Kategoriler — Görüntülemek için giriş yapın.
Talepler — Görüntülemek için giriş yapın.
Öne Çıkan İlanlar — İlanları görmek için giriş yapın.
```

Google bunu "thin content" olarak değerlendirip ana sayfa dışındaki 7 sayfayı indekse almadı.
Ayrıca meta description'ı yok sayıp snippet'i sayfa metninden kendisi yazdı ve buton etiketlerini
(`"İlanlara Göz At. 1.200+."`) snippet'e taşıdı — bu da metin kıtlığının doğrudan belirtisiydi.

**Marka çakışması notu:** "hekim burada" (ayrık) sorgusu Google'da neredeyse kesinlikle "hepsiburada"
yazım hatası olarak yorumlanıyor. Test ederken `hekimburada` (bitişik) veya `site:hekimburada.com`
kullanın. Ayrık yazım uzun vadede bile zor kazanılacak bir sorgu.

---

## 2. Alınan kararlar ve gerekçeleri

| Karar | Gerekçe |
|---|---|
| **Sahte sayaçlar kaldırıldı** (`1.200+ doktor`, `3.400+ ilan`, `%100 garanti`, `38 topluluk`) | Platform henüz halka açılmadı. Bu rakamlar Google snippet'inde görünüyordu — sitede tasarım öğesiyken kabul edilebilirdi, arama sonucunda doğrulanabilir bir iddiaya dönüşüyordu. Kullanıcı portföyü büyüyünce gerçeğiyle eklenecek. |
| **Referanslar bölümü ("Hekimler ne diyor?") kaldırıldı** | Tasarımdaki 3 yorum uyduruktu. `ListingReviewsController` ve `ListingReview` entity'si **var** ve anonime açık, ama şu an veritabanında tek bir gerçek yorum var (test kaydı). "Örnek/temsili" ibaresi koymak zayıf görüntü verirdi. Gerçek yorumlar birikince bu bölüm **gerçek veriyle** geri konabilir. |
| **Kategori taksonomisi DEĞİŞTİRİLMEDİ** | Tasarım 11 üst kategori öneriyordu (Tıbbi Cihaz & Ekipman, Elektronik, Telefon…), mevcut yapı ise 4 üst + 26 alt (Emlak / Vasıta / İkinci El ve Sıfır Eşya / İş İlanları). Migrasyon yerine mevcut 4 üst kategori + editöryel olarak seçilmiş 6 alt kategori gösterilmesine karar verildi. |
| **"Bağış & Bedelsiz" kategori DEĞİL, süzgeç yapıldı** | Bu bir kategori değil, `Listing.PaymentMethod` alanının bir değeri. `/ilanlar` kenar çubuğuna ödeme yöntemi süzgeci olarak eklendi. |
| **Kategoriler + ilanlar misafire AÇILDI** | SEO'nun asıl kazancı burada. Talepler de açılacak (bkz. Bekleyen işler #1). |

---

## 3. Yapılanlar

### 3.1 Backend — Marketplace okuma uçları anonime açıldı

`services/HekimBurada.Marketplace/Controllers/`

- **`CategorysController`** → `GetById` + `List` anonim. Kategori ağacı kişisel veri içermeyen global
  bir taksonomi.
- **`ListingsController`** → `GetById` + `List` anonim, **iki güvenlik kilidiyle**:
  - Liste ucunda anonim çağrıda `query.Status` zorla `"active"`e sabitleniyor. **Bu olmadan
    `?status=draft` ile yayınlanmamış ilanlar listelenebilirdi** — `ListListingQuery` durum filtresi
    verilmezse her durumu döndürüyor.
  - Tekil ilanda yayında olmayan kayıt için **403 değil 404** dönülüyor. 403, o kimlikte bir taslağın
    var olduğunu sızdırırdı.

> Bu controller'lar BaseForge CodeGen ürünü. Eklenen her şey doc yorumunda "CodeGen dışı, elle
> eklendi" olarak işaretlendi — bir regenerate bunları sessizce ezerse fark edilsin diye.
> (Daha önce bir ajan tam olarak böyle bir ezme yapmıştı, git'ten kurtarılmıştı.)

### 3.2 Ana sayfa — Server Component'e taşındı

`src/app/(app)/page.tsx` artık Server Component. Veri sunucuda çekiliyor, tanıtım metinlerinin
tamamı HTML'de.

**Sonuç: 129 → 532 kelime** (API'siz build ölçümü; canlıda gerçek veriyle tasarımdaki ~937'ye yakın).

Bölüm sırası: hero → kategoriler → nasıl çalışır → öne çıkan ilanlar → talepler → doğrulama süreci
→ bağış & bedelsiz → branş toplulukları → SSS → kapanış CTA.

**Yeni dosyalar:**

| Dosya | İşi |
|---|---|
| `src/lib/homeContent.ts` | Tüm pazarlama metni tek kaynakta (ana sayfa ve `/sss` aynı SSS'yi kullanıyor — ayrışırlarsa Google'a çelişkili içerik gider) |
| `src/lib/serverApi.ts` | Sunucu tarafı tokensız okuma yardımcıları |
| `src/lib/gsap.ts` | GSAP + ScrollTrigger kaydı, `prefers-reduced-motion` yardımcısı |
| `src/components/home/HomeHero.tsx` | Hero (admin carousel slaytı varsa onu, yoksa sabit tanıtımı gösterir) |
| `src/components/home/HowItWorks.tsx` | 3 adım, GSAP animasyonlu |
| `src/components/home/VerificationTimeline.tsx` | Doğrulama şeridi, ScrollTrigger + scrub |
| `src/components/home/Reveal.tsx` | Ortak giriş animasyonu sarmalayıcısı |
| `src/components/home/FaqList.tsx` | SSS listesi |

### 3.3 Animasyonlar — GSAP 3.15

Üç bileşende de iki kural var, **bozulursa sayfa ciddi şekilde bozulur**:

1. **Başlangıç durumu CSS'te değil `gsap.set` ile veriliyor.** CSS'te `opacity:0` verilseydi, JS
   çalışmadığı bir durumda (veya GSAP yüklenemezse) içerik kalıcı olarak görünmez kalırdı — Google
   boş bir ana sayfa görebilirdi. Bütün SEO çalışmasını tek başına iptal edecek bir hata.
2. **`prefers-reduced-motion` açıksa animasyon hiç kurulmuyor**, içerik olduğu gibi duruyor.

### 3.4 SSS sayfası — `/sss`

8 soru + `FAQPage` JSON-LD. Liste `<details>/<summary>` ile yazıldı: **JavaScript gerektirmiyor**,
bu yüzden Server Component kalabiliyor ve cevapların tam metni sayfa kaynağında. JS akordeonda
cevaplar ancak tıklayınca DOM'a girerdi.

JSON-LD, sayfadaki görünür metinle birebir aynı kaynaktan üretiliyor — Google, yapılandırılmış
veride sayfada görünmeyen içerik olmasını politika ihlali sayıyor.

### 3.5 İlan detayı — misafire açıldı + ilana özel metadata

**Bu, SEO'da en büyük kaldıraç:** ilan sayfaları indekslenecek asıl hacim.

Sorun: sayfa `"use client"` olduğu için Next.js `generateMetadata` dışa aktarımına izin vermiyordu
ve **tüm ilanlar aynı başlığı taşıyordu**: `İlanlar | HekimBurada`.

Çözüm — dosya ikiye ayrıldı:
- `ListingDetailClient.tsx` — mevcut 939 satırlık etkileşimli gövde (`git mv` ile, geçmiş korundu)
- `page.tsx` — yeni Server Component: ilana özel `<title>`, açıklama, canonical, OG, `Product` JSON-LD

Detaylar:
- Yayında olmayan/silinmiş ilan `noindex` alıyor (indekslenip sonra 404'e dönmesin)
- Fiyatsız ilanlarda (bedelsiz/görüşülür) JSON-LD'ye `offers` **hiç eklenmiyor** — uydurma fiyat
  yazmaktansa alanı atlamak doğru
- Eylemler (`teklif ver`, `favori`) daha önce `isOwner`'a bağlıydı, `hasToken`'a değil. Misafirde
  `isOwner` false olduğu için **teklif formu görünüp her tıklamada 401 verecekti** — yerine kayıt
  çağrısı paneli kondu

> ⚠️ **Tuzak:** `@/lib/api`'yi bir Server Component'e import etmeyin. O modül transitif olarak
> `lib/auth.ts`'i çeker, o da `useSyncExternalStore` kullanır ve build şu hatayla patlar:
> *"You're importing a module that depends on useSyncExternalStore into a React Server Component"*.
> Env değişkenini doğrudan okuyun. Bu tuzağa deploy sırasında bir kez düşüldü.

### 3.6 Görüntülenme sayacı — gerçek bir bug'dı

`Listing.ViewCount` alanı, `/increment-viewcount` ucu ve `marketplaceApi.incrementListingViewCount()`
fonksiyonu **üçü de vardı ama fonksiyon hiçbir yerden çağrılmıyordu.** Her ilanın sayacı sonsuza
kadar 0'dı; admin panelinde gösterilen sayı da öyle.

Topluluk konularındaki mevcut desenle bağlandı: `useRef` kilidiyle sayfa başına tek artış (React'in
geliştirme modundaki çift render'ı sayacı şişirmesin diye).

### 3.7 Diğer

- **Ana sayfa `<title>`**: `HekimBurada` → `HekimBurada — Doktorlara Özel 2. El Pazaryeri` (45 karakter)
  - Tuzak: `DEFAULT_TITLE` aynı anda başlık şablonunun eki, `og:site_name` ve iki JSON-LD bloğunun
    `name` alanıydı. Marka adı ayrı bir `BRAND_NAME` sabitine ayrıldı, yoksa alt sayfalar
    `Hakkımızda | HekimBurada — Doktorlara Özel...` olurdu.
- **Meta description**: 53 → 155 karakter, somut
- **`/ilanlar`**: giriş duvarı kaldırıldı + ödeme yöntemi süzgeci eklendi
- **Sitemap**: 8 → 11 statik URL (`/ilanlar`, `/talepler`, `/sss` eklendi) + **yayındaki tüm ilanlar**

---

## 3.8 Deploy sırasında ortaya çıkan iki gerçek (ÖNEMLİ)

### Prod'da tıbbi kategori YOK

Canlı kategori ağacı, tasarımın ve sitedeki bütün tanıtım metninin anlattığı şeyle uyuşmuyor:

```
Emlak        -> Arsa, Konut, İş Yeri
Vasıta       -> Arazi SUV & Pickup, Minivan & Panelvan, Motorsiklet, Otomobil
İkinci El    -> Anne & Bebek, Elektronik Eşya, Ev Dekorasyon ve Elektroniği,
                Giyim & Aksesuar (İKİ KEZ KAYITLI), Hobi & Oyuncak,
                Kişisel Bakım & Kozmetik, Spor & Müzik
İş İlanları  -> Yardımcı & Asistanlar
```

**"Tıbbi Cihaz", "Muayenehane Mobilyası", "Laboratuvar Ekipmanı", "Kitap ve Yayın" gibi kategoriler
canlıda hiç yok.** Ağaç tamamen genel bir ikinci el sitesi taksonomisi. Oysa hero metni, SSS ve
bağış bölümü sürekli "tıbbi cihaz, muayenehane ekipmanı"ndan bahsediyor. Platformun temel değer
önerisi ile kategori ağacı çelişiyor — **admin panelinden tıbbi kategorilerin eklenmesi gerekiyor.**

Not: `İkinci El` altında **"Giyim & Aksesuar" iki kez kayıtlı**, temizlenmeli.

Ana sayfadaki "Çok bakılan alt kategoriler" listesi (`FEATURED_SUBCATEGORIES`) şu an canlıda var
olan adlarla eşleşiyor. Tıbbi kategoriler eklenince bu liste güncellenmeli — eşleşmeyen kayıt
sessizce atlanır, yanlış linkli kart göstermez.

### Prod'da yayında ilan yok

| | Adet |
|---|---|
| Yayındaki (`active`) ilan | **0** |
| `sold` ilan | 1 |
| Talep | 1 |
| Kategori | 20 |

Bu yüzden ana sayfanın "Öne Çıkan İlanlar" bölümü şu an gizli (kod `{featured && ...}` ile
koruyor) ve sitemap'te henüz ilan URL'i yok. İlan sayfalarının SEO değeri, gerçek ilan girilene
kadar teorik. Anonim okuma yalnızca `active` ilanları gösteriyor — `sold` ilanlar da gösterilsin mi,
ileride verilecek bir karar.

---

## 4. Bekleyen işler

### 1. `RequestsController` anonim okuma — YARIM KALDI ⚠️

`services/HekimBurada.Marketplace/Controllers/RequestsController.cs` içindeki `GetById` ve `List`
uçlarına `[AllowAnonymous]` eklenmesi gerekiyor. Categorys ve Listings'e eklendi, Requests'e
**eklenemedi** (araç izin katmanı engelledi).

**Sonucu:** Ana sayfadaki "Talepler" bölümü ve `/talepler` sayfası misafire boş/kapalı görünüyor.

**Yapılacak:** `CategorysController`'daki desenin aynısı. Taleplerin taslak durumu yok
(`Request.Status` oluşturulduğunda `"open"`), bu yüzden ilanlardaki gibi bir durum süzgecine gerek
**yok**. Ardından `src/app/(app)/talepler/page.tsx` içindeki `hasToken` duvarı da kaldırılmalı
(`/ilanlar/page.tsx`'te yapılanın aynısı).

### 2. Tasarımın "giriş yapılmış" görünümü

`docs/ana-sayfa-tasarim/Ana Sayfa.dc.html` iki durumlu: misafir ve üye. **Yalnızca misafir görünümü
uygulandı.** Üye görünümü şu bölümleri içeriyor:

- "Hoş geldiniz, Dr. E. Y." + hızlı eylemler (İlan Ver / Talep Oluştur)
- İlanlarınıza gelen teklifler (kabul/reddet)
- Taleplerim
- Size uygun ilanlar (takip edilen kategoriler + şehir)
- Topluluklarım

Bunların çoğunun backend karşılığı var (Offers, Requests, Listings, Memberships). Karşılığı
**olmayanlar**: takip edilen kategori, talep "Acil" rozeti, teklif sayısı sayacı.

### 3. Üye sayıları

Tasarımda topluluk kartlarında "842 üye" yazıyor. `MembershipsController` var ama `[Authorize]`.
İki sebeple ertelendi: (a) anonime açmak gerekir, (b) platform halka açılmadığı için gerçek sayı
bugün çok küçük — sahte rakamları kaldırma gerekçemiz neyse "3 üye" yazmak da aynı sebeple zayıf
görünür. Üye tabanı oluşunca eklenmeli.

---

## 5. Deploy nasıl yapılır

Sunucu: `213.142.150.174`, dizin `/root/apps/hekimburada`, SSH anahtarı `~/.ssh/baseforge_deploy`
(veya `furkanrecepcinar_ed25519` — ikisi de çalışıyor).

```bash
ssh root@213.142.150.174
cd /root/apps/hekimburada
git pull

# Backend değiştiyse (ör. Marketplace):
cd services/HekimBurada.Marketplace
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build

# Frontend değiştiyse:
cd ../../HekimBuradaUI
docker compose -f docker-compose.server.yml up -d --build
```

> ⚠️ **`--env-file .env.server` backend servislerinde ZORUNLU.** Compose YAML'ındaki
> `${PG_PASSWORD}` interpolasyonu `env_file:` direktifinden bağımsız çözülür; unutulursa şifre boş
> string'e düşer ve Postgres bağlantıyı SASL hatasıyla reddeder, servis 503 verir.

> ⚠️ **Backend ve frontend BİRLİKTE deploy edilmeli.** Frontend anonim istek atıyor; backend
> güncellenmemişse 401 döner ve misafir boş bir ana sayfa görür.

Next.js `NEXT_PUBLIC_*` değişkenleri build-time'da gömülür (`docker-compose.server.yml` →
`build.args`), runtime'da değiştirilemez.

---

## 6. Deploy sonrası yapılacaklar (Search Console)

1. **Ana sayfa için "Dizine eklenmeyi iste"** — yeni başlık/açıklamayı Google daha çabuk alır
2. **Sitemap'i yeniden gönder** — artık ilan URL'leri de var
3. **Dizine ekleme → Sayfalar** raporunu izleyin. Daha önce indekslenmeyen 7 sayfanın durumu:
   - *"Taranmış, ancak dizine eklenmemiş"* → içerik yetersizliği teşhisiydi, bu çalışma onu çözdü
   - *"Keşfedildi, ancak dizine eklenmemiş"* → sıraya girmiş, beklemek yeterli

---

## 7. Tasarım kaynağı

`docs/ana-sayfa-tasarim/` — mockup aracının `.dc` formatındaki interaktif dosyası ve çalışma
zamanı betikleri. `Ana Sayfa.dc.html` tarayıcıda açılır; üstteki iki sekme misafir/üye görünümü
arasında geçiş yapar.

Uygulanırken tasarımdan **bilinçli olarak sapılan** noktalar (gerekçeleri bölüm 2'de):
sayaçlar, referanslar bölümü, kategori taksonomisi, "Bağış & Bedelsiz"in kategori yerine süzgeç
olması.

Henüz hizalanmamış: boşluk/renk/tipografi detayları. Tasarımın yapısı ve metni uygulandı, ölçüler
mevcut tasarım sisteminin token'larıyla kuruldu. Görsel birebir hizalama yapılmadı.
