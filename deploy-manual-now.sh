#!/bin/bash
# Script di deploy manuale da eseguire sul server RunCloud
# Esegui questo script quando il webhook non funziona

set -e

echo "=== Deploy Manuale ThaiHeavensSignApp ==="
echo ""

# Vai nella directory del progetto
cd /home/fabrizio/webapps/thaiheavens-sign-app || exit 1

echo "1. Pull delle modifiche da GitHub..."
git pull origin main || git merge origin/main

echo ""
echo "2. Build Backend..."
cd backend
npm install
npm run build
cd ..

echo ""
echo "3. Build Frontend..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "4. Build Documentation..."
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

echo ""
echo "5. Riavvio PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart thaiheavens-backend || pm2 start ecosystem.config.js
    pm2 save
else
    echo "PM2 non trovato. Riavvia manualmente l'applicazione."
fi

echo ""
echo "=== Deploy completato! ==="
echo ""
echo "Verifica i file:"
ls -la backend/dist/index.js
ls -la frontend/dist/index.html
ls -la frontend/public/docs/index.html





