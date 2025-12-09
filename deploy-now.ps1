# Deploy completo in un unico comando
param(
    [string]$Server = "root@94.237.101.88"
)

Write-Host "🚀 Deploy completo in corso..." -ForegroundColor Cyan

# Create deploy script with Unix line endings
$deployScript = "cd /home/fabrizio/webapps/thaiheavens-sign-app && git stash && git pull origin main && cd backend && npm run build && cd ../docs-site && npm run build && npm run copy-to-frontend && cd ../frontend && npm run build && cd .. && pm2 restart thaiheavens-backend && echo '✅ Deploy completato!'"

ssh $Server $deployScript

Write-Host ""
Write-Host "✅ Deploy completato!" -ForegroundColor Green

