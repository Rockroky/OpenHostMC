FROM node:20-alpine

# Installa dipendenze di sistema necessarie per Prisma e build
RUN apk add --no-cache openssl ca-certificates curl

WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./
COPY turbo.json ./

# Copia il codice sorgente
COPY . .

# Installa tutte le dipendenze
RUN npm install

# Genera il client Prisma
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Esegui la build di tutte le app (Orchestrator e Frontend)
RUN npm run build

# Esponi le porte (3000 frontend, 3002 orchestrator HTTP, 3005 orchestrator WebSocket)
EXPOSE 3000
EXPOSE 3002
EXPOSE 3005

# Avvia sia il frontend che l'orchestrator
CMD ["npm", "run", "start"]
