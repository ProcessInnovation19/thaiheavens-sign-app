# Deploy Immediato - Esegui sul Server

## Problema
Le modifiche non sono visibili perché il deploy automatico potrebbe non essere stato eseguito.

## Soluzione: Deploy Manuale Completo

Esegui questi comandi **sul server**:

```bash
# Connettiti al server
ssh root@tuo-server

# Vai nella directory
cd /home/fabrizio/webapps/thaiheavens-sign-app

# Risolvi eventuali conflitti Git
git reset --hard origin/main
git pull origin main

# Esegui il deploy completo
chmod +x deploy-manual-complete.sh
./deploy-manual-complete.sh
```

## Se lo script non esiste ancora

Esegui manualmente:

```bash
cd /home/fabrizio/webapps/thaiheavens-sign-app

# Pull
git reset --hard origin/main
git pull origin main

# Backend
cd backend
npm install
npm run build
cd ..

# Frontend (IMPORTANTE: rimuovi vecchio build-info.json)
cd frontend
rm -f src/build-info.json
npm install
npm run build
cd ..

# Docs
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

# Restart
pm2 restart thaiheavens-backend

# Verifica
echo "=== Verifica ==="
ls -la frontend/dist/index.html
cat frontend/src/build-info.json
```

## Verifica che Funzioni

Dopo il deploy, verifica:

```bash
# Controlla che il build sia stato fatto
ls -la frontend/dist/assets/*.js

# Controlla il timestamp nel build-info.json
cat frontend/src/build-info.json

# Controlla che PM2 sia ripartito
pm2 logs thaiheavens-backend --lines 20
```

## Se Ancora Non Funziona

1. **Pulisci la cache del browser** (Ctrl+F5 o Cmd+Shift+R)
2. **Verifica gli header HTTP:**
   ```bash
   curl -I http://sign.process-innovation.it/
   ```
   Dovresti vedere `Cache-Control: no-cache`
3. **Verifica che Nginx serva i file corretti:**
   ```bash
   ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/
   ```


