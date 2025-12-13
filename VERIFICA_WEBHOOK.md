# 🔍 Verifica Configurazione Webhook

## Problema: Push su GitHub ma non su RunCloud

### Step 1: Verifica Webhook in GitHub

1. Vai su: https://github.com/ProcessInnovation19/thaiheavens-sign-app/settings/hooks
2. Controlla se c'è un webhook configurato
3. Se c'è, clicca su di esso e verifica:
   - **Payload URL**: Deve essere l'URL di RunCloud (tipo: `https://manage.runcloud.io/webhooks/git/...`)
   - **Recent Deliveries**: Controlla se ci sono richieste recenti
   - Se vedi errori (rosso), clicca su una delivery e vedi il dettaglio dell'errore

### Step 2: Verifica Deployment Script in RunCloud

1. Vai su RunCloud Dashboard → **Web Apps** → `thaiheavens-sign-app-web`
2. Vai su **Git** → **Deployment script**
3. Verifica che:
   - ✅ **"Enable deployment script"** sia spuntato
   - Lo script sia presente e completo
   - La directory sia corretta: `/home/fabrizio/webapps/thaiheavens-sign-app`

### Step 3: Verifica URL Webhook

1. In RunCloud: **Web Apps** → `thaiheavens-sign-app-web` → **Git**
2. Copia l'URL del webhook (dovrebbe essere visibile nella pagina)
3. In GitHub: **Settings** → **Webhooks**
4. Verifica che l'URL del webhook in GitHub corrisponda ESATTAMENTE a quello di RunCloud

### Step 4: Test Manuale

1. In RunCloud: **Web Apps** → `thaiheavens-sign-app-web` → **Git** → clicca **"Deploy Now"**
2. Controlla i log per vedere se funziona manualmente
3. Se funziona manualmente ma non automaticamente, il problema è nel webhook GitHub

### Step 5: Aggiungi/Modifica Webhook in GitHub

Se il webhook non esiste o è sbagliato:

1. In RunCloud, copia l'URL del webhook
2. In GitHub: **Settings** → **Webhooks** → **Add webhook** (o modifica quello esistente)
3. Configura:
   - **Payload URL**: Incolla l'URL di RunCloud
   - **Content type**: `application/json`
   - **Secret**: Lascia vuoto
   - **Which events**: Seleziona **"Just the push event"**
   - **Active**: ✅ Spunta
4. Clicca **Add webhook** (o **Update webhook**)

### Step 6: Test Finale

1. Fai un piccolo cambiamento (es. aggiungi un commento)
2. Fai `git push origin main`
3. In GitHub: **Settings** → **Webhooks** → clicca sul webhook → **Recent Deliveries**
4. Dovresti vedere una nuova delivery con status 200 (verde)
5. In RunCloud: Controlla i **Deployment Logs** per vedere se il deploy è partito

## Script di Deploy Corretto per RunCloud

Assicurati che questo script sia in RunCloud → Web Apps → Git → Deployment script:

```bash
set -e

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





