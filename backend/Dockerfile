# Stage de build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY scripts ./scripts
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

RUN npm run prisma:generate

COPY src ./src

RUN npm run build

# Stage de production
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

COPY package.json package-lock.json ./

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
