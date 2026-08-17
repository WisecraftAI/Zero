# V3 S4 — HTTP API image. No Playwright browsers.
# Executor image: apps/executor/Dockerfile (playwright base).

# ---------- web (Vite → public/) ----------
FROM node:20-bookworm AS web
WORKDIR /src
COPY package.json package-lock.json ./
COPY web ./web
RUN npm ci --workspace @zero/web --include-workspace-root
RUN npm run build -w @zero/web

# ---------- runtime (Node, no Chromium) ----------
FROM node:20-bookworm

ENV NODE_ENV=production \
    PORT=3000 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    ZERO_CLOUD=local

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY packages/cloud ./packages/cloud
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/locators ./packages/locators
RUN npm ci --omit=dev --workspace @zero/api --include-workspace-root

COPY --from=web /src/public ./public/

RUN mkdir -p /app/artifacts /app/logs \
  && chown -R node:node /app/artifacts /app/logs /app/public

USER root
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/api/server.js"]
