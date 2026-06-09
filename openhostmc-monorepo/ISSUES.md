# Issues Tracker

## Bug Critici Aperti

### 1. Bug "True" nella Whitelist
- **Descrizione**: L'API della whitelist sta aggiungendo un giocatore di nome "true" invece di disattivare la funzione.
- **Impatto**: La whitelist non funziona correttamente e il server rifiuta connessioni legittime.
- **Soluzione**: Separare le API per il toggle della whitelist e l'aggiunta di giocatori.
- **File Coinvolti**: `player.controller.ts`, `player.service.ts`
- **Priorità**: Alta

### 2. Docker Whitelist Env Non Rimosso
- **Descrizione**: L'immagine Docker `itzg/minecraft-server` sta sovrascrivendo il file `server.properties` a ogni riavvio perché la variabile d'ambiente `ENABLE_WHITELIST` è impostata a `TRUE`.
- **Impatto**: Le modifiche alla whitelist non persistono dopo un riavvio del server.
- **Soluzione**: Forzare `ENABLE_WHITELIST=FALSE` nell'array `Env` di `docker.service.ts`.
- **File Coinvolti**: `docker.service.ts`
- **Priorità**: Alta

### 3. Console Real-Time Non Funzionante
- **Descrizione**: La console web non mostra i log in tempo reale.
- **Impatto**: Gli utenti non possono monitorare lo stato del server o inviare comandi.
- **Soluzione**: Cablare correttamente Socket.io e xterm.js per lo streaming dei log.
- **File Coinvolti**: `console.gateway.ts`, `console/page.tsx`
- **Priorità**: Alta

### 4. Errore di Compilazione in `player.service.ts`
- **Descrizione**: Errore TS18048: `uuid` is possibly 'undefined'.
- **Impatto**: Il backend non compila correttamente.
- **Soluzione**: Validare `rawUuid` prima di formattarlo.
- **File Coinvolti**: `player.service.ts`
- **Priorità**: Alta

### 5. Errore di xterm.js (reading 'dimensions')
- **Descrizione**: La pagina crasha con `TypeError: Cannot read properties of undefined (reading 'dimensions')`.
- **Impatto**: La console non viene visualizzata correttamente.
- **Soluzione**: Ritardare il rendering del terminale e usare `ResizeObserver` per assicurarsi che il div abbia dimensioni reali.
- **File Coinvolti**: `console/page.tsx`
- **Priorità**: Alta

### 6. Errore 409 Conflict di Docker
- **Descrizione**: Quando si tenta di avviare un server, il backend cerca di creare un container da zero usando un nome che esiste già.
- **Impatto**: Il server non può essere avviato.
- **Soluzione**: Usare `container.start()` se il server esiste già.
- **File Coinvolti**: `docker.service.ts`
- **Priorità**: Alta

### 7. Problemi di Autenticazione
- **Descrizione**: L'autenticazione non funziona correttamente, impedendo l'accesso agli utenti registrati.
- **Impatto**: Gli utenti non possono accedere alle loro dashboard personali.
- **Soluzione**: Verificare e correggere la configurazione di Passport.js e JWT.
- **File Coinvolti**: `auth.controller.ts`, `auth.service.ts`
- **Priorità**: Alta

### 8. Problemi di Connessione al Database
- **Descrizione**: La connessione al database PostgreSQL non è stabile, causando errori intermittenti.
- **Impatto**: Le operazioni sul database possono fallire senza preavviso.
- **Soluzione**: Verificare la configurazione di Prisma e la connessione al database.
- **File Coinvolti**: `prisma.config.ts`, `database.service.ts`
- **Priorità**: Alta

### 9. Problemi di Performance
- **Descrizione**: Il frontend è lento e non reattivo, specialmente durante il caricamento delle pagine.
- **Impatto**: L'esperienza utente è compromessa.
- **Soluzione**: Ottimizzare il caricamento delle risorse e migliorare la reattività dell'interfaccia.
- **File Coinvolti**: `frontend/next.config.js`, `frontend/pages/**/*.tsx`
- **Priorità**: Media

### 10. Problemi di Sicurezza
- **Descrizione**: Ci sono potenziali vulnerabilità di sicurezza nel backend, come l'accesso non autorizzato alle API.
- **Impatto**: Il sistema potrebbe essere compromesso da attacchi esterni.
- **Soluzione**: Implementare misure di sicurezza aggiuntive, come l'autenticazione a due fattori e la validazione degli input.
- **File Coinvolti**: `auth.controller.ts`, `auth.service.ts`
- **Priorità**: Alta

## Task Pendenti

