# 🚀 Deploy Automatico

Questo progetto include script per automatizzare il deploy. Hai **3 opzioni**:

## Opzione 1: Script PowerShell (Windows) ⚡

```powershell
# Deploy semplice
npm run deploy

# Deploy con messaggio personalizzato
npm run deploy:message "Mio messaggio di commit"
```

Oppure direttamente:
```powershell
.\deploy.ps1
.\deploy.ps1 -Message "Mio messaggio"
.\deploy.ps1 -SkipBuild  # Salta il build locale
```

## Opzione 2: Script Bash (Linux/Mac) ⚡

```bash
# Rendi eseguibile (solo la prima volta)
chmod +x deploy.sh

# Deploy semplice
./deploy.sh

# Deploy con messaggio personalizzato
./deploy.sh "Mio messaggio di commit"
```

## Opzione 3: Webhook GitHub (Deploy Automatico) 🤖

**La soluzione migliore!** Configura il webhook in RunCloud:

1. Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web`
2. Vai su **Git** → **Deployment script**
3. Abilita **"Enable deployment script"**
4. Incolla questo script:

```bash
set -e

# Update code from Git
git pull origin main || git merge origin/main

# Backend: Install dependencies and build
cd backend
npm install
npm run build
cd ..

# Frontend: Install dependencies and build
cd frontend
npm install
npm run build
cd ..

# Documentation: Build and copy to frontend
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

# Restart Node.js application (using PM2)
if command -v pm2 &> /dev/null; then
    pm2 restart thaiheavens-backend || pm2 start ecosystem.config.js
else
    echo "PM2 not found. Please restart the application manually."
fi
```

5. Salva e configura il webhook GitHub URL in RunCloud
6. **Ogni volta che fai `git push`, il deploy parte automaticamente!** 🎉

## Cosa fanno gli script?

Gli script automatizzano:
1. ✅ **Git Add** - Aggiunge tutte le modifiche
2. ✅ **Git Commit** - Committa con un messaggio
3. ✅ **Git Push** - Invia a GitHub
4. ✅ **Build locale** (opzionale) - Verifica errori prima del push
5. ✅ **Info deploy** - Ti dice come completare il deploy sul server

## Deploy Manuale (se non usi webhook)

Se non hai configurato il webhook, dopo lo script esegui sul server:

```bash
ssh root@sign.process-innovation.it
cd /home/fabrizio/webapps/thaiheavens-sign-app
git pull origin main
cd backend && npm run build
cd ../docs-site && npm run build && npm run copy-to-frontend
pm2 restart thaiheavens-backend
```

## Suggerimento

**Configura il webhook GitHub** per avere il deploy completamente automatico! Basta fare `git push` e il server si aggiorna da solo. 🚀


