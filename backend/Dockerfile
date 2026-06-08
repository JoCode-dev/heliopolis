# Build context : racine du monorepo (Dokploy)
# docker build -f backend/Dockerfile -t heliopolis-backend .

# ─── Stage de build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./

RUN npm ci --ignore-scripts

COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./
COPY backend/scripts ./scripts
COPY backend/nest-cli.json backend/tsconfig.json backend/tsconfig.build.json ./

RUN npm run prisma:generate

COPY backend/src ./src

RUN npm run build

# Dans le stage builder, après npm run build :
RUN npx tsc --outDir dist-prisma-config --module commonjs --esModuleInterop true prisma.config.ts 2>/dev/null || \
  npx esbuild prisma.config.ts --bundle --platform=node --outfile=prisma.config.js

# ─── Stage de production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache openssl ca-certificates wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./

COPY --from=builder /app/prisma.config.js ./

RUN npm ci --omit=dev --ignore-scripts

# App compilée
COPY --from=builder /app/dist ./dist

# Prisma : schéma + client généré dans /generated (output custom via prisma.config.ts)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

# Entrypoint
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Répertoires runtime + permissions
RUN mkdir -p uploads/avatars uploads/adhesions uploads/preuves logs/actions && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]