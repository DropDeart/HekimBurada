# HekimBurada — Prod Deploy Notları

**Durum (2026-08-15): Canlı.** `hekimburada.com` üzerinde, 213.142.150.174 sunucusunda.

## Yayında olanlar

- UI: `https://hekimburada.com` (+ `www.`)
- Identity: `https://identity.hekimburada.com`
- Gateway: `https://gateway.hekimburada.com`
- Community: `https://community.hekimburada.com`
- Marketplace: `https://marketplace.hekimburada.com`
- Messaging: `https://messaging.hekimburada.com` (SignalR hub: `/hubs/messages`)

Hepsi Let's Encrypt sertifikalı (tek sertifika, `www.hekimburada.com` adı altında, otomatik yenileniyor).

## Mimari notları

- Her mikroservis kendi izole Postgres'iyle, sunucuda `/root/apps/hekimburada/services/<Servis>/docker-compose.server.yml` ile ayakta (repo'ya commit edilmez — bkz. `.gitignore`, sunucuya özel host portu/network detayları içerir).
- Servisler birbirine `host.docker.internal` ile DEĞİL, paylaşımlı bir external Docker network'ü (`hekimburada-prod-network`) üzerinden container adıyla ulaşıyor. `Auth:Authority` / `Grpc:Identity` gibi adresler artık appsettings.json'da hardcoded değil, env ile override edilebiliyor (bkz. Program.cs'teki `builder.Configuration["Auth:Authority"] ?? "..."` deseni).
- Repo'da EF Core migration yok — şema `Database.EnsureCreated()` ile oluşturuluyor, bu artık yalnızca `IsDevelopment()` değil HER ortamda çalışıyor (prod dahil, aksi halde ilk deploy'da şema hiç oluşmazdı).
- Identity'nin OpenIddict imzalama sertifikası kalıcı (sunucuda `services/HekimBurada.Identity/certs/signing.pfx`, host bind-mount) — container restart'ında JWT'ler geçersiz olmuyor.
- HekimBuradaUI (Next.js): `output: "standalone"` ile build ediliyor, `NEXT_PUBLIC_*` URL'leri (Identity/Marketplace/Community/Messaging/Gateway) **build-time**'da `docker build --build-arg` ile gömülüyor — runtime'da değiştirilemez, URL değişirse image yeniden build edilmeli.

## Bekleyen işler

1. **SMTP**: Identity hâlâ gerçek bir transactional sağlayıcıya (Brevo/Resend/SES vb.) bağlı değil — `Smtp__Host/Port/Username/Password` sunucudaki `.env.server`'da boş. Gelene kadar e-posta doğrulama/bildirim gönderimi sessizce başarısız olur.
2. **OpenIddict encryption key hâlâ ephemeral**: `AddEphemeralEncryptionKey()` (Program.cs) imzalama sertifikasından bağımsız, koşulsuz ephemeral — refresh token/authorization code şifrelemesi için kullanılıyor olabilir, container restart'ında aktif refresh token akışları kesintiye uğrayabilir. Signing cert'in yanına kalıcı bir encryption cert eklemek (aynı desen) ileride yapılabilir.
3. Prod secret'ları (Postgres × 5, RabbitMQ, seed admin, signing cert parolası) sunucudaki ilgili `services/*/.env.server` dosyalarında — hiçbiri git'e girmedi.
