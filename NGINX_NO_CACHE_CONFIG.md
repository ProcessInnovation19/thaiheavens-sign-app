# Configurazione Nginx per Disabilitare Cache

## Problema
Nginx/RunCloud sta cachando i file statici (HTML, JS, CSS, immagini), causando problemi quando si aggiorna il codice.

## Soluzione
Aggiungi questa configurazione nella sezione "Custom Nginx Configuration" della Web App in RunCloud.

## Configurazione Completa

Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web` → **Nginx Config** → **Custom Nginx Configuration**

Incolla questa configurazione:

```nginx
# DISABILITA CACHE per tutti i file statici
# Questo è CRITICO per vedere gli aggiornamenti immediatamente

# Disabilita cache per HTML
location ~* \.(html)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Disabilita cache per JavaScript e CSS
location ~* \.(js|css)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
}

# Disabilita cache per immagini
location /images/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri =404;
}

# Disabilita cache per index.html (SPA routing)
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
}

# Proxy per API (già presente, ma aggiungiamo no-cache)
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
    # Disabilita cache per API
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# Serve frontend static files (con no-cache)
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}

# Serve docs (con no-cache)
location /docs {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    alias /home/fabrizio/webapps/thaiheavens-sign-app/frontend/public/docs;
    try_files $uri $uri/ /docs/index.html;
}
```

## Dopo aver salvato:

1. **Ricarica Nginx** (RunCloud dovrebbe farlo automaticamente, altrimenti):
   ```bash
   sudo /usr/local/sbin/nginx-rc -s reload
   ```

2. **Pulisci la cache del browser** (Ctrl+F5 o Cmd+Shift+R)

3. **Verifica** che i file vengano serviti con header no-cache:
   ```bash
   curl -I http://sign.process-innovation.it/
   ```
   Dovresti vedere `Cache-Control: no-cache, no-store, must-revalidate`

## Nota Importante

Se RunCloud ha una cache proxy abilitata, potrebbe essere necessario disabilitarla nelle impostazioni della Web App.


