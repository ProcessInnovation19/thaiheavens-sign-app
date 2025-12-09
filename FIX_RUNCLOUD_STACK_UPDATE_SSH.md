# Fix: RunCloud Stack UPDATE - Ripristina Configurazione Nginx via SSH

## Problema
Dopo aver fatto UPDATE della sezione "Stack" in RunCloud, l'applicazione non trova più nulla. La configurazione Nginx era stata fatta direttamente sul server via SSH/editor, non tramite RunCloud Dashboard.

## Causa
RunCloud potrebbe aver resettato o sovrascritto i file di configurazione Nginx quando hai fatto UPDATE della sezione Stack.

## Soluzione: Verifica e Ripristina i File sul Server

### Step 1: Connettiti al Server

```bash
ssh root@tuo-server-ip
# oppure
ssh fabrizio@tuo-server-ip
```

### Step 2: Trova i File di Configurazione Nginx

```bash
# Trova tutti i file di configurazione per thaiheavens
sudo find /etc/nginx-rc -name "*thaiheavens*" -type f

# Verifica il file principale
ls -la /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/

# Verifica i file extra
ls -la /etc/nginx-rc/extra.d/ | grep thaiheavens
```

I file dovrebbero essere:
- `/etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf` (file principale)
- `/etc/nginx-rc/extra.d/thaiheavens-sign-app.location.main.*.conf` (file extra)

### Step 3: Verifica il Contenuto dei File

```bash
# Leggi il file principale
sudo cat /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf

# Leggi i file extra (se esistono)
sudo cat /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.main.*.conf
```

**Se i file sono vuoti o mancano le configurazioni, procedi con Step 4.**

### Step 4: Ripristina il File Principale (main.conf)

```bash
# Fai un backup prima di modificare
sudo cp /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf.backup

# Apri il file con nano
sudo nano /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf
```

**Assicurati che il file contenga almeno queste location blocks:**

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

**Salva il file:**
- Premi `Ctrl + O` per salvare
- Premi `Enter` per confermare
- Premi `Ctrl + X` per uscire

### Step 5: Verifica i File Extra (se li usavi)

Se usavi file extra in `/etc/nginx-rc/extra.d/`, verifica che esistano ancora:

```bash
# Lista tutti i file extra per thaiheavens
ls -la /etc/nginx-rc/extra.d/ | grep thaiheavens

# Se non ci sono, potresti doverli ricreare
# Oppure metti tutto nel file main.conf (più semplice)
```

**Se i file extra sono stati cancellati**, puoi:
1. **Opzione A**: Ricrearli (se preferisci tenerli separati)
2. **Opzione B**: Mettere tutto nel `main.conf` (più semplice, consigliato)

### Step 6: Testa la Configurazione Nginx

```bash
# Testa la configurazione (verifica errori di sintassi)
sudo /usr/local/sbin/nginx-rc -t

# Se vedi "syntax is ok" e "test is successful", procedi
# Se vedi errori, correggili prima di continuare
```

### Step 7: Ricarica Nginx

```bash
# Ricarica Nginx con la nuova configurazione
sudo /usr/local/sbin/nginx-rc -s reload

# Oppure
sudo systemctl reload nginx
```

### Step 8: Verifica che Funzioni

```bash
# Controlla lo stato di Nginx
sudo systemctl status nginx

# Verifica che il backend sia in esecuzione
pm2 list
# Dovresti vedere "thaiheavens-backend" in stato "online"

# Testa l'applicazione
curl -I http://localhost/
# Dovresti vedere una risposta HTTP 200 o 304
```

### Step 9: Verifica il Public Path in RunCloud

Anche se hai modificato i file direttamente, verifica che il Public Path in RunCloud sia corretto:

1. Vai su RunCloud Dashboard → Web Apps → `thaiheavens-sign-app-web` → **Stack**
2. Verifica che **Public Path** sia: `/home/fabrizio/webapps/thaiheavens-sign-app`
3. Se è diverso, correggilo e fai **Update Stack** (ma poi ricontrolla i file Nginx!)

## Se Ancora Non Funziona

### Verifica i Log di Nginx

```bash
# Log degli errori
sudo tail -f /var/log/nginx/error.log

# Log di accesso
sudo tail -f /var/log/nginx/access.log
```

### Verifica i Permessi

```bash
# Verifica che i file esistano
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/index.html

# Se non esistono, rifai il build
cd /home/fabrizio/webapps/thaiheavens-sign-app
chmod +x deploy-manual-complete.sh
./deploy-manual-complete.sh
```

### Verifica il Backend

```bash
# Controlla PM2
pm2 list
pm2 logs thaiheavens-backend

# Se non è in esecuzione, riavvialo
pm2 restart thaiheavens-backend
```

## Checklist Rapida

- [ ] File `main.conf` contiene le location blocks per `/api`, `/`, e `/docs`
- [ ] Public Path in RunCloud è corretto: `/home/fabrizio/webapps/thaiheavens-sign-app`
- [ ] Test Nginx passa: `sudo /usr/local/sbin/nginx-rc -t` → "syntax is ok"
- [ ] Nginx ricaricato: `sudo /usr/local/sbin/nginx-rc -s reload`
- [ ] Backend in esecuzione: `pm2 list` → "thaiheavens-backend" online
- [ ] File frontend esistono: `ls /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/index.html`

## Nota Importante

**Dopo ogni UPDATE della sezione Stack in RunCloud:**
1. Verifica sempre che i file Nginx sul server siano ancora corretti
2. RunCloud potrebbe sovrascriverli quando fai UPDATE
3. Se vengono sovrascritti, ripristinali usando questa guida

**Per evitare problemi futuri:**
- Fai sempre un backup dei file prima di fare UPDATE: `sudo cp main.conf main.conf.backup`
- Considera di usare i file extra invece del main.conf (RunCloud li modifica meno spesso)

