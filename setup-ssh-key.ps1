# Setup SSH Key per deploy senza password
param(
    [string]$Server = "root@94.237.101.88"
)

Write-Host "Configurazione SSH Key per deploy senza password" -ForegroundColor Cyan
Write-Host ""

$sshDir = "$env:USERPROFILE\.ssh"
$privateKey = "$sshDir\id_rsa"
$publicKey = "$sshDir\id_rsa.pub"

# Step 1: Genera chiave SSH se non esiste
if (-not (Test-Path $privateKey)) {
    Write-Host "Generazione chiave SSH..." -ForegroundColor Yellow
    $emptyPass = '""'
    ssh-keygen -t rsa -b 4096 -f $privateKey -N $emptyPass -q
    Write-Host "Chiave SSH generata" -ForegroundColor Green
} else {
    Write-Host "Chiave SSH gia esistente" -ForegroundColor Green
}

# Step 2: Leggi la chiave pubblica
$publicKeyContent = Get-Content $publicKey -Raw
Write-Host ""
Write-Host "Chiave pubblica:" -ForegroundColor Yellow
Write-Host $publicKeyContent -ForegroundColor Gray
Write-Host ""

# Step 3: Copia la chiave sul server
Write-Host "Copia della chiave sul server..." -ForegroundColor Yellow
Write-Host "NOTA: Ti verra chiesta la password UNA VOLTA SOLA" -ForegroundColor Cyan
Write-Host ""

# Usa ssh-copy-id se disponibile, altrimenti fallback manuale
$sshCopyId = Get-Command ssh-copy-id -ErrorAction SilentlyContinue
if ($sshCopyId) {
    ssh-copy-id $Server
} else {
    # Fallback: copia manuale della chiave usando here-string
    Write-Host "ssh-copy-id non disponibile, uso metodo alternativo..." -ForegroundColor Yellow
    
    # Leggi la chiave pubblica come array
    $publicKeyLines = Get-Content $publicKey
    $publicKeySingleLine = $publicKeyLines -join "`n"
    
    # Crea il comando per aggiungere la chiave
    $addKeyCommand = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo `"$publicKeySingleLine`" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo ChiaveSSHAggiunta"
    
    # Esegui il comando (richiedera password)
    ssh $Server $addKeyCommand
}

Write-Host ""
Write-Host "Configurazione completata!" -ForegroundColor Green
Write-Host ""
Write-Host "Ora puoi eseguire npm run deploy:now senza inserire la password" -ForegroundColor Cyan
Write-Host ""
