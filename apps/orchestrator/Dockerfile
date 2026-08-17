# Orchestrator worker — DAG only, no Playwright (S5).
FROM node:20-alpine

ENV NODE_ENV=production \
    ZERO_CLOUD=local

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/orchestrator ./apps/orchestrator
COPY packages/builders ./packages/builders
COPY packages/cloud ./packages/cloud
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/locators ./packages/locators
RUN npm ci --omit=dev --workspace @zero/orchestrator --include-workspace-root

RUN mkdir -p /app/artifacts /app/logs

CMD ["node", "apps/orchestrator/worker.js"]
