# Fix 404 Error - Conflitto Location Blocks

## Problema Identificato

Il file `main.conf` ha un conflitto:

1. La location `~ \.(html)$` sta catturando `index.html` e lo sta mandando a `@proxy` invece di servire il file statico
2. C'è un `root` globale che potrebbe interferire

## Soluzione

Devi modificare il file `main.conf` per escludere `index.html` dalla location HTML o cambiare l'ordine delle location.

### Opzione 1: Modifica la Location HTML (Consigliata)

Modifica la location `~ \.(html)$` per escludere `index.html` e servire i file statici:

```bash
sudo nano /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf
```

**Trova questa sezione:**
```nginx
location ~ \.(html)$ {
    expires     24h;
    include /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.html.*.conf;
    try_files $uri @proxy;
}
```

**Sostituiscila con:**
```nginx
location ~ \.(html)$ {
    expires     24h;
    include /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.html.*.conf;
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri =404;
}
```

**OPPURE, ancora meglio, escludi index.html dalla regex:**
```nginx
location ~ \.(html)$ {
    expires     24h;
    include /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.html.*.conf;
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri =404;
}

# Aggiungi una location specifica per index.html PRIMA della location regex
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
}
```

### Opzione 2: Sposta la Location `/` Prima delle Regex (Più Semplice)

Sposta la location `/` PRIMA della location `~ \.(html)$`:

```bash
sudo nano /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf
```

**La struttura dovrebbe essere:**
1. Location `/` (per SPA routing)
2. Location `/api` (per API)
3. Location `/docs` (per docs)
4. Location `~ \.(html)$` (per altri file HTML)
5. Altre location...

### Opzione 3: Modifica Completa (Raccomandata)

Ecco come dovrebbe essere la sezione delle location nel file:

```nginx
# Serve frontend static files - DEVE ESSERE PRIMA delle regex
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Proxy per API
location /api {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
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

# Serve docs
location /docs {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    alias /home/fabrizio/webapps/thaiheavens-sign-app/docs-site/.vitepress/dist;
    try_files $uri $uri/ /docs/index.html;
}

# Location specifica per index.html (esatta match, ha priorità)
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
}

# Altri file HTML (ma non index.html grazie alla location = sopra)
location ~ \.(html)$ {
    expires     24h;
    include /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.html.*.conf;
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri =404;
}
```

## Dopo le Modifiche

```bash
# Testa la configurazione
sudo /usr/local/sbin/nginx-rc -t

# Se il test passa, ricarica
sudo /usr/local/sbin/nginx-rc -s reload

# Testa
curl -I http://localhost/
```

## Spiegazione

Il problema è che Nginx processa le location in questo ordine:
1. Location esatte (`=`)
2. Location prefix (`/`)
3. Location regex (`~`)

La location `~ \.(html)$` stava catturando `index.html` e lo mandava a `@proxy`, che probabilmente cerca di servirlo tramite PHP (che non esiste), causando 404.

La soluzione è:
- Aggiungere una location esatta `= /index.html` che ha priorità
- O modificare la location regex per servire i file statici invece di andare a `@proxy`




