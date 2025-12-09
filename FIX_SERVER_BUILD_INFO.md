# Fix Build Info sul Server

## Problema
Il file `build-info.json` ora è nel `.gitignore` e non viene più tracciato. Quando fai `git pull` sul server, il file vecchio potrebbe rimanere e non essere rigenerato.

## Soluzione: Aggiorna il Deploy Script

Nel deploy script di RunCloud, aggiungi un comando per eliminare il vecchio `build-info.json` prima del build:

### Deploy Script Aggiornato

Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web` → **Git** → **Deployment script**

Sostituisci la sezione frontend con questa:

```bash
# Frontend: Install dependencies and build
cd frontend
# Remove old build-info.json to ensure fresh timestamp generation
rm -f src/build-info.json
npm install
npm run build
cd ..
```

### Oppure: Esegui Manualmente sul Server (Una Volta)

Se vuoi farlo subito senza aspettare il prossimo deploy:

```bash
# Connettiti al server
ssh root@tuo-server

# Vai nella directory del progetto
cd /home/fabrizio/webapps/thaiheavens-sign-app

# Elimina il vecchio build-info.json
rm -f frontend/src/build-info.json

# Fai il build (genererà un nuovo build-info.json con timestamp fresco)
cd frontend
npm run build
cd ..

# Riavvia PM2
pm2 restart thaiheavens-backend
```

## Verifica

Dopo il build, verifica che il file sia stato generato con un timestamp fresco:

```bash
cat frontend/src/build-info.json
```

Dovresti vedere un timestamp recente (non `1733690000000`).

## Nota

Il comando `npm run build` esegue automaticamente `prebuild` che genera `build-info.json`, ma eliminare il file vecchio prima assicura che venga sempre rigenerato con un timestamp fresco.


