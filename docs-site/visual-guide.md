# Guida Visuale - Diagrammi e Flussi

Questa guida contiene diagrammi visuali semplificati per aiutare tutti gli utenti a comprendere come funziona il sistema.

## 🎯 Panoramica del Sistema

```mermaid
graph TB
    subgraph Admin["👤 Amministratore"]
        A[Carica PDF] --> B[Posiziona Firma]
        B --> C[Crea Link]
        C --> D[Invia al Cliente]
    end
    
    subgraph Cliente["👥 Cliente"]
        E[Riceve Link] --> F[Legge Contratto]
        F --> G[Firma Digitale]
        G --> H[Conferma]
        H --> I[Scarica PDF Firmato]
    end
    
    D -.->|" "| E
    
    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#e1f5ff
    style E fill:#fff4e1
    style F fill:#fff4e1
    style G fill:#fff4e1
    style H fill:#fff4e1
    style I fill:#fff4e1
    style Admin fill:#f0f9ff,stroke:#3b82f6,stroke-width:2px
    style Cliente fill:#fff7ed,stroke:#f97316,stroke-width:2px
```

### Cosa fa il Sistema?

1. **L'Amministratore** carica un PDF, decide dove mettere la firma, e crea un link
2. **Il Cliente** riceve il link, legge il contratto, firma, e scarica il PDF firmato

---

## 📋 Processo Completo Passo-Passo

### Per l'Amministratore

```mermaid
flowchart TD
    Start([Inizio]) --> Upload[📄 Carica PDF]
    Upload --> View[👁️ Visualizza PDF]
    View --> Click[🖱️ Clicca dove Firmare]
    Click --> Box[📦 Rettangolo Rosso Appare]
    Box --> Adjust{Regolare?}
    Adjust -->|Sì| Drag[↔️ Trascina/Ridimensiona]
    Drag --> Box
    Adjust -->|No| Info[✏️ Inserisci Dati Cliente]
    Info --> Create[✅ Crea Link]
    Create --> Copy[📋 Copia Link]
    Copy --> Send[📧 Invia al Cliente]
    Send --> End([Fine])
    
    style Start fill:#90EE90
    style Upload fill:#87CEEB
    style View fill:#87CEEB
    style Click fill:#87CEEB
    style Box fill:#FFB6C1
    style Info fill:#87CEEB
    style Create fill:#98FB98
    style Copy fill:#98FB98
    style Send fill:#98FB98
    style End fill:#90EE90
```

### Per il Cliente

```mermaid
flowchart TD
    Start([Riceve Link]) --> Open[🌐 Apre Link]
    Open --> Read[📖 Legge Contratto]
    Read --> Navigate{Cambia Pagina?}
    Navigate -->|Sì| Pages[⬅️➡️ Naviga Pagine]
    Pages --> Read
    Navigate -->|No| Ready[✅ Pronto a Firmare]
    Ready --> Draw[✍️ Disegna Firma]
    Draw --> Check{Firma OK?}
    Check -->|No| Clear[🗑️ Cancella]
    Clear --> Draw
    Check -->|Sì| Apply[🖊️ Applica Firma]
    Apply --> Preview[👁️ Anteprima]
    Preview --> Confirm{Confermare?}
    Confirm -->|No| Draw
    Confirm -->|Sì| Download[💾 Scarica PDF]
    Download --> Complete([Completato!])
    
    style Start fill:#FFE4B5
    style Open fill:#FFE4B5
    style Read fill:#FFE4B5
    style Draw fill:#FFB6C1
    style Apply fill:#98FB98
    style Preview fill:#87CEEB
    style Download fill:#98FB98
    style Complete fill:#90EE90
```

---

## 🎨 Interfaccia Utente - Come Appare

### Pagina Amministratore

