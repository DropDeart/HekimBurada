# HekimBurada — tüm stack'i ayağa kaldırır.
#
# NOT: Her servis CodeGen tarafından kendi İZOLE docker-compose.yml'ında (kendi Postgres'i, kendi
# Docker network'ü) üretiliyor — hepsi içeride aynı 'postgres' servis adını kullandığından TEK bir
# kök docker-compose.yml'a birleştirilemezler (bkz. docs/ARCH.md §5.1 "her üretilen servis kendi
# izole ağında çalışır"). Bu yüzden kökteki docker-compose.yml yalnızca paylaşılan RabbitMQ'yu
# barındırıyor; servisler host.docker.internal üzerinden birbirini buluyor (appsettings.json'a
# üretim anında gömülü). Bu script hepsini doğru sırayla (Identity önce — JWKS discovery,
# Gateway en son — port çözümlemesi zaten codegen zamanında yapıldı) ayağa kaldırır.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== RabbitMQ (paylaşılan broker) ==" -ForegroundColor Cyan
Push-Location $root
docker compose up -d --wait
Pop-Location

$services = @(
    "HekimBurada.Identity",
    "HekimBurada.Marketplace",
    "HekimBurada.Community",
    "HekimBurada.Messaging",
    "HekimBurada.Gateway"
)

foreach ($service in $services) {
    Write-Host "== $service ==" -ForegroundColor Cyan
    Push-Location (Join-Path $root "services/$service")
    docker compose up --build -d --wait
    Pop-Location
}

Write-Host "Tamam. Identity: http://localhost:5090  Gateway: http://localhost:5080  RabbitMQ UI: http://localhost:15672" -ForegroundColor Green
