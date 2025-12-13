# Script per copiare le sessioni da localhost al server di produzione
# Le sessioni vengono modificate per avere status "pending" e path corretti per Linux

param(
    [string]$Server = "root@94.237.101.88"
)

Write-Host "Copia sessioni da localhost a produzione..." -ForegroundColor Cyan
Write-Host ""

# Leggi le sessioni da localhost
$sessionsFile = "backend\storage\sessions.json"
if (-not (Test-Path $sessionsFile)) {
    Write-Host "ERRORE: File sessions.json non trovato in $sessionsFile" -ForegroundColor Red
    exit 1
}

Write-Host "Lettura sessioni da localhost..." -ForegroundColor Yellow
$sessions = Get-Content $sessionsFile | ConvertFrom-Json

if ($sessions.Count -eq 0) {
    Write-Host "ATTENZIONE: Nessuna sessione trovata in localhost" -ForegroundColor Yellow
    exit 0
}

Write-Host "Trovate $($sessions.Count) sessione/i" -ForegroundColor Green

# Modifica le sessioni per la produzione
Write-Host ""
Write-Host "Modifica sessioni per produzione..." -ForegroundColor Yellow
$productionSessions = $sessions | ForEach-Object {
    $session = $_
    
    # Crea una copia della sessione
    $prodSession = @{
        id = $session.id
        token = $session.token
        pdfId = $session.pdfId
        originalPdfPath = "/home/fabrizio/webapps/thaiheavens-sign-app/backend/storage/original/$($session.pdfId).pdf"
        guestName = $session.guestName
        page = $session.page
        x = $session.x
        y = $session.y
        width = $session.width
        height = $session.height
        status = "pending"
        createdAt = $session.createdAt
        updatedAt = $session.updatedAt
    }
    
    # Aggiungi guestEmail se presente
    if ($session.guestEmail) {
        $prodSession.guestEmail = $session.guestEmail
    }
    
    # NON includere signedPdfPath (rimosso per status pending)
    
    $prodSession
}

# Salva temporaneamente in un file locale
$tempFile = "backend\storage\sessions.production.tmp.json"
# Assicurati che sia sempre un array, anche con una sola sessione
$jsonContent = $productionSessions | ConvertTo-Json -Depth 10
# Se il risultato non inizia con [, aggiungi le parentesi quadre
if ($jsonContent.TrimStart() -notmatch '^\[') {
    $jsonContent = "[`n" + $jsonContent + "`n]"
}
$jsonContent | Set-Content $tempFile -Encoding UTF8

Write-Host "Sessioni modificate:" -ForegroundColor Green
$productionSessions | ForEach-Object {
    Write-Host "  - ID: $($_.id), Status: $($_.status), Guest: $($_.guestName)" -ForegroundColor Gray
}

# Copia il file sul server
Write-Host ""
Write-Host "Copia file sul server..." -ForegroundColor Yellow
$remotePath = "/home/fabrizio/webapps/thaiheavens-sign-app/backend/storage/sessions.json"

# Usa SCP per copiare il file
scp $tempFile "${Server}:${remotePath}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "File copiato con successo!" -ForegroundColor Green
} else {
    Write-Host "Errore durante la copia del file" -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    exit 1
}

# Rimuovi il file temporaneo
Remove-Item $tempFile -ErrorAction SilentlyContinue

# Copia i PDF originali necessari
Write-Host ""
Write-Host "Copia PDF originali sul server..." -ForegroundColor Yellow
$pdfsCopied = 0
$pdfsSkipped = 0

$productionSessions | ForEach-Object {
    $pdfId = $_.pdfId
    $localPdfPath = "backend\storage\original\$pdfId.pdf"
    $remotePdfPath = "/home/fabrizio/webapps/thaiheavens-sign-app/backend/storage/original/$pdfId.pdf"
    
    if (Test-Path $localPdfPath) {
        Write-Host "  Copiando PDF: $pdfId.pdf..." -ForegroundColor Gray
        scp $localPdfPath "${Server}:${remotePdfPath}"
        if ($LASTEXITCODE -eq 0) {
            $pdfsCopied++
            # Imposta i permessi corretti
            ssh $Server "chmod 644 $remotePdfPath" | Out-Null
        } else {
            Write-Host "    ERRORE: Impossibile copiare $pdfId.pdf" -ForegroundColor Red
        }
    } else {
        Write-Host "  ATTENZIONE: PDF non trovato localmente: $localPdfPath" -ForegroundColor Yellow
        $pdfsSkipped++
    }
}

Write-Host ""
if ($pdfsCopied -gt 0) {
    Write-Host "PDF copiati: $pdfsCopied" -ForegroundColor Green
}
if ($pdfsSkipped -gt 0) {
    Write-Host "PDF saltati: $pdfsSkipped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Sessioni copiate con successo sul server di produzione!" -ForegroundColor Green
Write-Host "Tutte le sessioni hanno status pending e sono pronte per la firma" -ForegroundColor Cyan
Write-Host ""