```mermaid
graph TB
    subgraph "Schermata Amministratore"
        A[📋 Lista Sessioni] --> B[➕ Nuova Sessione]
        B --> C[📤 Carica PDF]
        C --> D[📄 Visualizzatore PDF]
        D --> E[🖱️ Clicca per Posizionare]
        E --> F[📦 Rettangolo Rosso]
        F --> G[✏️ Dati Cliente]
        G --> H[🔗 Link Generato]
    end
    
    style A fill:#E6E6FA
    style B fill:#E0F7FA
    style C fill:#E0F7FA
    style D fill:#FFF9C4
    style E fill:#FFE0B2
    style F fill:#FFCDD2
    style G fill:#E0F7FA
    style H fill:#C8E6C9
```

### Pagina Cliente

```mermaid
graph TB
    subgraph "Schermata Cliente"
        A[📄 Contratto PDF] --> B[⬅️➡️ Navigazione]
        A --> C[✍️ Area Firma]
        C --> D[📏 Linea Guida]
        C --> E[🗑️ Cancella]
        C --> F[✅ Applica Firma]
        F --> G[👁️ Anteprima]
        G --> H[💾 Conferma e Scarica]
    end
    
    style A fill:#FFF9C4
    style B fill:#E3F2FD
    style C fill:#FFE0B2
    style D fill:#FFCDD2
    style F fill:#C8E6C9
    style G fill:#E1F5FE
    style H fill:#A5D6A7
```

---

## 🔄 Flusso Completo con Stati

```mermaid
stateDiagram-v2
    [*] --> Nuovo: Amministratore crea sessione
    Nuovo --> In Attesa: Link inviato
    In Attesa --> Firmato: Cliente firma
    Firmato --> Confermato: Cliente conferma
    Confermato --> [*]: PDF scaricato
    
    note right of Nuovo
        📄 PDF caricato
        📍 Posizione firma impostata
        🔗 Link generato
    end note
    
    note right of In Attesa
        ⏳ In attesa della firma
        📧 Link inviato al cliente
    end note
    
    note right of Firmato
        ✍️ Firma applicata
        👁️ Anteprima disponibile
    end note
    
    note right of Confermato
        ✅ Firma confermata
        💾 PDF pronto per download
    end note
```

---

## 📱 Funzionalità Mobile

```mermaid
graph LR
    A[📱 Smartphone] --> B[👆 Tocca per Navigare]
    A --> C[✍️ Disegna con Dito]
    A --> D[📏 Linea Guida Visibile]
    A --> E[💾 Download Funziona]
    
    style A fill:#E1BEE7
    style B fill:#BBDEFB
    style C fill:#FFE0B2
    style D fill:#FFCDD2
    style E fill:#C8E6C9
```

### Caratteristiche Mobile

- ✅ **Touch Support:** Tutto funziona con il tocco
- ✅ **Interfaccia Responsive:** Si adatta allo schermo
- ✅ **Pulsanti Grandi:** Facili da toccare
- ✅ **Canvas Grande:** Area firma comoda
- ✅ **Download:** Funziona su tutti i browser mobile

---

## 🎯 Casi d'Uso Principali

### Caso 1: Contratto di Affitto

```mermaid
journey
    title Contratto di Affitto - Processo Completo
    section Amministratore
      Carica Contratto: 5: Amministratore
      Posiziona Firma: 5: Amministratore
      Crea Link: 5: Amministratore
      Invia al Locatario: 5: Amministratore
    section Locatario
      Riceve Link: 5: Locatario
      Legge Contratto: 5: Locatario
      Firma: 5: Locatario
      Scarica Copia: 5: Locatario
```

### Caso 2: Documento Legale

```mermaid
journey
    title Documento Legale - Processo Completo
    section Avvocato
      Carica Documento: 5: Avvocato
      Posiziona Firma Cliente: 5: Avvocato
      Crea Link: 5: Avvocato
      Invia al Cliente: 5: Avvocato
    section Cliente
      Riceve Link: 5: Cliente
      Rivede Documento: 4: Cliente
      Firma: 5: Cliente
      Conferma: 5: Cliente
```

---

## ⚠️ Gestione Errori

