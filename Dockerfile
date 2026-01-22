# STAGE 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias para Prisma y construcción
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo dev)
RUN npm install

# Copiar el resto del código
COPY . .

# Generar Prisma Client y Compilar la aplicación
RUN npx prisma generate
RUN npm run build

# STAGE 2: Runner
FROM node:18-alpine AS runner

WORKDIR /app

# Instalar dependencias de ejecución (netcat para el entrypoint)
RUN apk add --no-cache openssl netcat-openbsd

ENV NODE_ENV=production

# Copiar artefactos necesarios desde la etapa de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./

# Asegurar permisos de ejecución para el entrypoint
RUN chmod +x docker-entrypoint.sh

# Configuración de red
EXPOSE 4321
ENV HOST=0.0.0.0
ENV PORT=4321

# Usar el script de entrada automatizado
ENTRYPOINT ["./docker-entrypoint.sh"]
