# S7 — Web image. Vite build → nginx static serve. No Node runtime, no
# /api proxy: the browser fetches the API directly (see web/src/apiBase.js).

# ---------- build ----------
FROM node:20-bookworm AS build
WORKDIR /src

ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
COPY web ./web
RUN npm ci --workspace @zero/web --include-workspace-root
RUN npm run build -w @zero/web

# ---------- runtime ----------
FROM nginx:1.27-alpine

COPY web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /src/dist/web/ /usr/share/nginx/html/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
