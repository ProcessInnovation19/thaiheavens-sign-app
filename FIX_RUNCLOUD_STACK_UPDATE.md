# Fix: RunCloud Stack UPDATE - Problema "Non Trova Nulla"

## Problema
Dopo aver fatto UPDATE della sezione "Stack" in RunCloud, l'applicazione non trova più nulla.

## Causa
RunCloud potrebbe aver resettato i **file extra di configurazione Nginx** quando hai fatto UPDATE, anche se non hai cambiato i valori. La configurazione era stata fatta tramite **Extra Nginx Configuration**, non tramite Custom Nginx Configuration.

## Soluzione Rapida

### 1. Verifica il Public Path
In RunCloud Dashboard → Web Apps → `thaiheavens-sign-app-web` → **Stack**:
- **Public Path**: Deve essere `/home/fabrizio/webapps/thaiheavens-sign-app`
- Se è diverso, correggilo e fai **Update Stack**

### 2. Verifica i File Extra di Configurazione Nginx
Vai su **Nginx Config** → **Extra Nginx Configuration**

**Se la lista è VUOTA o mancano i file, devi ricrearli:**

1. Clicca **"Add Extra Nginx Configuration"**
2. Scegli:
   - **Type**: `location.main` (per location blocks nel server principale)
   - **Name**: `api-proxy` (o qualsiasi nome)
3. Incolla questa configurazione:

```nginx
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
```

4. Clicca **Save**

5. **Aggiungi un secondo file extra** per il frontend:
   - Clicca di nuovo **"Add Extra Nginx Configuration"**
   - **Type**: `location.main`
   - **Name**: `frontend-static`
   - Incolla:

```nginx
# Serve frontend static files
location / {
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Serve docs
location /docs {
    alias /home/fabrizio/webapps/thaiheavens-sign-app/docs-site/.vitepress/dist;
    try_files $uri $uri/ /docs/index.html;
}
```

6. Clicca **Save**

**RunCloud dovrebbe riavviare Nginx automaticamente dopo ogni salvataggio.**

### 2b. Alternativa: Verifica via SSH

Se preferisci verificare direttamente sul server:

```bash
# Connettiti al server
ssh root@tuo-server-ip

# Trova i file extra di configurazione
ls -la /etc/nginx-rc/extra.d/ | grep thaiheavens

# Se non ci sono file, devi ricrearli da RunCloud Dashboard
# Se ci sono, verifica il contenuto:
sudo cat /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.main.*.conf
```

**Se i file non esistono o sono vuoti, ricrearli da RunCloud Dashboard come descritto sopra.**

### 3. Verifica il File Principale Nginx (opzionale)

Se vuoi verificare anche il file principale (di solito non serve modificarlo):

```bash
# Via SSH
sudo cat /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf
```

**IMPORTANTE**: Non modificare il file `main.conf` direttamente se non sai cosa stai facendo. RunCloud lo gestisce automaticamente. Usa sempre i **file extra** per le tue personalizzazioni.

### 4. Verifica che il Backend sia in Esecuzione

In RunCloud Dashboard → **Node.js Apps** → `thaiheavens-sign-app`:
- Verifica che lo stato sia **Running** (verde)
- Se è **Stopped**, clicca **Start**
- Se ci sono errori, controlla i **Logs**

### 5. Verifica via SSH (Opzionale)

Se vuoi verificare manualmente:

```bash
# Connettiti al server
ssh root@tuo-server-ip

# Verifica che il backend sia in esecuzione
pm2 list
# Dovresti vedere "thaiheavens-backend" in stato "online"

# Verifica che i file esistano
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist
# Dovresti vedere index.html e altri file

# Verifica la configurazione Nginx
sudo cat /etc/nginx/sites-available/*thaiheavens* | grep -A 5 "location /"
# Dovresti vedere la configurazione del proxy
```

### 6. Riavvia Nginx Manualmente (se necessario)

Se RunCloud non ha riavviato Nginx automaticamente:

```bash
# Via SSH
sudo /usr/local/sbin/nginx-rc -s reload
# oppure
sudo systemctl reload nginx
```

### 7. Verifica che Funzioni

1. Apri il browser e vai su `https://sign.process-innovation.it`
2. Dovresti vedere la pagina di login/admin
3. Se vedi un errore 404 o "Not Found", la configurazione Nginx non è corretta
4. Se vedi un errore 502, il backend non è in esecuzione

## Checklist Rapida

- [ ] Public Path corretto: `/home/fabrizio/webapps/thaiheavens-sign-app`
- [ ] **File extra Nginx presenti** in "Extra Nginx Configuration" (almeno 2 file: `api-proxy` e `frontend-static`)
- [ ] Backend Node.js in esecuzione (stato "Running")
- [ ] Nginx riavviato (automatico o manuale)
- [ ] File `frontend/dist/index.html` esiste sul server
- [ ] PM2 mostra il processo "thaiheavens-backend" online

## Se Ancora Non Funziona

1. **Controlla i Log di Nginx**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Controlla i Log del Backend**:
   - In RunCloud → Node.js Apps → Logs
   - Oppure via SSH: `pm2 logs thaiheavens-backend`

3. **Verifica i Permessi**:
   ```bash
   sudo chown -R fabrizio:fabrizio /home/fabrizio/webapps/thaiheavens-sign-app
   sudo chmod -R 755 /home/fabrizio/webapps/thaiheavens-sign-app
   ```

4. **Rifai il Deploy**:
   ```bash
   cd /home/fabrizio/webapps/thaiheavens-sign-app
   git pull origin main
   chmod +x deploy-manual-complete.sh
   ./deploy-manual-complete.sh
   ```

## Nota Importante

**Dopo ogni UPDATE della sezione Stack in RunCloud, verifica sempre:**
1. Che il Public Path sia corretto
2. Che i **file extra di configurazione Nginx** siano ancora presenti (vai su "Extra Nginx Configuration")
3. Che il backend sia ancora in esecuzione

**RunCloud a volte cancella i file extra quando fai UPDATE della sezione Stack**, anche se non cambi i valori. Questo è il motivo per cui l'applicazione non trova più nulla.

**Dove trovare i file extra:**
- RunCloud Dashboard → Web Apps → `thaiheavens-sign-app-web` → **Nginx Config** → **Extra Nginx Configuration**
- Sul server: `/etc/nginx-rc/extra.d/thaiheavens-sign-app.location.main.*.conf`

