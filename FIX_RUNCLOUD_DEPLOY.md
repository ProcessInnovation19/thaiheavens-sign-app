# 🔧 Fix: Webhook funziona ma RunCloud non si aggiorna

## Problema
GitHub invia le richieste (vedi deliveries), ma RunCloud non esegue il deployment script.

## Soluzione

### 1. Verifica Deployment Script in RunCloud

1. Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web`
2. Vai su **Git** → **Deployment script**
3. Verifica che:
   - ✅ **"Enable deployment script"** sia SPUNTATO
   - Lo script sia presente e completo
   - La directory sia: `/home/fabrizio/webapps/thaiheavens-sign-app`

### 2. Controlla i Log di Deployment

1. In RunCloud: **Web Apps** → `thaiheavens-sign-app-web` → **Git**
2. Vai su **"Deployment Logs"** o **"Deploy History"**
3. Controlla se ci sono errori o se il deploy non parte affatto

### 3. Script Corretto da Copiare

Copia questo script ESATTO in RunCloud → Web Apps → Git → Deployment script:

```bash
set -e

# Change to project directory - IMPORTANTE: usa il percorso corretto
cd /home/fabrizio/webapps/thaiheavens-sign-app || {
    echo "ERROR: Directory not found!"
    exit 1
}

# Update code from Git
echo "Pulling latest changes..."
git pull origin main || git merge origin/main

# Backend: Install dependencies and build
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

# Frontend: Install dependencies and build
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Documentation: Build and copy to frontend
echo "Building documentation..."
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

# Restart Node.js application (using PM2)
echo "Restarting PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart thaiheavens-backend || pm2 start ecosystem.config.js
    pm2 save
    echo "PM2 restarted successfully"
else
    echo "WARNING: PM2 not found. Please restart the application manually."
fi

echo "Deployment completed successfully!"
```

### 4. Test Manuale

1. In RunCloud: **Web Apps** → `thaiheavens-sign-app-web` → **Git**
2. Clicca su **"Deploy Now"** (o **"Trigger Deploy"**)
3. Controlla i log per vedere se funziona manualmente
4. Se funziona manualmente ma non automaticamente, il problema è nella configurazione del webhook

### 5. Verifica Permessi

Assicurati che RunCloud abbia i permessi per:
- Eseguire git pull
- Eseguire npm install
- Eseguire npm run build
- Riavviare PM2

### 6. Verifica Directory

Verifica che la directory del progetto sia corretta:
- In RunCloud: **Web Apps** → `thaiheavens-sign-app-web` → **Git**
- Controlla il campo **"App Directory"** o **"Repository Path"**
- Deve essere: `/home/fabrizio/webapps/thaiheavens-sign-app`

### 7. Debug

Aggiungi questi comandi alla fine dello script per debug:

```bash
# Debug info
echo "Current directory: $(pwd)"
echo "Git status:"
git status
echo "PM2 status:"
pm2 list
```

## Cosa Controllare nei Log

Nei log di deployment, cerca:
- ✅ "Deployment completed successfully!" = OK
- ❌ "ERROR: Directory not found!" = Directory sbagliata
- ❌ "npm: command not found" = Node.js non nel PATH
- ❌ "PM2 not found" = PM2 non installato
- ❌ Errori di git pull = Problemi di permessi o repository





