# Script di Deploy Automatico per ThaiHeavensSignApp
# Questo script automatizza: git add, commit, push e deploy sul server

param(
    [string]$Message = "Deploy from Cursor",
    [switch]$SkipBuild = $false
)

Write-Host "🚀 ThaiHeavensSignApp - Deploy Automatico" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verifica stato Git
Write-Host "📋 Step 1: Verifica stato Git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "   Modifiche trovate:" -ForegroundColor Green
    git status --short
} else {
    Write-Host "   Nessuna modifica da committare" -ForegroundColor Gray
    $skipCommit = $true
}

# Step 2: Build locale (opzionale, per verificare errori)
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "🔨 Step 2: Build locale (verifica errori)..." -ForegroundColor Yellow
    
    Write-Host "   Building backend..." -ForegroundColor Gray
    Set-Location backend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Errore nel build del backend!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    
    Write-Host "   ✅ Build completato" -ForegroundColor Green
}

# Step 3: Git Add
if (-not $skipCommit) {
    Write-Host ""
    Write-Host "📦 Step 3: Git Add..." -ForegroundColor Yellow
    git add .
    Write-Host "   ✅ File aggiunti" -ForegroundColor Green
}

# Step 4: Git Commit
if (-not $skipCommit) {
    Write-Host ""
    Write-Host "💾 Step 4: Git Commit..." -ForegroundColor Yellow
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  Commit fallito o nessuna modifica" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Commit completato" -ForegroundColor Green
    }
}

# Step 5: Git Push
Write-Host ""
Write-Host "📤 Step 5: Git Push..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Push fallito!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Push completato" -ForegroundColor Green

# Step 6: Info sul deploy automatico
Write-Host ""
Write-Host "🎯 Step 6: Deploy sul Server" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Se hai configurato il webhook GitHub in RunCloud:" -ForegroundColor Cyan
Write-Host "   ✅ Il deploy partirà automaticamente!" -ForegroundColor Green
Write-Host ""
Write-Host "   Altrimenti, connettiti al server e esegui:" -ForegroundColor Yellow
Write-Host "   cd /home/fabrizio/webapps/thaiheavens-sign-app" -ForegroundColor Gray
Write-Host "   git pull origin main" -ForegroundColor Gray
Write-Host "   cd backend && npm run build" -ForegroundColor Gray
Write-Host "   pm2 restart thaiheavens-backend" -ForegroundColor Gray
Write-Host ""

# Step 7: Opzione per deploy manuale via SSH
$deployNow = Read-Host "Vuoi fare il deploy ora via SSH? (s/n)"
if ($deployNow -eq "s" -or $deployNow -eq "S") {
    $server = Read-Host "Indirizzo server SSH (es: root@sign.process-innovation.it)"
    if ($server) {
        Write-Host ""
        Write-Host "🔌 Connessione al server..." -ForegroundColor Yellow
        $deployScript = @"
cd /home/fabrizio/webapps/thaiheavens-sign-app
git pull origin main
cd backend
npm run build
cd ../docs-site
npm run build
npm run copy-to-frontend
cd ..
pm2 restart thaiheavens-backend
"@
        ssh $server $deployScript
        Write-Host "   ✅ Deploy completato!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✨ Deploy completato!" -ForegroundColor Green
Write-Host ""

