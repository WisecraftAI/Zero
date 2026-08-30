# S7 — HTTP API image (`zero-api`). No Playwright browsers. No bundled SPA.
# The web UI is now its own image built from web/Dockerfile.
# The executor image lives at services/executor/Dockerfile.

FROM node:20-bookworm

ENV NODE_ENV=production \
    PORT=3001 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    ZERO_CLOUD=local

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/api ./services/api
COPY packages/brand ./packages/brand
COPY packages/cloud ./packages/cloud
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/locators ./packages/locators
RUN npm ci --omit=dev --workspace @zero/api --include-workspace-root

RUN mkdir -p /app/dist/artifacts /app/dist/logs \
  && chown -R node:node /app/dist

USER root
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "services/api/server.js"]
