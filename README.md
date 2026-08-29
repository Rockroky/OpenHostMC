# OpenHostMC

Piattaforma **enterprise-grade** per l'hosting di server Minecraft. Gestisci, monitora e controlla istanze Docker di Minecraft tramite un'interfaccia web moderna con console real-time, gestione mod e amministrazione multi-utente.

## Architettura

```
openhostmc-monorepo/
├── apps/
│   ├── frontend/              # Next.js 14 (React 18, Tailwind CSS v4)
│   ├── orchestrator-service/  # NestJS 11 (API principale + WebSocket)
│   └── server-service/        # Servizio NestJS secondario
├── packages/
│   ├── database/              # Schema Prisma + migrazioni
│   ├── eslint-config/         # Config ESLint condivisa
│   ├── typescript-config/     # Config TypeScript condivisa
│   └── ui/                    # Componenti UI condivisi (Button, Card, Code)
├── docker-compose.yml         # Infrastruttura (PostgreSQL, Redis, MinIO)
├── dockercompose.yaml         # Infrastruttura alternativa (PostgreSQL, Redis, MinIO)
├── turbo.json                 # Pipeline Turborepo
└── start.bat                  # Script avvio Windows
```

## Stack Tecnologico

| Componente | Tecnologia |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS v4 |
| **Backend** | NestJS 11, TypeScript, Prisma 5 (ORM) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Storage** | MinIO (S3-compatible) |
| **Container** | Docker (`itzg/minecraft-server`) |
| **Real-time** | Socket.IO, xterm.js |
| **Code quality** | Turborepo, ESLint, Prettier |

## Prerequisiti

- Node.js >= 18
- npm >= 11
- Docker & Docker Compose (per infrastruttura e server Minecraft)
- Git

## Installazione Rapida

```bash
# 1. Clona
git clone https://github.com/Rockroky/OpenHostMC.git
cd OpenHostMC

# 2. Installa dipendenze
npm install

# 3. Avvia infrastruttura (PostgreSQL, Redis, MinIO)
docker compose -f docker-compose.yml up -d

# 4. Esegui migrazioni database
npm run db:push

# 5. (Opzionale) Seed database
npm run db:seed

# 6. Avvia backend (orchestrator) — http://localhost:3002
npm run dev --filter=orchestrator-service

# 7. Avvia frontend — http://localhost:3001
npm run dev --filter=frontend
```

Su Windows è disponibile `start.bat` che automatizza tutti i passaggi.

## Deploy su TrueNAS (Testing / Produzione Temporanea)

L'ambiente di testing principale è stato migrato da Windows a un server TrueNAS locale, in attesa del server definitivo per la produzione. Grazie a **GitHub Actions**, ogni push sul branch `main` genera in automatico l'immagine Docker aggiornata.

**Risoluzione Problemi Comuni su TrueNAS (Docker in Docker / Bind Mounts):**
Se l'app OpenHostMC gira in un container (come app personalizzata su TrueNAS) e cerca di spawnare container Docker per i server Minecraft comunicando tramite `/var/run/docker.sock`, potrebbe incorrere in un errore del tipo `mkdir /app: read-only file system`. 
Questo accade perché i path usati all'interno di OpenHostMC (es. `/app/apps/...`) vengono interpretati da Docker come path *sull'host* TrueNAS (che è read-only).
- **Soluzione adottata:** Abbiamo introdotto la variabile d'ambiente `HOST_DATA_PATH`.
- **Come configurare:** Su TrueNAS, aggiungi la variabile d'ambiente `HOST_DATA_PATH=/mnt/tuo-pool/openhostmc-data` (il percorso reale del NAS). L'app userà questo path al posto di quello interno quando comunica con il socket Docker, risolvendo il problema.

## Scalabilità e Deploy su Proxmox VE (Produzione)

Per scalare l'infrastruttura o passare a un ambiente di produzione su **Proxmox VE**, le modifiche necessarie sono minime ma cruciali per la performance:

1. **Niente Docker-in-Docker su LXC:** Su Proxmox è consigliato eseguire OpenHostMC su una VM dedicata (es. Ubuntu Server o Debian) per avere il pieno supporto a Docker, oppure in un container LXC *Privileged* abilitando l'opzione Nesting e i profili Docker.
2. **Cluster Docker Swarm / Kubernetes:** In un'ottica di scalabilità orizzontale, il `DockerService` andrebbe aggiornato per comunicare con l'API di Docker Swarm o Kubernetes, permettendo di spawnare server di Minecraft su nodi differenti del cluster invece che solo sull'host locale.
3. **Storage Condiviso (NFS/Ceph):** Su Proxmox, al posto della cartella locale per i dati (`data/servers`), potresti montare un volume di rete (NFS o Ceph) per permettere la migrazione a caldo (Live Migration) o lo spawn su altri nodi senza perdere i mondi dei server.
4. **Proxy / Ingress:** L'uso di un Reverse Proxy (Traefik o NGINX Proxy Manager) su Proxmox ti permetterebbe di gestire agevolmente i domini per i server (`server1.tuodominio.com`) piuttosto che esporre le porte dirette.

