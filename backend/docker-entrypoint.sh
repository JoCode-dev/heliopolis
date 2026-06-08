#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  echo ">> prisma migrate deploy"
  DATABASE_URL="${DATABASE_URL}" node ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
else
  echo ">> DATABASE_URL absent — migrations ignorées"
fi

echo ">> démarrage API sur le port ${PORT:-4000}"
exec node dist/main.js