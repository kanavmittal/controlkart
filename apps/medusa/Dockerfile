# ControlKart Medusa backend — production image.
# BUILD CONTEXT = repo root:  docker build -f apps/medusa/Dockerfile -t ck-medusa .
# (Coolify: set "Base Directory" = / and "Dockerfile Location" = apps/medusa/Dockerfile)

# ---------- build stage ----------
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Install deps for the medusa workspace (+ its workspace deps) using the root lockfile.
# .npmrc carries `shamefully-hoist=true` — required so the admin (Rollup) build can
# resolve @medusajs/dashboard; without it the build fails.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/medusa/package.json apps/medusa/package.json
RUN pnpm install --filter "@controlkart/medusa..." --frozen-lockfile

# Build → emits a self-contained server at apps/medusa/.medusa/server
COPY apps/medusa apps/medusa
WORKDIR /repo/apps/medusa
RUN pnpm run build

# Assemble an isolated production dependency tree from the workspace lockfile.
RUN pnpm --filter @controlkart/medusa deploy --legacy --prod /production

# ---------- production (runtime) stage ----------
FROM node:22-bookworm-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production OTEL_SDK_DISABLED=true
WORKDIR /app

# The build output is a standalone Medusa app with its own package.json.
COPY --from=build --chown=node:node /repo/apps/medusa/.medusa/server ./
COPY --from=build --chown=node:node /repo/apps/medusa/static/brands ./static/brands
COPY --from=build --chown=node:node /production/node_modules ./node_modules
RUN chown node:node /app
USER node

EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations run once as a release operation after a database backup.
CMD ["npm", "run", "start"]
