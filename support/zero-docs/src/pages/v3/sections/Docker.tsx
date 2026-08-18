import { Diagram } from '@/components/ui/Diagram';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Note } from '@/components/ui/Note';

export function Docker() {
  return (
    <section className="section" id="v3-docker">
      <h2>Four app images + infra</h2>
      <p className="sub">
        Chromium exists in exactly one image. Compose builds <code>zero-web</code> (nginx SPA),{' '}
        <code>zero-api</code> (no browser), <code>zero-orchestrator</code>, and{' '}
        <code>zero-executor</code> (Playwright base), plus Postgres and Redis. MinIO is opt-in via{' '}
        <code>--profile s3</code>. Operator guide:{' '}
        <code>support/zero-docs/docs/v1/DOCKER.md</code>.
      </p>

      <Diagram ariaLabel="Container topology for the V3 local stack">
{`  image              base                          size      scale       browser
  ──────────────────────────────────────────────────────────────────────────────
  zero-web           nginx:alpine                  ~25 MB    CDN         no
  zero-api           node:20-bookworm              ~200 MB   N replicas  no
  zero-orchestrator  node:20                       ~200 MB   N workers   no
  zero-executor      mcr…/playwright:v1.58-jammy   ~1.6 GB   0→N jobs    yes

                          zero-web (nginx :3000 · static SPA only)
                                        │  browser fetch VITE_API_BASE_URL
                                        ▼
                          zero-api (:3001 · SSE · presign · no SPA)
                            │        │
                            ▼        ▼
                      redis       postgres    minio?   secrets
                       queue+pub   :5432      profile  env/kv
                            │                 s3 only
                            ▼
                      zero-orchestrator  BA · Manual · Automation · Manager · Delivery
                            │
                            ▼
                      zero-executor       Playwright chromium jobs`}
      </Diagram>

      <h3>Dockerfile (API · repo root)</h3>
      <CodeBlock lang="dockerfile" label="Dockerfile">
{`# S7 — HTTP API image (zero-api). No Playwright. No bundled SPA.
FROM node:20-bookworm

ENV NODE_ENV=production \\
    PORT=3001 \\
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \\
    ZERO_CLOUD=local

WORKDIR /app
COPY package.json package-lock.json ./
COPY services/api ./services/api
COPY packages/cloud ./packages/cloud
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/locators ./packages/locators
RUN npm ci --omit=dev --workspace @zero/api --include-workspace-root

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \\
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "services/api/server.js"]`}
      </CodeBlock>

      <Note tone="danger">
        <strong>No <code>playwright</code> here — deliberately.</strong> If a future import pulls
        Chromium into this image, the API tier silently becomes unschedulable again. Enforce it in
        CI: fail the build if <code>services/api</code> resolves <code>playwright</code>.
      </Note>

      <h3>services/executor/Dockerfile</h3>
      <CodeBlock lang="dockerfile" label="services/executor/Dockerfile">
{`FROM mcr.microsoft.com/playwright:v1.58.2-jammy

ENV NODE_ENV=production \\
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \\
    ZERO_CLOUD=local

WORKDIR /app
COPY package.json package-lock.json ./
COPY services/executor ./services/executor
COPY packages/analyzer ./packages/analyzer
COPY packages/builders ./packages/builders
COPY packages/cloud ./packages/cloud
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/locators ./packages/locators
RUN npm ci --omit=dev --workspace @zero/executor --include-workspace-root

USER pwuser
CMD ["node", "services/executor/main.js"]`}
      </CodeBlock>

      <h3>docker-compose.yml (excerpt)</h3>
      <CodeBlock lang="yaml" label="docker-compose.yml">
{`services:
  postgres:  { image: postgres:16-alpine, ports: ["5432:5432"] }
  redis:     { image: redis:7-alpine,     ports: ["6379:6379"] }

  # Opt-in S3 drill — not in the default profile:
  # docker compose --profile s3 up -d minio minio-init
  minio:
    profiles: ["s3"]
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]

  web:
    build: { context: ., dockerfile: web/Dockerfile }
    ports: ["\${WEB_PORT:-3000}:3000"]
    depends_on: [api]

  api:
    build: { context: ., dockerfile: Dockerfile }
    ports: ["\${API_PORT:-3001}:3001"]
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }

  orchestrator:
    build: { context: ., dockerfile: services/orchestrator/Dockerfile }
    depends_on: [postgres, redis]

  executor:
    build: { context: ., dockerfile: services/executor/Dockerfile }
    shm_size: 1gb          # Chromium crashes on the 64 MB default
    depends_on: [postgres, redis]`}
      </CodeBlock>

      <Note tone="danger">
        <strong><code>shm_size: 1gb</code> is not optional.</strong> Docker&apos;s default 64 MB{' '}
        <code>/dev/shm</code> makes Chromium crash on real pages.
      </Note>

      <h3>MinIO (infra sidecar · profile s3)</h3>
      <p className="sub">
        MinIO (:9000 API, :9001 console) and <code>minio-init</code> (bucket{' '}
        <code>zero-artifacts</code>) start only with <code>--profile s3</code>. Default{' '}
        <code>ZERO_CLOUD=local</code> keeps blobs on disk. Full guide:{' '}
        <a href="#deploy-minio">Deployment → MinIO</a> ·{' '}
        <code>support/zero-docs/docs/v1/DOCKER.md#minio-s3-compatible-object-store</code>.
      </p>
    </section>
  );
}
