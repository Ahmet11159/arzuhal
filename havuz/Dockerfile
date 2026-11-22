# Havuz — production imajı (Next.js + PostgreSQL)
#   docker build -t havuz .
#   docker run -p 3100:3100 --env-file apps/web/.env havuz
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/sdk/package.json packages/sdk/
COPY apps/web/package.json apps/web/
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @havuz/web

FROM node:22-alpine AS run
WORKDIR /app/apps/web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100
RUN addgroup -S havuz && adduser -S havuz -G havuz
COPY --from=build --chown=havuz:havuz /app/node_modules /app/node_modules
COPY --from=build --chown=havuz:havuz /app/packages /app/packages
COPY --from=build --chown=havuz:havuz /app/apps/web/.next ./.next
COPY --from=build --chown=havuz:havuz /app/apps/web/public ./public
COPY --from=build --chown=havuz:havuz /app/apps/web/drizzle ./drizzle
COPY --from=build --chown=havuz:havuz /app/apps/web/package.json /app/apps/web/next.config.mjs ./
USER havuz
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3100/api/health || exit 1
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3100"]