### 1. Implementazione della UI per la Gestione della Whitelist
- **Descrizione**: Creare un'interfaccia utente per gestire la whitelist dei giocatori.
- **Priorità**: Alta
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/whitelist.tsx`

### 2. Implementazione della UI per il Caricamento Massivo di Mod/Modpack
- **Descrizione**: Creare un'interfaccia utente per caricare mod e modpack in massa.
- **Priorità**: Media
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/mods.tsx`

### 3. Integrazione della Console Real-Time
- **Descrizione**: Integrare la console real-time con Socket.io e xterm.js.
- **Priorità**: Alta
- **Stato**: In corso
- **File Coinvolti**: `console.gateway.ts`, `console/page.tsx`

### 4. Fix della Whitelist
- **Descrizione**: Risolvere i problemi con la whitelist e assicurarsi che funzioni correttamente.
- **Priorità**: Alta
- **Stato**: In corso
- **File Coinvolti**: `player.controller.ts`, `player.service.ts`

### 5. Fix della Console Real-Time
- **Descrizione**: Assicurarsi che la console real-time funzioni correttamente e mostri i log in tempo reale.
- **Priorità**: Alta
- **Stato**: In corso
- **File Coinvolti**: `console.gateway.ts`, `console/page.tsx`

### 6. Implementazione della UI per la Gestione degli Utenti
- **Descrizione**: Creare un'interfaccia utente per gestire gli utenti, inclusi la creazione, la modifica e l'eliminazione degli utenti.
- **Priorità**: Media
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/users.tsx`

### 7. Implementazione della UI per la Gestione dei Server
- **Descrizione**: Creare un'interfaccia utente per gestire i server, inclusi la creazione, la modifica e l'eliminazione dei server.
- **Priorità**: Media
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/servers.tsx`

### 8. Implementazione della UI per la Gestione dei Backup
- **Descrizione**: Creare un'interfaccia utente per gestire i backup dei server, inclusi la creazione, il ripristino e l'eliminazione dei backup.
- **Priorità**: Bassa
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/backups.tsx`

### 9. Implementazione della UI per la Gestione delle Impostazioni
- **Descrizione**: Creare un'interfaccia utente per gestire le impostazioni del sistema, inclusi la configurazione del database e le variabili d'ambiente.
- **Priorità**: Bassa
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/settings.tsx`

### 10. Implementazione della UI per la Gestione dei Log
- **Descrizione**: Creare un'interfaccia utente per visualizzare e gestire i log del sistema, inclusi i log del backend e del frontend.
- **Priorità**: Bassa
- **Stato**: Non iniziato
- **File Coinvolti**: `frontend/pages/logs.tsx`

## Note
- **Priorità**: Alta = Deve essere risolto immediatamente, Media = Deve essere risolto presto, Bassa = Può essere risolto in seguito.
- **Stato**: Non iniziato = Non è stato ancora iniziato, In corso = È in corso di sviluppo, Completato = È stato completato.

## Roadmap del Progetto

### Fase 1: Setup Iniziale
- [x] Configurazione del progetto monorepo con Turborepo
- [x] Setup del database PostgreSQL
- [x] Configurazione di Docker per l'ambiente di sviluppo
- [x] Implementazione del servizio di orchestrazione base

### Fase 2: Sviluppo del Frontend
- [x] Creazione della struttura base del frontend con Next.js
- [x] Implementazione delle pagine principali (Home, Login, Dashboard)
- [x] Integrazione con Tailwind CSS per lo stile
- [x] Configurazione di TypeScript per il frontend

### Fase 3: Sviluppo del Backend
- [x] Implementazione del servizio di orchestrazione con NestJS
- [x] Configurazione di Prisma per l'accesso al database
- [x] Implementazione delle API per la gestione dei server
- [x] Configurazione di Docker per il deployment

### Fase 4: Integrazione e Testing
- [ ] Integrazione del frontend con il backend
- [ ] Testing delle API
- [ ] Testing dell'interfaccia utente
- [ ] Fix dei bug noti

### Fase 5: Deployment
- [ ] Configurazione dell'ambiente di produzione
- [ ] Deployment del frontend
- [ ] Deployment del backend
- [ ] Configurazione del database in produzione

### Fase 6: Manutenzione e Miglioramenti
- [ ] Monitoraggio delle prestazioni
- [ ] Miglioramenti dell'interfaccia utente
- [ ] Aggiunta di nuove funzionalità
- [ ] Fix dei bug segnalati

## Contributi
Se desideri contribuire al progetto, segui questi passaggi:

1. Fork del repository
2. Crea un branch per la tua feature o bugfix
3. Committa le tue modifiche
4. Push del branch
5. Apri una Pull Request

## Licenza
Il progetto è distribuito sotto la licenza MIT. Per ulteriori dettagli, consulta il file `LICENSE`.
