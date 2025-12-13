# Debug 404 Error - Checklist

## Step 1: Verifica che i File Frontend Esistano

```bash
# Verifica che la directory dist esista
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/

# Verifica che index.html esista
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/index.html

# Se non esiste, rifai il build
cd /home/fabrizio/webapps/thaiheavens-sign-app
./deploy-manual-complete.sh
```

## Step 2: Verifica il Contenuto del File main.conf

```bash
# Leggi il file di configurazione
sudo cat /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf
```

**Verifica che la location `/` abbia il path corretto:**
```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;
    try_files $uri $uri/ /index.html;
}
```

**IMPORTANTE:** Il path deve essere esattamente:
- `root /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist;`

## Step 3: Verifica i Permessi

```bash
# Verifica i permessi della directory
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/

# Se i permessi sono sbagliati, correggili
sudo chown -R fabrizio:fabrizio /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/
sudo chmod -R 755 /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/
```

## Step 4: Verifica i Log di Nginx

```bash
# Guarda gli errori recenti
sudo tail -50 /var/log/nginx/error.log

# Guarda gli accessi recenti
sudo tail -50 /var/log/nginx/access.log
```

Cerca messaggi come:
- `No such file or directory`
- `Permission denied`
- `open() failed`

## Step 5: Testa la Configurazione

```bash
# Testa la configurazione
sudo /usr/local/sbin/nginx-rc -t

# Se ci sono errori, correggili prima di continuare
```

## Step 6: Verifica il Public Path in RunCloud

1. Vai su **RunCloud Dashboard** → **Web Apps** → `thaiheavens-sign-app-web` → **Stack**
2. Verifica che **Public Path** sia: `/home/fabrizio/webapps/thaiheavens-sign-app`
3. **NON** deve essere `/home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist` (solo fino alla root del progetto)

## Step 7: Testa Direttamente

```bash
# Testa se Nginx trova il file
curl http://localhost/

# Dovresti vedere l'HTML della pagina
# Se vedi 404, il problema è nella configurazione Nginx

# Testa anche con il dominio
curl http://sign.process-innovation.it/
```

## Step 8: Verifica che Nginx Stia Usando il File Corretto

```bash
# Verifica quale file sta usando Nginx
sudo /usr/local/sbin/nginx-rc -T | grep -A 20 "thaiheavens"

# Questo ti mostra la configurazione effettiva che Nginx sta usando
```

## Possibili Problemi Comuni

### Problema 1: Path Sbagliato nel main.conf
**Sintomo:** 404 su tutte le richieste
**Soluzione:** Verifica che `root` punti a `/home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist`

### Problema 2: File Non Esistono
**Sintomo:** 404, e nei log vedi "No such file or directory"
**Soluzione:** Rifai il build con `./deploy-manual-complete.sh`

### Problema 3: Permessi Sbagliati
**Sintomo:** 403 Forbidden o 404, nei log vedi "Permission denied"
**Soluzione:** Correggi i permessi con `chown` e `chmod`

### Problema 4: Public Path in RunCloud Sbagliato
**Sintomo:** 404 anche se tutto sembra corretto
**Soluzione:** Verifica che Public Path sia `/home/fabrizio/webapps/thaiheavens-sign-app` (non `/frontend/dist`)

### Problema 5: Nginx Non Ha Ricaricato la Configurazione
**Sintomo:** Modifiche non si applicano
**Soluzione:** 
```bash
sudo /usr/local/sbin/nginx-rc -s reload
# Oppure
sudo systemctl reload nginx
```

## Comando Completo per Rifare Tutto

Se nulla funziona, esegui questo script completo:

```bash
# 1. Vai nella directory del progetto
cd /home/fabrizio/webapps/thaiheavens-sign-app

# 2. Rifai il build e deploy
./deploy-manual-complete.sh

# 3. Verifica che i file esistano
ls -la frontend/dist/index.html

# 4. Correggi i permessi (se necessario)
sudo chown -R fabrizio:fabrizio frontend/dist/
sudo chmod -R 755 frontend/dist/

# 5. Verifica la configurazione Nginx
sudo cat /etc/nginx-rc/conf.d/thaiheavens-sign-app.d/main.conf

# 6. Testa la configurazione
sudo /usr/local/sbin/nginx-rc -t

# 7. Ricarica Nginx
sudo /usr/local/sbin/nginx-rc -s reload

# 8. Testa
curl -I http://localhost/
```




