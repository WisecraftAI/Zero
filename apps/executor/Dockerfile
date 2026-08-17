# Playwright executor — Chromium lives here only (S4).
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    ZERO_CLOUD=local

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/executor ./apps/executor
COPY packages/analyzer ./packages/analyzer
COPY packages/cloud ./packages/cloud
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/locators ./packages/locators
RUN npm ci --omit=dev --workspace @zero/executor --include-workspace-root

RUN mkdir -p /app/artifacts /app/logs \
  && chown -R pwuser:pwuser /app/artifacts /app/logs

USER pwuser
CMD ["node", "apps/executor/main.js"]
