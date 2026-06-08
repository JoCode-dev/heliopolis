#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  echo ">> prisma migrate deploy"
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo ">> DATABASE_URL absent — migrations ignorées"
fi

echo ">> démarrage API sur le port ${PORT:-4000}"
exec node dist/src/main.js