```mermaid
flowchart TD
    A[Utente Azione] --> B{Valido?}
    B -->|No| C[❌ Mostra Errore]
    C --> D[📝 Messaggio Chiaro]
    D --> E[🔄 Opzione Riprova]
    E --> A
    B -->|Sì| F[✅ Processa]
    F --> G[✅ Successo]
    
    style B fill:#FFF9C4
    style C fill:#FFCDD2
    style D fill:#FFE0B2
    style E fill:#BBDEFB
    style F fill:#C8E6C9
    style G fill:#A5D6A7
```

### Tipi di Errori

- **Link Non Valido:** "Il link non è valido o è scaduto"
- **PDF Non Caricato:** "Errore nel caricamento del PDF"
- **Firma Mancante:** "Per favore, disegna la tua firma"
- **Errore di Rete:** "Problema di connessione, riprova"

---

## 🔐 Sicurezza e Privacy

```mermaid
graph TB
    A[Documento] --> B[🔒 Link Unico]
    B --> C[⏱️ Token Temporaneo]
    C --> D[👤 Solo Cliente Autorizzato]
    D --> E[✅ Firma Sicura]
    E --> F[💾 PDF Protetto]
    
    style A fill:#E3F2FD
    style B fill:#FFF9C4
    style C fill:#FFE0B2
    style D fill:#C8E6C9
    style E fill:#A5D6A7
    style F fill:#90EE90
```

### Caratteristiche di Sicurezza

- 🔒 **Link Unico:** Ogni sessione ha un link unico
- ⏱️ **Token Sicuro:** Token generato casualmente
- 👤 **Accesso Limitato:** Solo chi ha il link può firmare
- ✅ **Firma Verificabile:** La firma è applicata al PDF originale

---

## 📊 Statistiche e Monitoraggio

```mermaid
graph LR
    A[📊 Dashboard] --> B[📋 Sessioni Totali]
    A --> C[✅ Firmate]
    A --> D[⏳ In Attesa]
    A --> E[❌ Scadute]
    
    style A fill:#E1BEE7
    style B fill:#BBDEFB
    style C fill:#C8E6C9
    style D fill:#FFF9C4
    style E fill:#FFCDD2
```

---

## 🎓 Glossario Visuale

### Elementi dell'Interfaccia

```mermaid
graph TB
    A[Rettangolo Rosso] --> B[Area dove apparirà la firma]
    C[Canvas Firma] --> D[Area dove disegni la firma]
    E[Linea Guida] --> F[Linea orizzontale per allineare]
    G[Pulsante Applica] --> H[Applica la firma al PDF]
    I[Anteprima] --> J[Vista del PDF firmato]
    
    style A fill:#FFCDD2
    style C fill:#FFE0B2
    style E fill:#BBDEFB
    style G fill:#C8E6C9
    style I fill:#E1F5FE
```

---

## 💡 Suggerimenti per l'Uso

### Per Amministratori

1. **Posizionamento Firma:**
   - Clicca esattamente dove vuoi la firma
   - Usa la linea guida per allineare
   - Puoi trascinare e ridimensionare il rettangolo

2. **Gestione Sessioni:**
   - Tieni traccia dei link inviati
   - Scarica i PDF firmati quando pronti
   - Elimina le sessioni non più necessarie

### Per Clienti

1. **Firma Digitale:**
   - Usa la linea guida per allineare
   - Puoi cancellare e rifare se necessario
   - Controlla l'anteprima prima di confermare

2. **Download:**
   - Il PDF viene scaricato automaticamente
   - Salvalo in un posto sicuro
   - Conservalo per i tuoi archivi

---

## 🎉 Conclusione

Questi diagrammi mostrano come funziona il sistema in modo semplice e visuale. 

- **Blu** = Azioni dell'Amministratore
- **Arancione** = Azioni del Cliente  
- **Verde** = Azioni di Conferma/Successo
- **Rosso** = Aree di Attenzione/Errore

Per informazioni più tecniche, consulta la [Documentazione per Sviluppatori](./DEVELOPER.md).

