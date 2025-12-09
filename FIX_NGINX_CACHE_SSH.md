# Fix Cache Nginx via SSH

## Soluzione: Modifica il file Nginx esistente

Dato che la configurazione è stata fatta da terminale, modifichiamola direttamente.

### Step 1: Trova il file di configurazione

```bash
# Connettiti al server
ssh root@tuo-server

# Trova il file di configurazione
ls -la /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/
# Oppure
ls -la /etc/nginx-rc/extra.d/ | grep thaiheavens
```

Il file dovrebbe essere qualcosa come:
- `/etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf`
- `/etc/nginx-rc/extra.d/thaiheavens-sign-app.location.main.*.conf`

### Step 2: Fai un backup

```bash
# Trova il file esatto
sudo find /etc/nginx-rc -name "*thaiheavens*" -type f

# Fai un backup
sudo cp /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf.backup
```

### Step 3: Modifica il file

Apri il file con nano:
```bash
sudo nano /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf
```

**Aggiungi questi header no-cache a TUTTE le location blocks esistenti:**

```nginx
# Esempio: se hai già una location / così:
location / {
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Modificala così:
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Se hai location /api, aggiungi gli header:
location /api {
    proxy_pass http://localhost:5000;
    # ... altre direttive esistenti ...
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# Se hai location /images, aggiungi:
location /images {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    # ... altre direttive esistenti ...
}
```

### Step 4: Testa e ricarica

```bash
# Testa la configurazione
sudo /usr/local/sbin/nginx-rc -t

# Se il test passa, ricarica
sudo /usr/local/sbin/nginx-rc -s reload
```

### Step 5: Verifica

```bash
# Controlla gli header
curl -I http://sign.process-innovation.it/

# Dovresti vedere:
# Cache-Control: no-cache, no-store, must-revalidate
# Pragma: no-cache
# Expires: 0
```

## Alternativa: Crea file extra in RunCloud

Se preferisci farlo da RunCloud:

1. Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web`
2. Vai su **Nginx Config** → **Extra Nginx Configuration**
3. Clicca **"Add Extra Nginx Configuration"**
4. Scegli:
   - **Type**: `location.main` (per location blocks nel server principale)
   - **Name**: `no-cache-headers` (o qualsiasi nome)
5. Incolla questa configurazione:

```nginx
# Disabilita cache per tutti i file statici
location ~* \.(html|js|css)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

location /images/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

6. Salva e RunCloud ricaricherà Nginx automaticamente


