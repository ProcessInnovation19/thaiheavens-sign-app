# Verifica Deploy - File Diversi tra Locale e Server

## Problema
I file sul server RunCloud sono diversi da quelli in locale. Il deploy non sta funzionando correttamente.

## Verifica Immediata sul Server

Esegui questi comandi sul server per verificare cosa c'è:

```bash
# Connettiti al server
ssh root@tuo-server

# Vai nella directory del progetto
cd /home/fabrizio/webapps/thaiheavens-sign-app

# Verifica l'ultimo commit
git log -1

# Verifica se ci sono modifiche non committate
git status

# Verifica se il build è stato fatto
ls -la frontend/dist/assets/

# Verifica se build-info.json esiste e quando è stato modificato
ls -la frontend/src/build-info.json 2>/dev/null || echo "build-info.json non esiste"

# Verifica il contenuto del file JavaScript compilato
grep -o "buildInfo" frontend/dist/assets/*.js | head -1

# Verifica quando è stato fatto l'ultimo build
stat frontend/dist/index.html
```

## Verifica il Deploy Script

1. Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web` → **Git**
2. Controlla i **Deployment Logs** - vedi se ci sono errori
3. Verifica che il deploy script sia abilitato e corretto

## Possibili Cause

### 1. Deploy Script Non Eseguito
- Il webhook potrebbe non funzionare
- Il deploy script potrebbe essere disabilitato
- Potrebbero esserci errori nel deploy script

### 2. Build Non Completato
- Il build potrebbe fallire silenziosamente
- Potrebbero mancare dipendenze
- Potrebbero esserci errori TypeScript

### 3. File Non Aggiornati
- Il git pull potrebbe non funzionare
- Potrebbero esserci conflitti
- I file potrebbero essere sovrascritti

## Soluzione: Deploy Manuale Completo

Esegui questo script completo sul server:

```bash
#!/bin/bash
set -e

cd /home/fabrizio/webapps/thaiheavens-sign-app

echo "=== 1. Pull da Git ==="
git pull origin main

echo "=== 2. Backend Build ==="
cd backend
npm install
npm run build
cd ..

echo "=== 3. Frontend Build ==="
cd frontend
# Rimuovi vecchio build-info.json
rm -f src/build-info.json
npm install
npm run build
cd ..

echo "=== 4. Docs Build ==="
cd docs-site
npm install
npm run build
npm run copy-to-frontend
cd ..

echo "=== 5. Verifica Build ==="
ls -la frontend/dist/index.html
ls -la frontend/src/build-info.json
cat frontend/src/build-info.json

echo "=== 6. Restart PM2 ==="
pm2 restart thaiheavens-backend

echo "=== Deploy Completato! ==="
```

## Verifica Dopo Deploy

Dopo il deploy manuale, verifica:

```bash
# Verifica il timestamp nel build-info.json
cat frontend/src/build-info.json

# Verifica che il file JavaScript contenga buildInfo
grep -o "buildInfo" frontend/dist/assets/*.js

# Verifica gli header HTTP
curl -I http://sign.process-innovation.it/
```

## Se Ancora Non Funziona

1. **Verifica i permessi:**
   ```bash
   ls -la frontend/dist/
   chown -R runcloud:runcloud frontend/dist/
   ```

2. **Verifica che Nginx serva i file corretti:**
   ```bash
   # Controlla la configurazione Nginx
   grep -r "frontend/dist" /etc/nginx-rc/
   ```

3. **Pulisci tutto e ricostruisci:**
   ```bash
   cd /home/fabrizio/webapps/thaiheavens-sign-app
   rm -rf frontend/dist frontend/node_modules
   rm -f frontend/src/build-info.json
   cd frontend
   npm install
   npm run build
   ```

