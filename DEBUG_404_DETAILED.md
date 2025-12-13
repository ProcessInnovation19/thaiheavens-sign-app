# Debug 404 Dettagliato

## Comandi da Eseguire sul Server

### 1. Verifica il Log degli Errori Specifico dell'App

```bash
sudo tail -50 /home/fabrizio/logs/nginx/thaiheavens-sign-app_error.log
```

Questo ti dirà ESATTAMENTE cosa sta cercando Nginx e perché non lo trova.

### 2. Verifica il Log di Accesso

```bash
sudo tail -20 /home/fabrizio/logs/nginx/thaiheavens-sign-app_access.log
```

### 3. Testa se il File è Accessibile Direttamente

```bash
# Testa se Nginx può leggere il file
sudo -u www-data cat /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/index.html

# Se dà errore "Permission denied", il problema sono i permessi
```

### 4. Verifica i Permessi

```bash
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/
ls -la /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/index.html
```

### 5. Testa con il Path Completo

```bash
# Verifica che il path sia corretto
curl http://localhost/index.html

# Testa anche la root
curl http://localhost/
```

### 6. Verifica la Configurazione Effettiva che Nginx Sta Usando

```bash
sudo /usr/local/sbin/nginx-rc -T | grep -A 30 "thaiheavens-sign-app"
```

Questo mostra la configurazione effettiva che Nginx sta usando (potrebbe essere diversa da quella nel file).

### 7. Verifica se ci sono File Extra che Interferiscono

```bash
# Lista tutti i file extra
ls -la /etc/nginx-rc/extra.d/ | grep thaiheavens

# Leggi i file extra se esistono
sudo cat /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.main.*.conf
sudo cat /etc/nginx-rc/extra.d/thaiheavens-sign-app.location.html.*.conf
```

### 8. Verifica il Public Path in RunCloud

Il Public Path in RunCloud potrebbe essere sbagliato e interferire.

### 9. Testa con un File di Test

```bash
# Crea un file di test
echo "TEST" > /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/test.txt

# Testa se è accessibile
curl http://localhost/test.txt
```

## Possibili Problemi

### Problema 1: Permessi
Se `www-data` (utente di Nginx) non può leggere i file:
```bash
sudo chown -R fabrizio:www-data /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/
sudo chmod -R 755 /home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist/
```

### Problema 2: Root Globale Interferisce
Il `root` globale all'inizio del file potrebbe interferire. Potremmo dover rimuoverlo o modificarlo.

### Problema 3: File Extra che Sovrascrivono
I file extra potrebbero avere configurazioni che sovrascrivono le nostre.

### Problema 4: Public Path in RunCloud
Se il Public Path in RunCloud è impostato su `/home/fabrizio/webapps/thaiheavens-sign-app/frontend/dist`, potrebbe creare conflitti.




