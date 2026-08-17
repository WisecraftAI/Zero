# Milestone probe instance. Compose bind-mounts the repo at /repo so
# detect/verify always read live server.js + lib/ (not a stale image copy).

FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production PORT=5175

COPY server.js ./
COPY lib/ ./lib/
COPY agent-workflow/ ./agent-workflow/

EXPOSE 5175
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5175)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "agent-workflow/scripts/status-server.js"]
