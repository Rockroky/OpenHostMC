# Documentazione Completa del Progetto OpenHostMC

## Indice
1. [Descrizione del Progetto](#descrizione-del-progetto)
2. [Tecnologie Utilizzate](#tecnologie-utilizzate)
3. [Struttura del Progetto](#struttura-del-progetto)
4. [Requisiti di Sistema](#requisiti-di-sistema)
5. [Installazione](#installazione)
6. [Configurazione](#configurazione)
7. [Avvio del Progetto](#avvio-del-progetto)
8. [Utilizzo](#utilizzo)
9. [API](#api)
10. [Problemi Noti](#problemi-noti)
11. [Contributi](#contributi)
12. [Licenza](#licenza)

## Descrizione del Progetto
OpenHostMC è un progetto monorepo basato su Turborepo che include diverse applicazioni e pacchetti per la gestione di un sistema di hosting. Il progetto è strutturato per essere modulare e scalabile, utilizzando tecnologie moderne per garantire prestazioni elevate e facilità di manutenzione.

## Tecnologie Utilizzate
Il progetto utilizza le seguenti tecnologie principali:

- **Frontend**:
  - Next.js
  - React
  - TypeScript
  - Tailwind CSS

- **Backend**:
  - NestJS
  - TypeScript
  - Prisma (ORM)

- **Database**:
  - PostgreSQL

- **DevOps e Strumenti**:
  - Turborepo
  - Docker
  - ESLint
  - Prettier

## Problemi Noti
Alcuni problemi noti includono:

- **Configurazione del Database**: Assicurarsi che il database PostgreSQL sia correttamente configurato e accessibile.
- **Variabili d'Ambiente**: Verificare che tutte le variabili d'ambiente siano impostate correttamente prima di avviare il progetto.
- **Dipendenze**: Alcune dipendenze potrebbero richiedere versioni specifiche di Node.js o npm.

## Struttura del Progetto
Il progetto è organizzato come segue:

```
openhostmc-monorepo/
├── apps/
│   ├── docs/                  # Documentazione del progetto
│   ├── frontend/              # Applicazione frontend principale
│   ├── orchestrator-service/  # Servizio di orchestrazione basato su NestJS
│   ├── server-service/        # Servizio di gestione server
│   └── web/                   # Applicazione web aggiuntiva
├── packages/
│   ├── database/              # Configurazione e gestione del database
│   ├── eslint-config/          # Configurazione ESLint
│   ├── typescript-config/     # Configurazione TypeScript
│   └── ui/                    # Libreria di componenti UI condivisi
├── docker-compose.yaml        # Configurazione Docker
├── package.json               # Configurazione principale del progetto
├── prisma.config.ts           # Configurazione Prisma
└── turbo.json                 # Configurazione Turborepo
```

## Requisiti di Sistema
- Node.js >= 18
- npm >= 11.12.1
- Docker (opzionale, per l'ambiente di sviluppo)

## Installazione
1. Clona il repository:
   ```bash
   git clone https://github.com/Rockroky/OpenHostMC.git
   cd OPENHOSTMC/openhostmc-monorepo
   ```

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Configura il database (se necessario):
   ```bash
   npm run db:migrate
   ```

## Configurazione
### Variabili d'Ambiente
Assicurati di configurare le variabili d'ambiente necessarie per ogni applicazione. Esempio per il servizio di orchestrazione:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your_jwt_secret"
```

### Docker
Se desideri utilizzare Docker per l'ambiente di sviluppo, puoi avviare i servizi con:

```bash
docker-compose up -d
```

## Avvio del Progetto
### Modalità di Sviluppo
Per avviare tutte le applicazioni in modalità di sviluppo:

```bash
npm run dev
```

### Modalità di Produzione
Per costruire e avviare le applicazioni in modalità di produzione:

```bash
npm run build
npm start
```

## Utilizzo
### Frontend
L'applicazione frontend è accessibile all'indirizzo:

```
http://localhost:3000
```

### Backend
Il servizio di orchestrazione è accessibile all'indirizzo:

```
http://localhost:3001
```

## API
Il progetto espone diverse API per interagire con i servizi. Di seguito sono riportate alcune delle principali:

### Autenticazione
- **POST** `/auth/login`: Effettua il login e ottieni un token JWT.
- **POST** `/auth/register`: Registra un nuovo utente.

### Gestione Server
- **GET** `/servers`: Ottieni la lista dei server.
- **POST** `/servers`: Crea un nuovo server.
- **GET** `/servers/{id}`: Ottieni i dettagli di un server specifico.
- **PUT** `/servers/{id}`: Aggiorna un server.
- **DELETE** `/servers/{id}`: Elimina un server.

## Contributi
Se desideri contribuire al progetto, segui questi passaggi:

1. Forka il repository.
2. Crea un branch per la tua feature o fix:
   ```bash
   git checkout -b feature/nome-feature
   ```
3. Fai commit delle tue modifiche:
   ```bash
   git commit -m "Aggiunta nuova feature"
   ```
4. Push del branch:
   ```bash
   git push origin feature/nome-feature
   ```
5. Apri una Pull Request.

## Licenza
Questo progetto è distribuito sotto la licenza MIT. Consulta il file `LICENSE` per ulteriori dettagli.

```sh
npx turbo dev --filter=web
npm exec turbo dev --filter=web
npm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
npm exec turbo login
npm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
npm exec turbo link
npm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
