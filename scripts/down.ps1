# HekimBurada — tüm stack'i durdurur (veriyi korur; -v ile çağırmak için her klasörde elle 'docker compose down -v' kullanın).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$services = @(
    "HekimBurada.Gateway",
    "HekimBurada.Messaging",
    "HekimBurada.Community",
    "HekimBurada.Marketplace",
    "HekimBurada.Identity"
)

foreach ($service in $services) {
    Write-Host "== $service ==" -ForegroundColor Cyan
    Push-Location (Join-Path $root "services/$service")
    docker compose down
    Pop-Location
}

Write-Host "== RabbitMQ ==" -ForegroundColor Cyan
Push-Location $root
docker compose down
Pop-Location
