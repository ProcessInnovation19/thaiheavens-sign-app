# Guida al Deploy su Railway

Questa guida ti aiuterà a mettere online l'applicazione ThaiHeavensSignApp su Railway.

## Prerequisiti

1. Account Railway: [railway.app](https://railway.app) (gratuito con $5 di credito al mese)
2. Account GitHub (opzionale, per deploy automatico)
3. File del logo in `frontend/public/images/logo.png`

## Opzione 1: Deploy con Railway CLI (Consigliato)

### 1. Installa Railway CLI

```bash
npm i -g @railway/cli
```

### 2. Login su Railway

```bash
railway login
```

### 3. Crea un nuovo progetto

```bash
railway init
```

### 4. Aggiungi le variabili d'ambiente

```bash
railway variables set SMTP_HOST=smtp.qboxmail.com
railway variables set SMTP_PORT=465
railway variables set SMTP_SECURE=true
railway variables set SMTP_USER=admin@thaiheavens.com
railway variables set SMTP_PASS=your_password_here
railway variables set NODE_ENV=production
```

### 5. Deploy

```bash
railway up
```

## Opzione 2: Deploy con GitHub (Automatico)

### 1. Crea un repository GitHub

Crea un nuovo repository su GitHub e carica il codice:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tuo-username/thaiheavens-sign-app.git
git push -u origin main
```

### 2. Connetti Railway a GitHub

1. Vai su [railway.app](https://railway.app)
2. Clicca "New Project"
3. Seleziona "Deploy from GitHub repo"
4. Autorizza Railway ad accedere al tuo repository
5. Seleziona il repository `thaiheavens-sign-app`

### 3. Configura le variabili d'ambiente

Nella dashboard di Railway:
1. Vai su "Variables"
2. Aggiungi le seguenti variabili:
   - `SMTP_HOST` = `smtp.qboxmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_SECURE` = `true`
   - `SMTP_USER` = `admin@thaiheavens.com`
   - `SMTP_PASS` = `tua_password`
   - `NODE_ENV` = `production`

### 4. Configura il Build

Railway dovrebbe rilevare automaticamente il progetto Node.js. Se non funziona:

1. Vai su "Settings" → "Build"
2. Build Command: `cd backend && npm install && npm run build && cd ../frontend && npm install && npm run build && cd ../docs-site && npm install && npm run build`
3. Start Command: `cd backend && npm run start`

### 5. Deploy

Railway farà il deploy automaticamente ad ogni push su GitHub.

## Build Steps

Prima del deploy, assicurati di:

1. **Build del frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Build della documentazione:**
   ```bash
   cd docs-site
   npm install
   npm run build
   ```

3. **Build del backend:**
   ```bash
   cd backend
   npm install
   npm run build
   ```

## Struttura del Deploy

Railway eseguirà:
1. `npm install` in tutte le cartelle necessarie
2. `npm run build` per frontend, backend e docs-site
3. `npm run start` nel backend (che servirà anche frontend e docs)

## URL dell'Applicazione

Dopo il deploy, Railway ti fornirà un URL tipo:
- `https://thaiheavens-sign-app-production.up.railway.app`

Puoi anche configurare un dominio personalizzato nelle impostazioni di Railway.

## Note Importanti

1. **Storage**: I file PDF vengono salvati localmente. Per produzione, considera di usare un servizio di storage cloud (AWS S3, Cloudinary, etc.)

2. **Database**: Attualmente usa `sessions.json`. Per produzione, considera di migrare a un database vero (PostgreSQL, MongoDB, etc.)

3. **Logo Email**: Il logo viene caricato come base64 dall'email. Se preferisci un URL pubblico, aggiorna `backend/src/services/email.ts`

4. **CORS**: Il backend è configurato per accettare richieste da qualsiasi origine. In produzione, potresti voler limitare questo.

## Troubleshooting

### Il frontend non si carica
- Verifica che `frontend/dist` sia stato creato
- Controlla i log di Railway per errori di build

### Le email non vengono inviate
- Verifica le variabili d'ambiente SMTP
- Controlla i log per errori di connessione SMTP

### I PDF non vengono caricati
- Verifica che la cartella `backend/storage` esista e sia scrivibile
- Controlla i permessi del file system

## Supporto

Per problemi con Railway, consulta la [documentazione ufficiale](https://docs.railway.app).

