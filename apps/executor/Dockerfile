# Playwright executor — Chromium lives here only (S4).
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    ZERO_CLOUD=local \
    EXECUTION_WORKER_ONLY=1

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY web/package.json ./web/
RUN npm ci --omit=dev

RUN mkdir -p /app/artifacts /app/logs \
  && chown -R pwuser:pwuser /app/artifacts /app/logs

USER pwuser
CMD ["node", "apps/executor/main.js"]
