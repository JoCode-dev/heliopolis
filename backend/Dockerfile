# Build context : racine du monorepo (Dokploy)
# docker build -f backend/Dockerfile -t heliopolis-backend .

# Stage de build
FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./

RUN npm ci --ignore-scripts

COPY backend/prisma ./prisma
COPY backend/scripts ./scripts
COPY backend/nest-cli.json backend/tsconfig.json backend/tsconfig.build.json ./

RUN npm run prisma:generate

COPY backend/src ./src

RUN npm run build

# Stage de production
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p uploads/avatars uploads/adhesions uploads/preuves logs/actions && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/src/main.js"]
