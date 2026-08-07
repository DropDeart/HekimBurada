# HekimBurada — backup.ps1'in aldığı bir yedeği geri yükler.
# Veritabanını (pg_dump çıktısını psql ile) ve/veya upload volume'unu (tar arşivini geri açarak)
# geri yükler. Hedef veritabanı/volume DOLU olsa bile üzerine yazar — önce servisi durdurmanız
# önerilir (scripts\down.ps1), aksi halde servis çalışırken şema/veri çakışması olabilir.
#
# Kullanım:
#   .\scripts\restore.ps1 -Timestamp 2026-08-07_14-30-00                    # her şeyi geri yükle
#   .\scripts\restore.ps1 -Timestamp 2026-08-07_14-30-00 -Only marketplace  # sadece bir servisi

param(
    [Parameter(Mandatory = $true)]
    [string]$Timestamp,

    [ValidateSet("identity", "marketplace", "community", "messaging", "gateway")]
    [string]$Only
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root "backups\$Timestamp"

if (-not (Test-Path $backupDir)) {
    throw "Yedek klasörü bulunamadı: $backupDir"
}

$services = @(
    @{ Name = "identity";    PgContainer = "hekimburadaidentity-postgres-1";    Db = "hekimburada_identity_db";    Volumes = @("hekimburadaidentity_identity-avatars", "hekimburadaidentity_identity-verification-docs") },
    @{ Name = "marketplace"; PgContainer = "hekimburadamarketplace-postgres-1"; Db = "hekimburada_marketplace_db"; Volumes = @("hekimburadamarketplace_marketplace-uploads") },
    @{ Name = "community";   PgContainer = "hekimburadacommunity-postgres-1";   Db = "hekimburada_community_db";   Volumes = @("hekimburadacommunity_community-uploads") },
    @{ Name = "messaging";   PgContainer = "hekimburadamessaging-postgres-1";   Db = "hekimburada_messaging_db";   Volumes = @("hekimburadamessaging_messaging-uploads") },
    @{ Name = "gateway";     PgContainer = "hekimburadagateway-postgres-1";     Db = "hekimburada_gateway_db";     Volumes = @() }
)

if ($Only) {
    $services = $services | Where-Object { $_.Name -eq $Only }
}

foreach ($service in $services) {
    $dumpFile = Join-Path $backupDir "db\$($service.Db).sql"
    if (Test-Path $dumpFile) {
        $running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $service.PgContainer
        if (-not $running) {
            Write-Host "  $($service.Db): postgres container ayakta değil, atlanıyor." -ForegroundColor Yellow
        }
        else {
            Write-Host "== $($service.Db) geri yükleniyor ==" -ForegroundColor Cyan
            docker exec -e PGPASSWORD=change_me $service.PgContainer psql -U baseforge -d $service.Db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | Out-Null
            Get-Content $dumpFile | docker exec -i -e PGPASSWORD=change_me $service.PgContainer psql -U baseforge -d $service.Db | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "Geri yükleme başarısız: $($service.Db)"
            }
        }
    }

    foreach ($volume in $service.Volumes) {
        $archiveFile = Join-Path $backupDir "uploads\$volume.tar.gz"
        if (-not (Test-Path $archiveFile)) {
            continue
        }

        Write-Host "== $volume geri yükleniyor ==" -ForegroundColor Cyan
        docker run --rm -v "${volume}:/data" -v "${backupDir}\uploads:/backup" alpine `
            sh -c "rm -rf /data/* && cd /data && tar xzf /backup/$volume.tar.gz"
        if ($LASTEXITCODE -ne 0) {
            throw "Volume geri yüklemesi başarısız: $volume"
        }
    }
}

Write-Host "Geri yükleme tamamlandı. İlgili servisleri yeniden başlatmayı unutmayın (scripts\up.ps1)." -ForegroundColor Green
