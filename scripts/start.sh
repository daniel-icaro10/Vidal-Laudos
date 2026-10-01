#!/bin/sh
# Inicialização em produção: prepara banco e pastas, cria usuários iniciais e sobe o servidor.
set -e

DB_FILE="${DATABASE_URL#file:}"
mkdir -p "$(dirname "$DB_FILE")" "${UPLOAD_DIR:-/app/uploads}"

npx prisma db push --skip-generate
npx tsx prisma/seed.ts

# DEMO_DATA=true popula o painel com laudos fictícios (útil para apresentação)
if [ "$DEMO_DATA" = "true" ]; then
  npx tsx prisma/demo.ts
fi

exec npx next start -p "${PORT:-10000}"
