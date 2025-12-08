# Guida Deploy su UpCloud + RunCloud

Questa guida ti aiuterà a deployare ThaiHeavensSignApp su un server UpCloud gestito con RunCloud.

## Prerequisiti

1. Server UpCloud attivo
2. RunCloud configurato sul server
3. Accesso SSH al server
4. Dominio (opzionale, ma consigliato)

## Step 1: Preparare il Server

### 1.1 Connetti il Server a RunCloud

1. Vai su [RunCloud Dashboard](https://app.runcloud.io)
2. Aggiungi il tuo server UpCloud
3. Segui la procedura di installazione di RunCloud sul server

### 1.2 Installa Node.js

RunCloud supporta Node.js tramite "Node.js Apps". Verifica che Node.js sia installato:

```bash
# Connettiti via SSH al server
ssh root@tuo-server-ip

# Verifica Node.js (RunCloud lo installa automaticamente)
node --version
npm --version
```

Se non è installato, RunCloud lo installerà quando crei la prima Node.js App.

## Step 2: Preparare il Codice

### 2.1 Clona il Repository

```bash
# Sulla macchina locale, prepara il repository
git add .
git commit -m "Ready for production"
git push origin main
```

### 2.2 Sul Server, Clona il Repository

```bash
# Connettiti al server
ssh root@tuo-server-ip

# Vai nella directory dove vuoi deployare (es. /home/runcloud)
cd /home/runcloud

# Clona il repository
git clone https://github.com/ProcessInnovation19/thaiheavens-sign-app.git
cd thaiheavens-sign-app
```

## Step 3: Configurare RunCloud Node.js App

### 3.1 Crea una Node.js App in RunCloud

1. Vai su RunCloud Dashboard
2. Seleziona il tuo server
3. Vai su "Node.js Apps" → "Create New App"
4. Configura:
   - **App Name**: `thaiheavens-sign-app`
   - **Node.js Version**: `18.x` o `20.x`
   - **App Directory**: `/home/runcloud/thaiheavens-sign-app`
   - **Startup File**: `backend/dist/index.js`
   - **Port**: `5000` (o lascia che RunCloud scelga)
   - **Environment**: `production`

### 3.2 Configura le Variabili d'Ambiente

Nella sezione "Environment Variables" della Node.js App, aggiungi:

```
NODE_ENV=production
PORT=5000
SMTP_HOST=smtp.qboxmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@thaiheavens.com
SMTP_PASS=b5JZypAsbgjt
```

## Step 4: Build e Installazione

### 4.1 Installa Dipendenze e Build

```bash
# Sul server, nella directory del progetto
cd /home/runcloud/thaiheavens-sign-app

# Installa dipendenze backend
cd backend
npm install
npm run build

# Installa dipendenze frontend
cd ../frontend
npm install
npm run build

# Installa dipendenze docs-site
cd ../docs-site
npm install
npm run build
```

### 4.2 Crea Directory Storage

```bash
# Crea le directory per lo storage
mkdir -p /home/runcloud/thaiheavens-sign-app/backend/storage/original
mkdir -p /home/runcloud/thaiheavens-sign-app/backend/storage/signed
mkdir -p /home/runcloud/thaiheavens-sign-app/backend/uploads

# Imposta i permessi
chmod -R 755 /home/runcloud/thaiheavens-sign-app/backend/storage
chmod -R 755 /home/runcloud/thaiheavens-sign-app/backend/uploads
```

## Step 5: Configurare Nginx (RunCloud)

### 5.1 Crea un Web App in RunCloud

1. Vai su "Web Apps" → "Create New App"
2. Configura:
   - **App Name**: `thaiheavens-sign-app-web`
   - **Domain**: `tuo-dominio.com` (o IP temporaneo)
   - **PHP Version**: Non necessario (lasciare default)
   - **Web Directory**: `/home/runcloud/thaiheavens-sign-app/frontend/dist`

### 5.2 Configura Nginx per Proxy

Nella Web App, vai su "Nginx Config" e modifica per fare proxy al backend:

```nginx
# Aggiungi questa configurazione nella sezione "Custom Nginx Configuration"

# Proxy per API
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Serve frontend static files
location / {
    root /home/runcloud/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Serve docs
location /docs {
    alias /home/runcloud/thaiheavens-sign-app/docs-site/.vitepress/dist;
    try_files $uri $uri/ /docs/index.html;
}
```

### 5.3 Riavvia Nginx

Dopo aver modificato la configurazione, RunCloud dovrebbe riavviare Nginx automaticamente. Se non lo fa:

```bash
# Via SSH
sudo systemctl reload nginx
```

## Step 6: Avviare l'Applicazione

### 6.1 Avvia la Node.js App

1. Vai su RunCloud Dashboard → Node.js Apps → `thaiheavens-sign-app`
2. Clicca "Start" o "Restart"
3. Verifica i log per assicurarti che sia partita correttamente

### 6.2 Verifica che Funzioni

```bash
# Controlla che il processo Node.js sia in esecuzione
ps aux | grep node

# Controlla i log
# In RunCloud Dashboard → Node.js Apps → Logs
```

## Step 7: Configurare SSL (Opzionale ma Consigliato)

1. Vai su RunCloud Dashboard → Web Apps → `thaiheavens-sign-app-web`
2. Vai su "SSL"
3. Clicca "Install Let's Encrypt SSL"
4. Inserisci il tuo dominio
5. RunCloud installerà automaticamente il certificato SSL

## Step 8: Configurare PM2 (Opzionale, per Auto-Restart)

RunCloud gestisce automaticamente il processo Node.js, ma se vuoi più controllo:

```bash
# Installa PM2 globalmente
npm install -g pm2

# Crea un file ecosystem.config.js nella root del progetto
cd /home/runcloud/thaiheavens-sign-app
```

Crea `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'thaiheavens-backend',
    script: './backend/dist/index.js',
    cwd: '/home/runcloud/thaiheavens-sign-app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
};
```

## Step 9: Aggiornamenti Futuri

Per aggiornare l'applicazione:

```bash
# Sul server
cd /home/runcloud/thaiheavens-sign-app

# Pull delle modifiche
git pull origin main

# Rebuild
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
cd ../docs-site && npm install && npm run build

# Riavvia la Node.js App da RunCloud Dashboard
```

## Troubleshooting

### L'app non si avvia
- Controlla i log in RunCloud Dashboard
- Verifica che le variabili d'ambiente siano corrette
- Assicurati che il build sia completato: `ls -la backend/dist/`

### Le API non funzionano
- Verifica che Nginx faccia proxy corretto a `localhost:5000`
- Controlla che la Node.js App sia in esecuzione
- Verifica i log di Nginx: `sudo tail -f /var/log/nginx/error.log`

### I file PDF non vengono salvati
- Verifica i permessi delle directory storage
- Controlla che le directory esistano
- Verifica lo spazio disco: `df -h`

### Il frontend non si carica
- Verifica che `frontend/dist` sia stato creato
- Controlla che Nginx punti alla directory corretta
- Verifica i permessi: `chmod -R 755 frontend/dist`

## Vantaggi di RunCloud

✅ **Gestione Semplice**: Dashboard web per gestire tutto  
✅ **SSL Automatico**: Let's Encrypt integrato  
✅ **Backup**: RunCloud può fare backup automatici  
✅ **Monitoring**: Log e metriche integrate  
✅ **Multi-App**: Puoi hostare più applicazioni sullo stesso server  

## Note Importanti

- **Storage**: I PDF vengono salvati localmente sul server. Considera backup regolari
- **Database**: Attualmente usa `sessions.json`. Per produzione, considera PostgreSQL o MongoDB
- **Sicurezza**: Assicurati di avere firewall configurato (RunCloud può aiutare)
- **Backup**: Configura backup automatici per `backend/storage/`

## Costi

- **UpCloud**: Già pagato (se hai già il server)
- **RunCloud**: Gratuito per 1 server, $8/mese per più server
- **Totale**: $0-8/mese (molto più economico di Railway!)

---

**Pronto per il deploy!** 🚀

