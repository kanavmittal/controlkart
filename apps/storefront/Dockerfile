# ControlKart Next.js storefront — production image (standalone output).
# BUILD CONTEXT = repo root:  docker build -f apps/storefront/Dockerfile -t ck-storefront .
# (Coolify: "Base Directory" = / and "Dockerfile Location" = apps/storefront/Dockerfile)
#
# NEXT_PUBLIC_* are inlined at build time — pass them as build args:
#   --build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.yourdomain.in \
#   --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_... \
#   --build-arg NEXT_PUBLIC_BASE_URL=https://yourdomain.in

# ---------- build stage ----------
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/storefront/package.json apps/storefront/package.json
RUN pnpm install --filter "@controlkart/storefront..." --frozen-lockfile

COPY apps/storefront apps/storefront

ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /repo/apps/storefront
RUN pnpm run build

# ---------- production (runtime) stage ----------
FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Next standalone traces to the monorepo root; server.js lands under apps/storefront/.
COPY --from=build --chown=node:node /repo/apps/storefront/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=node:node /repo/apps/storefront/public ./apps/storefront/public
USER node

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/storefront/server.js"]
