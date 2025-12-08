# Script per avviare backend e frontend
Write-Host "Starting Thai Heavens Sign App..."
Write-Host ""

# Avvia backend in una nuova finestra
Write-Host "Starting backend on port 5000..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# Aspetta 3 secondi
Start-Sleep -Seconds 3

# Avvia frontend in una nuova finestra
Write-Host "Starting frontend on port 5173..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Servers starting in separate windows..."
Write-Host "Backend: http://localhost:5000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Admin: http://localhost:5173/admin"
Write-Host ""
Write-Host "Press any key to exit this window (servers will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


