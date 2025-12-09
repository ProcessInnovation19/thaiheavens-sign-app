# 🔧 Troubleshooting Webhook RunCloud

## Verifica Rapida

### 1. Verifica Webhook GitHub
1. Vai su: https://github.com/ProcessInnovation19/thaiheavens-sign-app/settings/hooks
2. Controlla se c'è un webhook configurato
3. Clicca sul webhook e verifica:
   - **Recent Deliveries**: Vedi se ci sono richieste recenti
   - **Status**: Dovrebbe essere verde (200 OK)
   - Se vedi errori, clicca su "Redeliver" per riprovare

### 2. Verifica Deployment Script in RunCloud
1. Vai su RunCloud Dashboard → **Web Apps** → `thaiheavens-sign-app-web`
2. Vai su **Git** → **Deployment script**
3. Verifica che:
   - ✅ **"Enable deployment script"** sia spuntato
   - Lo script sia presente e corretto
   - La directory del progetto sia corretta: `/home/fabrizio/webapps/thaiheavens-sign-app`

### 3. Verifica URL Webhook
1. In RunCloud, vai su **Web Apps** → `thaiheavens-sign-app-web` → **Git**
2. Copia l'URL del webhook (dovrebbe essere tipo: `https://manage.runcloud.io/webhooks/git/...`)
3. In GitHub, vai su **Settings** → **Webhooks**
4. Verifica che l'URL del webhook in GitHub corrisponda a quello di RunCloud

### 4. Test Manuale del Webhook
In GitHub, vai su **Settings** → **Webhooks** → clicca sul webhook → **Recent Deliveries** → clicca su una delivery → **Redeliver**

## Script di Deploy Corretto per RunCloud

Copia questo script esatto in RunCloud → Web Apps → Git → Deployment script:

```bash
set -e

# NOTE: Environment variables must NOT be stored here. Use RunCloud Environment Variables instead.

# Change to project directory
cd /home/fabrizio/webapps/thaiheavens-sign-app || exit 1

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
    pm2 save
else
    echo "PM2 not found. Please restart the application manually."
fi

echo "Deployment completed successfully!"
```

## Problemi Comuni

### Webhook non riceve richieste
- Verifica che il webhook sia attivo in GitHub
- Controlla i log in GitHub → Settings → Webhooks → Recent Deliveries
- Se vedi errori 404, l'URL del webhook è sbagliato

### Deployment script non si esegue
- Verifica che "Enable deployment script" sia attivo
- Controlla i log in RunCloud → Web Apps → Git → Deployment Logs
- Verifica che la directory del progetto sia corretta

### Build fallisce silenziosamente
- Aggiungi `set -e` all'inizio dello script (già presente)
- Controlla i log di RunCloud per vedere errori
- Verifica che npm e node siano disponibili nel PATH

## Soluzione Rapida

Se nulla funziona, configura manualmente una volta:

1. **In RunCloud Dashboard:**
   - Vai su Web Apps → `thaiheavens-sign-app-web` → Git
   - Clicca su **"Deploy Now"** per testare lo script manualmente
   - Controlla i log per vedere se ci sono errori

2. **In GitHub:**
   - Vai su Settings → Webhooks
   - Se non c'è webhook, aggiungilo con l'URL di RunCloud
   - Se c'è, clicca su "Redeliver" per testare

3. **Test:**
   - Fai un piccolo cambiamento (es. aggiungi un commento)
   - Fai `git push`
   - Controlla se il deploy parte automaticamente


