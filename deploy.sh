#!/bin/bash
# Script di Deploy Automatico per ThaiHeavensSignApp (Linux/Mac)
# Questo script automatizza: git add, commit, push e deploy sul server

MESSAGE="${1:-Deploy from Cursor}"
SKIP_BUILD="${2:-false}"

echo "🚀 ThaiHeavensSignApp - Deploy Automatico"
echo ""

# Step 1: Verifica stato Git
echo "📋 Step 1: Verifica stato Git..."
if [ -n "$(git status --porcelain)" ]; then
    echo "   Modifiche trovate:"
    git status --short
    SKIP_COMMIT=false
else
    echo "   Nessuna modifica da committare"
    SKIP_COMMIT=true
fi

# Step 2: Build locale (opzionale)
if [ "$SKIP_BUILD" != "true" ]; then
    echo ""
    echo "🔨 Step 2: Build locale (verifica errori)..."
    
    echo "   Building backend..."
    cd backend
    npm run build
    if [ $? -ne 0 ]; then
        echo "   ❌ Errore nel build del backend!"
        cd ..
        exit 1
    fi
    cd ..
    
    echo "   ✅ Build completato"
fi

# Step 3: Git Add
if [ "$SKIP_COMMIT" != "true" ]; then
    echo ""
    echo "📦 Step 3: Git Add..."
    git add .
    echo "   ✅ File aggiunti"
fi

# Step 4: Git Commit
if [ "$SKIP_COMMIT" != "true" ]; then
    echo ""
    echo "💾 Step 4: Git Commit..."
    git commit -m "$MESSAGE"
    if [ $? -ne 0 ]; then
        echo "   ⚠️  Commit fallito o nessuna modifica"
    else
        echo "   ✅ Commit completato"
    fi
fi

# Step 5: Git Push
echo ""
echo "📤 Step 5: Git Push..."
git push origin main
if [ $? -ne 0 ]; then
    echo "   ❌ Push fallito!"
    exit 1
fi
echo "   ✅ Push completato"

# Step 6: Info sul deploy automatico
echo ""
echo "🎯 Step 6: Deploy sul Server"
echo ""
echo "   Se hai configurato il webhook GitHub in RunCloud:"
echo "   ✅ Il deploy partirà automaticamente!"
echo ""
echo "   Altrimenti, connettiti al server e esegui:"
echo "   cd /home/fabrizio/webapps/thaiheavens-sign-app"
echo "   git pull origin main"
echo "   cd backend && npm run build"
echo "   pm2 restart thaiheavens-backend"
echo ""

echo "✨ Deploy completato!"
echo ""






