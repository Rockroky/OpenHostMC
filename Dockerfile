FROM node:20-alpine

# Installa dipendenze di sistema necessarie per Prisma, pg_isready e build
RUN apk add --no-cache openssl ca-certificates curl python3 make g++ postgresql-client

WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./
COPY turbo.json ./

# Copia il codice sorgente (inclusi scripts e docker-entrypoint.sh)
COPY . .

# Installa tutte le dipendenze (incluse devDependencies necessarie per turbo, build e prisma)
RUN npm install

# Genera il client Prisma per i package e per l'orchestrator
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npx prisma generate --schema=apps/orchestrator-service/prisma/schema.prisma

# Esegui la build di tutte le app (Orchestrator e Frontend)
RUN npm run build

# Rendi eseguibili gli script
RUN chmod +x /app/docker-entrypoint.sh /app/scripts/wait-for-db.js

# Imposta ambiente di produzione a runtime
ENV NODE_ENV=production

# Esponi le porte (3000 frontend, 3002 orchestrator HTTP, 3005 orchestrator WebSocket)
EXPOSE 3000
EXPOSE 3002
EXPOSE 3005

# Entrypoint con attesa database e migrazioni
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Avvia sia il frontend che l'orchestrator
CMD ["npm", "run", "start:services"]
