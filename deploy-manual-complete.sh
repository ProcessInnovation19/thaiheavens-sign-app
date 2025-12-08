#!/bin/bash
set -e

echo "=========================================="
echo "DEPLOY MANUALE COMPLETO - ThaiHeavensSignApp"
echo "=========================================="

cd /home/fabrizio/webapps/thaiheavens-sign-app

echo ""
echo "=== 1. Verifica Stato Git ==="
git status
echo "Ultimo commit:"
git log -1 --oneline

echo ""
echo "=== 2. Pull da Git ==="
git pull origin main || {
    echo "ERRORE: git pull fallito!"
    exit 1
}

echo ""
echo "=== 3. Backend Build ==="
cd backend
echo "Installing dependencies..."
npm install
echo "Building..."
npm run build
if [ ! -f "dist/index.js" ]; then
    echo "ERRORE: Backend build fallito - dist/index.js non trovato!"
    exit 1
fi
echo "✓ Backend build completato"
cd ..

echo ""
echo "=== 4. Frontend Build ==="
cd frontend
echo "Rimuovo vecchio build-info.json..."
rm -f src/build-info.json
echo "Installing dependencies..."
npm install
echo "Generating build-info.json..."
npm run prebuild
if [ ! -f "src/build-info.json" ]; then
    echo "ERRORE: build-info.json non generato!"
    exit 1
fi
echo "Build info generato:"
cat src/build-info.json
echo ""
echo "Building frontend..."
npm run build
if [ ! -f "dist/index.html" ]; then
    echo "ERRORE: Frontend build fallito - dist/index.html non trovato!"
    exit 1
fi
echo "✓ Frontend build completato"
echo "File JavaScript generati:"
ls -lh dist/assets/*.js | head -3
cd ..

echo ""
echo "=== 5. Docs Build ==="
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

echo ""
echo "=== 6. Verifica Finale ==="
echo "Frontend dist:"
ls -lh frontend/dist/index.html
echo ""
echo "Build info:"
cat frontend/src/build-info.json
echo ""
echo "Verifica che buildInfo sia nel JavaScript:"
if grep -q "buildInfo" frontend/dist/assets/*.js 2>/dev/null; then
    echo "✓ buildInfo trovato nel JavaScript compilato"
else
    echo "⚠ ATTENZIONE: buildInfo NON trovato nel JavaScript!"
fi

echo ""
echo "=== 7. Restart PM2 ==="
pm2 restart thaiheavens-backend || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo "✓ DEPLOY COMPLETATO!"
echo "=========================================="
echo ""
echo "Verifica:"
echo "1. Controlla i log: pm2 logs thaiheavens-backend"
echo "2. Testa: curl http://localhost:5000/"
echo "3. Verifica online: http://sign.process-innovation.it/"
echo ""

