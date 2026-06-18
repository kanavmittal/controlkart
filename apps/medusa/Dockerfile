# ControlKart Medusa backend — production image.
# BUILD CONTEXT = repo root:  docker build -f apps/medusa/Dockerfile -t ck-medusa .
# (Coolify: set "Base Directory" = / and "Dockerfile Location" = apps/medusa/Dockerfile)

# ---------- build stage ----------
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Install deps for the medusa workspace (+ its workspace deps) using the root lockfile.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/medusa/package.json apps/medusa/package.json
RUN pnpm install --filter "@controlkart/medusa..." --frozen-lockfile

# Build → emits a self-contained server at apps/medusa/.medusa/server
COPY apps/medusa apps/medusa
WORKDIR /repo/apps/medusa
RUN pnpm run build

# ---------- production (runtime) stage ----------
FROM node:20-slim AS production
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /app

# The build output is a standalone Medusa app with its own package.json.
COPY --from=build /repo/apps/medusa/.medusa/server ./
RUN npm install --omit=dev

EXPOSE 9000
# Run DB migrations, then boot. (Single-instance safe. For multi-instance, move
# `medusa db:migrate` to a one-off release command and start with `npm run start`.)
CMD ["sh", "-c", "npx medusa db:migrate && npm run start"]
