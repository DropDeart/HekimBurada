# HekimBurada — tüm servislerin Postgres veritabanını (pg_dump) ve upload volume'larını
# (docker run + tar) tek bir zaman damgalı klasöre yedekler. Container'lara dokunmaz, sadece okur.
#
# Kapsam: her servisin kendi Postgres'i + dosya yükleme volume'u (bkz. scripts/up.ps1'deki servis
# izolasyonu notu — her servis kendi bağımsız docker-compose.yml'ında, kendi named volume'larıyla
# çalışıyor). 'docker compose down -v' (bazı servis docker-compose.yml'larının başlığında örnek
# olarak geçiyor) ya da Docker Desktop sıfırlanması bu volume'ları kalıcı olarak siler — bu script
# o riske karşı offline bir kopya çıkarır.
#
# Kullanım:
#   .\scripts\backup.ps1                # backups\<timestamp>\ altına yedek alır
#   .\scripts\backup.ps1 -KeepLast 5     # yedek aldıktan sonra en yeni 5 klasör dışındakileri siler

param(
    [int]$KeepLast = 14
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $root "backups\$timestamp"

$databases = @(
    @{ Container = "hekimburadaidentity-postgres-1";    Db = "hekimburada_identity_db" },
    @{ Container = "hekimburadamarketplace-postgres-1"; Db = "hekimburada_marketplace_db" },
    @{ Container = "hekimburadacommunity-postgres-1";   Db = "hekimburada_community_db" },
    @{ Container = "hekimburadamessaging-postgres-1";   Db = "hekimburada_messaging_db" },
    @{ Container = "hekimburadagateway-postgres-1";     Db = "hekimburada_gateway_db" }
)

$volumes = @(
    "hekimburadaidentity_identity-avatars",
    "hekimburadaidentity_identity-verification-docs",
    "hekimburadamarketplace_marketplace-uploads",
    "hekimburadacommunity_community-uploads",
    "hekimburadamessaging_messaging-uploads"
)

New-Item -ItemType Directory -Force -Path (Join-Path $backupDir "db") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $backupDir "uploads") | Out-Null

Write-Host "== Veritabanları ==" -ForegroundColor Cyan
foreach ($entry in $databases) {
    $running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $entry.Container
    if (-not $running) {
        Write-Host "  $($entry.Db): container ayakta değil, atlanıyor." -ForegroundColor Yellow
        continue
    }

    $outFile = Join-Path $backupDir "db\$($entry.Db).sql"
    Write-Host "  $($entry.Db) -> $outFile"
    docker exec -e PGPASSWORD=change_me $entry.Container pg_dump -U baseforge -d $entry.Db --no-owner --no-privileges > $outFile
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump başarısız: $($entry.Db)"
    }
}

Write-Host "== Upload volume'ları ==" -ForegroundColor Cyan
foreach ($volume in $volumes) {
    $exists = docker volume ls --format "{{.Name}}" | Select-String -SimpleMatch $volume
    if (-not $exists) {
        Write-Host "  $volume`: volume bulunamadı, atlanıyor." -ForegroundColor Yellow
        continue
    }

    $outFile = Join-Path $backupDir "uploads\$volume.tar.gz"
    Write-Host "  $volume -> $outFile"
    docker run --rm -v "${volume}:/data:ro" -v "${backupDir}\uploads:/backup" alpine `
        sh -c "cd /data && tar czf /backup/$volume.tar.gz ." | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Volume yedeklemesi başarısız: $volume"
    }
}

Write-Host "Yedek tamamlandı: $backupDir" -ForegroundColor Green

$allBackups = Get-ChildItem (Join-Path $root "backups") -Directory | Sort-Object Name -Descending
if ($allBackups.Count -gt $KeepLast) {
    $toDelete = $allBackups | Select-Object -Skip $KeepLast
    foreach ($old in $toDelete) {
        Write-Host "Eski yedek siliniyor: $($old.Name)" -ForegroundColor DarkGray
        Remove-Item $old.FullName -Recurse -Force
    }
}
