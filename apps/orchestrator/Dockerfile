# Orchestrator worker — DAG only, no Playwright (S5).
FROM node:20-alpine

ENV NODE_ENV=production \
    ORCHESTRATOR_ONLY=1 \
    ZERO_CLOUD=local

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY web/package.json ./web/
RUN npm ci --omit=dev

RUN mkdir -p /app/artifacts /app/logs

CMD ["node", "apps/orchestrator/worker.js"]
