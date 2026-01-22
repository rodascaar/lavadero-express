#!/bin/sh

# Exit on error
set -e

echo "🚀 Iniciando proceso de despliegue automatizado..."

# 1. Esperar a que PostgreSQL esté listo
DB_HOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//')
DB_PORT=$(echo $DATABASE_URL | sed -e 's/.*://' -e 's/\/.*//')

echo "⏳ Esperando conexión a base de datos en $DB_HOST:$DB_PORT..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 1
done
echo "✅ Conexión a base de datos establecida."

# 2. Generar Prisma Client
echo "⚙️ Generando cliente Prisma..."
npx prisma generate

# 3. Sincronizar Schema (Automatic Push)
# NOTA: En producción con migraciones críticas se usaría 'deploy', 
# pero el requisito pide automatización total y db push --accept-data-loss para el setup inicial.
echo "🔄 Sincronizando esquema de base de datos..."
npx prisma db push --accept-data-loss

# 4. Ejecutar Seed de forma idempotente
echo "🌱 Ejecutando carga de datos iniciales (Seed)..."
npm run db:seed

# 5. Iniciar la aplicación
echo "✨ Aplicación lista. Iniciando servidor..."
exec node dist/server/entry.mjs
