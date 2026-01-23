#!/bin/sh

# Exit on error
set -e

echo "🚀 Iniciando proceso de despliegue automatizado..."

# 1. Esperar a que PostgreSQL esté listo
# Limpiamos la URL para extraer solo el host y el puerto
# Eliminamos el protocolo (ej. postgresql://)
CLEAN_URL=$(echo $DATABASE_URL | sed -e 's|^[^/]*//||')

# Extraemos el Host (lo que esté después de @ o al principio, hasta el : o /)
DB_HOST=$(echo $CLEAN_URL | sed -e 's/.*@//' -e 's/:.*//' -e 's/\/.*//')

# Extraemos el Puerto (buscamos un número de 4-5 dígitos)
DB_PORT=$(echo $CLEAN_URL | grep -oE ':[0-9]+' | cut -d: -f2 | head -n1)

# Si no se detecta puerto, usamos 5432
if [ -z "$DB_PORT" ]; then
  DB_PORT=5432
fi

echo "🔍 Diagnóstico de Conexión:"
echo "   URL Original: $DATABASE_URL"
echo "   Host detectado: $DB_HOST"
echo "   Puerto detectado: $DB_PORT"
echo "⏳ Esperando conexión..."

MAX_RETRIES=45
COUNT=0

while ! nc -z $DB_HOST $DB_PORT; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -gt $MAX_RETRIES ]; then
    echo "❌ ERROR CRÍTICO: No se pudo conectar a $DB_HOST en el puerto $DB_PORT."
    echo "   Esto causa el Error 502 de Nginx porque la app no puede arrancar."
    echo "   Asegúrate de que DATABASE_URL en CapRover sea correcta."
    exit 1
  fi
  echo "   Intento ($COUNT/$MAX_RETRIES)..."
  sleep 2
done

echo "✅ Conexión establecida exitosamente."

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
