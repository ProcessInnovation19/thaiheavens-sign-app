# Configurazione Timeout per Agente Cursor

Questa guida spiega come configurare un timeout per l'agente "sviluppatore" di Cursor per evitare che si blocchi o vada in loop.

## Opzioni Disponibili

### 1. Impostazioni nell'Interfaccia di Cursor

**Windows/Linux:**
- Vai su `File` → `Preferences` → `Settings` (o `Ctrl+,`)
- Cerca "agent timeout" o "composer timeout"
- Imposta un valore in secondi (es. 60, 120, 300)

**Mac:**
- Vai su `Cursor` → `Settings` → `Preferences` (o `Cmd+,`)
- Cerca "agent timeout" o "composer timeout"

### 2. File di Configurazione

Cursor potrebbe supportare file di configurazione. Prova a creare:

**`.cursor/settings.json`** (nella root del progetto):
```json
{
  "cursor.agent.timeout": 120,
  "cursor.agent.maxIterations": 10,
  "cursor.agent.idleTimeout": 60
}
```

**Nota:** Questi nomi di impostazione potrebbero variare. Controlla la documentazione ufficiale di Cursor.

### 3. Impostazioni Globali di Cursor

Le impostazioni globali si trovano in:

**Windows:**
```
%APPDATA%\Cursor\User\settings.json
```

**Mac:**
```
~/Library/Application Support/Cursor/User/settings.json
```

**Linux:**
```
~/.config/Cursor/User/settings.json
```

Aggiungi queste impostazioni:
```json
{
  "cursor.composer.timeout": 120,
  "cursor.agent.maxSteps": 20,
  "cursor.agent.idleTimeout": 60
}
```

### 4. Limitazioni tramite cursor-rules.txt

Puoi aggiungere istruzioni nel file `cursor-rules.txt` per limitare il comportamento dell'agente:

```
AGENT BEHAVIOR LIMITS

- Maximum iterations per task: 10
- If no progress after 5 minutes, stop and report status
- Do not retry failed operations more than 3 times
- If stuck in a loop, stop and ask for clarification
- Complete one task at a time before starting another
```

## Soluzioni Pratiche

### Soluzione 1: Interrompere Manualmente
- Premi `Esc` nella chat dell'agente
- Clicca sul pulsante "Stop" se disponibile
- Chiudi e riapri la finestra dell'agente

### Soluzione 2: Task Più Piccoli
Invece di dare un task grande, spezzalo in task più piccoli:
- ❌ "Implementa tutto il sistema di autenticazione"
- ✅ "Crea il modello User con email e password"
- ✅ "Aggiungi endpoint POST /api/login"
- ✅ "Aggiungi middleware di autenticazione"

### Soluzione 3: Timeout Manuale
Quando avvii l'agente, specifica:
```
"Completa questo task in massimo 5 minuti. Se non riesci, fermati e riporta lo stato."
```

### Soluzione 4: Monitoraggio
Tieni aperto il Task Manager (Windows) o Activity Monitor (Mac) per vedere se l'agente sta consumando risorse eccessive.

## Verifica delle Impostazioni

1. Apri Cursor
2. Vai su `File` → `Preferences` → `Settings`
3. Cerca "timeout" o "agent"
4. Verifica se ci sono opzioni disponibili

## Note Importanti

- Le impostazioni di timeout potrebbero non essere disponibili in tutte le versioni di Cursor
- Alcune funzionalità potrebbero essere in beta o disponibili solo per utenti premium
- Controlla la documentazione ufficiale: https://cursor.sh/docs

## Contatto Supporto

Se l'agente continua a bloccarsi:
1. Raccogli informazioni sul problema (cosa stava facendo, quanto tempo è passato)
2. Contatta il supporto di Cursor: support@cursor.sh
3. Includi screenshot o log se disponibili

---

**Ultimo aggiornamento:** Questa guida è basata su informazioni generali. Le impostazioni specifiche possono variare in base alla versione di Cursor.

