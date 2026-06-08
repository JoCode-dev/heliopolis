# Build context : racine du monorepo (Dokploy)
# docker build -f frontend/Dockerfile -t heliopolis-frontend .

# Stage de build
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci --ignore-scripts

COPY frontend/ .

# Variables NEXT_PUBLIC_* injectées au build (Next.js les inlined)
ARG NEXT_PUBLIC_API_URL=https://heliopolis-backend.jocode.cloud/api
ARG NEXT_PUBLIC_SITE_URL=https://heliopolis-frontend.jocode.cloud
ARG NEXT_PUBLIC_R2_PUBLIC_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL
ENV NODE_ENV=production

RUN npm run build

# Stage de production (standalone — pas de npm install)
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
