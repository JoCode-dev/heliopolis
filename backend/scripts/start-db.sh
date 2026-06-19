#!/bin/bash
# Démarre le Prisma dev server et le redémarre automatiquement s'il crashe.
# Usage : npm run db:dev (ou directement : bash scripts/start-db.sh)

cd "$(dirname "$0")/.." || exit 1

while true; do
  echo "[$(date '+%H:%M:%S')] Démarrage du Prisma dev server..."
  npx prisma dev
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Prisma dev server terminé (code $EXIT_CODE). Redémarrage dans 3s..."
  sleep 3
done
