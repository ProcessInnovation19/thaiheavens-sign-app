# Fix Git Pull sul Server

## Problema
Git pull fallisce perché ci sono modifiche locali che entrano in conflitto.

## Soluzione: Scarta le Modifiche Locali

Esegui questi comandi sul server:

```bash
# Vai nella directory
cd /home/fabrizio/webapps/thaiheavens-sign-app

# Opzione 1: Scarta le modifiche locali (CONSIGLIATO se non servono)
git reset --hard origin/main

# Oppure Opzione 2: Salva le modifiche locali in uno stash
git stash
git pull origin main
git stash pop  # Se vuoi riapplicare le modifiche dopo

# Dopo il pull, esegui lo script
chmod +x deploy-manual-complete.sh
./deploy-manual-complete.sh
```

## Se Preferisci Conservare le Modifiche

Se le modifiche locali sono importanti:

```bash
# Salva le modifiche
git stash save "Modifiche locali prima di pull"

# Fai pull
git pull origin main

# Vedi cosa c'era nello stash
git stash show -p

# Se vuoi riapplicare (potrebbero esserci conflitti)
git stash pop
```

## Soluzione Rapida (Consigliata)

Per allineare completamente il server con il repository:

```bash
cd /home/fabrizio/webapps/thaiheavens-sign-app

# Scarta tutte le modifiche locali e allinea con il repository
git reset --hard origin/main

# Verifica che sia allineato
git status

# Ora esegui il deploy
chmod +x deploy-manual-complete.sh
./deploy-manual-complete.sh
```

