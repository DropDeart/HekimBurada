# HekimBurada — Prod Deploy Notları

**Durum (2026-08-07): Deploy yarım kaldı, yeni sunucu/domain bekleniyor.**

## Denenen sunucu (213.142.150.174) — neden vazgeçildi

Kullanıcının mevcut Linux sunucusuna (Ubuntu 22.04, root erişimi) deploy denendi. Önce
sunucudaki `pharma-trace` docker compose projesi (container: trace-web/trace-api/trace-postgres/
trace-redis, image: `ghcr.io/dropdeart/trace-track/*`, dizin: `/opt/pharma-trace*`) tamamen
temizlendi — container'lar, volume'lar, image'lar ve `/opt`/`/tmp` altındaki artık dosyalar
silindi. Sunucudaki diğer projelere (harunberkbal-*, baseforge-identity, baseforge-orders,
identity-svc, orders-svc — hepsi ayrı/ilgisiz canlı projeler) dokunulmadı.

Ardından iki engelleyici sorun bulundu, ikisi de kullanıcı kararı gerektirdiği için deploy
durduruldu:

1. **Kaynak yetersizliği**: Sunucu **1 vCPU / ~1GB RAM** (deploy denemesi sırasında sadece
   ~408MB "available", 612MB zaten swap'a düşmüş). HekimBurada'nın local-dev mimarisi 5 ayrı
   .NET servisi (Identity/Marketplace/Community/Messaging/Gateway) + **5 ayrı Postgres
   container'ı** + RabbitMQ + Next.js frontend'den oluşuyor — gerçekçi tahmin 1.5-2GB+ RAM.
   Olduğu gibi ayağa kaldırmak, aynı kutuda çalışan diğer müşteri sitelerini (harunberkbal vb.)
   OOM ile düşürme riski taşıyor. Seçenekler kullanıcıya soruldu (5 servisi tek paylaşılan
   Postgres'e konsolide et / VPS'i büyüt / riski kabul et) — henüz karar verilmedi.

2. **Domain çakışması**: Kullanıcının verdiği `furkanrecepcinar.com` ve `api.furkanrecepcinar.com`
   o sunucuda **zaten aktif başka bir site tarafından kullanılıyor** (nginx'te canlı config +
   geçerli Let's Encrypt sertifikası — muhtemelen kişisel portfolyo sitesi). Üzerine yazılmadı.
   Önerilen alternatif: `hekimburada.furkanrecepcinar.com` + servis başına alt-subdomain
   (`hekimburada-identity/marketplace/community/messaging.furkanrecepcinar.com`) — henüz
   onaylanmadı.

**Karar**: Kullanıcı başka bir sunucu + domain temin edecek, o zaman deploy'a kaldığımız
yerden devam edilecek. Sunucu erişim bilgileri (IP/parola) bu dosyaya veya repoya YAZILMADI —
gerektiğinde konuşma içinde paylaşılacak.

## Sıradaki adımlar (yeni sunucu geldiğinde)

1. Yeni sunucuda `docker`, `docker compose`, `git`, `nginx`, `certbot` kurulu mu kontrol et,
   kaynakları (RAM/CPU/disk) ölç.
2. Yukarıdaki iki açık soruyu (Postgres konsolidasyonu + subdomain şeması) netleştir.
3. SMTP: local'de Mailpit (sahte SMTP) kullanılıyordu — prod'da gerçek e-posta doğrulama/bildirim
   göndermek için gerçek bir SMTP hesabı gerekiyor, henüz belirlenmedi (yoksa e-posta gönderimi
   sessizce çalışmaz, akış bozulmaz).
4. Prod secret'ları üret: her serviste appsettings.json'daki `change_me` DB parolaları,
   RabbitMQ kimlik bilgileri, OpenIddict imzalama sertifikası — hiçbiri local dev değerleriyle
   internete açılmamalı.
5. `git clone https://github.com/DropDeart/HekimBurada.git` ile sunucuya çek, servisleri
   `docker compose up --build -d` ile (scripts/up.ps1'in bash eşdeğeriyle) ayağa kaldır.
6. Her subdomain için nginx reverse-proxy config + `certbot --nginx` ile sertifika (mevcut
   `api.harunberkbal.com` config'i şablon olarak kullanılabilir — bkz. sunucudaki
   `/etc/nginx/sites-available/api.harunberkbal.com`).
7. Frontend'in `NEXT_PUBLIC_IDENTITY_URL`/`NEXT_PUBLIC_MARKETPLACE_URL`/
   `NEXT_PUBLIC_COMMUNITY_URL`/`NEXT_PUBLIC_MESSAGING_URL` env değişkenlerini prod
   subdomain'lerine göre ayarla (frontend her servise doğrudan bağlanıyor, Gateway'i
   kullanmıyor — bkz. `src/lib/api.ts`).
