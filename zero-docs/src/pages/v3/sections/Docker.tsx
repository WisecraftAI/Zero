import { Diagram } from '@/components/ui/Diagram';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Note } from '@/components/ui/Note';

export function Docker() {
  return (
    <section className="section" id="v3-docker">
      <h2>Four images, one compose</h2>
      <p className="sub">
        Chromium exists in exactly one image after S4. Compose now builds an API image (no
        Chromium) plus an executor image. Orchestrator still runs inside the API process until S5.
      </p>

      <Diagram ariaLabel="Container topology for the V3 local stack">
{`  image              base                          size      scale       browser
  ──────────────────────────────────────────────────────────────────────────────
  zero-web           nginx:alpine                  ~25 MB    CDN         no
  zero-api           node:20-alpine                ~180 MB   N replicas  no
  zero-orchestrator  node:20-alpine                ~180 MB   N workers   no
  zero-executor      mcr…/playwright:v1.52-jammy   ~1.6 GB   0→N jobs    yes

                          zero-web (nginx :8080 · SPA + /api proxy)
                                        │
                                        ▼
                          zero-api (:3000 · stateless · SSE · presign)
                            │        │
                            ▼        ▼
                      redis       postgres    minio    secrets
                       queue+pub   :5432      :9000    env/kv
                            │
                            ▼
                      zero-orchestrator  BA · Manual · Automation · Manager · Delivery
                            │
                            ▼
                      zero-executor       Playwright chromium jobs`}
      </Diagram>

      <h3>apps/api/Dockerfile</h3>
      <CodeBlock lang="dockerfile" label="apps/api/Dockerfile">
{`# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json         apps/api/
COPY packages/cloud/package.json   packages/cloud/
COPY packages/domain/package.json  packages/domain/
COPY packages/db/package.json      packages/db/
RUN npm ci --omit=dev --workspace apps/api --include-workspace-root

# ---------- runner ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production PORT=3000
WORKDIR /repo
RUN apk add --no-cache tini
COPY --from=deps /repo/node_modules ./node_modules
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \\
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/server.js"]`}
      </CodeBlock>

      <Note tone="danger">
        <strong>No <code>playwright</code> here — deliberately.</strong> If a future import pulls
        Chromium into this image, the API tier silently becomes unschedulable again. Enforce it in
        CI: fail the build if <code>apps/api</code> resolves <code>playwright</code>.
      </Note>

      <h3>apps/executor/Dockerfile</h3>
      <CodeBlock lang="dockerfile" label="apps/executor/Dockerfile">
{`FROM mcr.microsoft.com/playwright:v1.52.0-jammy AS runner
ENV NODE_ENV=production \\
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/executor/package.json      apps/executor/
COPY packages/cloud/package.json     packages/cloud/
COPY packages/domain/package.json    packages/domain/
COPY packages/locators/package.json  packages/locators/
COPY packages/db/package.json        packages/db/
RUN npm ci --omit=dev --workspace apps/executor --include-workspace-root

COPY packages/ ./packages/
COPY apps/executor/ ./apps/executor/

USER pwuser
CMD ["node", "apps/executor/main.js"]`}
      </CodeBlock>

      <h3>docker-compose.yml (excerpt)</h3>
      <CodeBlock lang="yaml" label="docker-compose.yml">
{`services:
  postgres:  { image: postgres:16-alpine, ports: ["5432:5432"], volumes: [pgdata:/var/lib/postgresql/data] }
  redis:     { image: redis:7-alpine,     ports: ["6379:6379"] }
  minio:     { image: minio/minio, command: "server /data --console-address :9001", ports: ["9000:9000","9001:9001"] }

  migrate:
    build: { context: ., dockerfile: apps/api/Dockerfile }
    command: ["node", "packages/db/migrate.js"]
    depends_on: { postgres: { condition: service_healthy } }
    restart: "no"

  api:
    build: { context: ., dockerfile: apps/api/Dockerfile }
    ports: ["3000:3000"]
    depends_on:
      migrate: { condition: service_completed_successfully }
      redis:   { condition: service_healthy }
      minio:   { condition: service_healthy }

  orchestrator:
    build: { context: ., dockerfile: apps/orchestrator/Dockerfile }
    depends_on: [migrate, redis]
    deploy: { replicas: 1 }

  executor:
    build: { context: ., dockerfile: apps/executor/Dockerfile }
    shm_size: 1gb          # Chromium crashes on the 64 MB default
    depends_on: [redis, minio]
    deploy: { replicas: 2 }

  web:
    build: { context: ., dockerfile: web/Dockerfile }
    ports: ["8080:8080"]
    depends_on: [api]

volumes: { pgdata: {}, miniodata: {} }`}
      </CodeBlock>

      <Note tone="danger">
        <strong><code>shm_size: 1gb</code> is not optional.</strong> Docker&apos;s default 64 MB{' '}
        <code>/dev/shm</code> makes Chromium crash on real pages.
      </Note>
    </section>
  );
}