Per eseguire l'app su una VM Proxmox con Docker installato:
1. Clona la repository.
2. Esegui `docker compose up -d` (usa il file compose completo che includa anche l'app stessa se configurato).
3. Assicurati di esporre `/var/run/docker.sock` al container di orchestrazione.

## Avvio Manuale

```bash
# Backend (orchestrator)
cd apps/orchestrator-service
npm run start:dev          # sviluppo (http://localhost:3002)
# oppure
npm run start:prod         # produzione

# Frontend
cd apps/frontend
npm run dev                # sviluppo (http://localhost:3001)
# oppure
npm run build && npm start # produzione
```

## Variabili d'Ambiente

Crea un file `.env` nella radice del progetto:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/openhostmc"

# Auth (orchestrator-service/.env)
JWT_SECRET="your-secret-key"
SUPERADMIN_EMAIL="admin@example.com"
SUPERADMIN_PASSWORD="secure-password"
```

## Funzionalità

### Gestione Server Minecraft
- **Server types**: Vanilla, Paper, Spigot, Forge, NeoForge, Fabric, Quilt, Magma, Mohist, Bedrock
- **Ciclo vita**: Crea, Avvia, Ferma, Elimina server con container Docker isolati
- **Configurazione**: MOTD, difficoltà, modalità di gioco, online-mode, memoria RAM, CPU
- **Server.properties**: Editor completo tramite API dedicata

### Console Real-time
- Terminale interattivo Web via xterm.js + Socket.IO
- Streaming log Docker in tempo reale (ultime 100 righe + follow mode)
- Invio comandi RCON direttamente dalla UI
- Metriche CPU/RAM in tempo reale via Docker stats

### Whitelist e Ban
- Aggiunta/rimozione player con risoluzione UUID automatica
- Supporto **Premium** (Mojang API) e **Cracked** (Offline UUID v3 MD5)
- Sincronizzazione immediata via RCON
- Ban player, ban IP, pardon player/IP
- Lettura usercache.json

### Gestione Mod e Modpack
- Upload bulk di file `.jar` e `.zip`
- Auto-estrazione automatica archivi `.zip` nella root del server
- Export download dell'intero pacchetto `/mods`
- Interfaccia drag-and-drop

### Multi-utente e Piani
- Ruoli: USER, ADMIN, SUPERADMIN
- Piani/tier con limiti: server massimi, RAM, CPU, storage, player
- Isolamento tenant (ogni utente vede solo i propri server)
- SuperAdmin: gestione utenti, piani, statistiche globali

## API (Orchestrator — `/orchestrator`)

| Endpoint | Metodo | Descrizione |
|---|---|---|
| `/orchestrator/auth/register` | POST | Registrazione utente |
| `/orchestrator/auth/login` | POST | Login (JWT) |
| `/orchestrator/auth/me` | GET | Profilo utente corrente |
| `/orchestrator/auth/change-password` | PATCH | Cambio password |
| `/orchestrator/servers` | GET | Lista server utente |
| `/orchestrator/servers` | POST | Crea nuovo server |
| `/orchestrator/servers/:id` | GET | Dettaglio server |
| `/orchestrator/servers/:id` | PATCH | Aggiorna server |
| `/orchestrator/servers/:id` | DELETE | Elimina server |
| `/orchestrator/servers/:id/start` | POST | Avvia server |
| `/orchestrator/servers/:id/stop` | POST | Ferma server |
| `/orchestrator/servers/:id/status` | GET | Stato server |
| `/orchestrator/servers/:id/properties` | GET/PATCH | server.properties |
| `/orchestrator/servers/:id/whitelist` | POST/DELETE | Whitelist |
| `/orchestrator/servers/:id/whitelist/toggle` | POST | Attiva/disattiva whitelist |
| `/orchestrator/servers/:id/bans` | POST/DELETE | Ban player |
| `/orchestrator/servers/:id/bans/ip` | POST/DELETE | Ban IP |
| `/orchestrator/servers/:id/files/upload` | POST | Upload mod/modpack |
| `/orchestrator/servers/:id/files/export` | GET | Export mods |
| `/orchestrator/admin/users` | GET | [Admin] Lista utenti |
| `/orchestrator/admin/plans` | GET/POST | [Admin] Gestione piani |
| `/orchestrator/admin/stats` | GET | [Admin] Statistiche |

### WebSocket

```
ws://localhost:3005/console?token=<jwt>
```

| Evento | Direzione | Descrizione |
|---|---|---|
| `join-console` | Client → Server | Entra nella console del server |
| `leave-console` | Client → Server | Esce dalla console |
| `send-command` | Client → Server | Invia comando RCON |
| `console-output` | Server → Client | Output log in tempo reale |
| `server-stats` | Server → Client | CPU/RAM stats ogni 2 secondi |

## Modelli Dati (Prisma)

- **Plan**: nome, max_servers, ram_mb, cpu_cores, storage_gb, max_players, limiti backup/coda
- **User**: email, username, password_hash, ruolo, piano associato
- **McServer**: nome, tipo, versione, stato, porta, RCON, proprietario, piano
- **ServerSetting**: coppie chiave/valore categorizzate (world, gameplay, performance, network, security, advanced)
- **PortPool**: pool di porte assegnate ai server
- **Modpack**: modpack installati per server

## Licenza

MIT
