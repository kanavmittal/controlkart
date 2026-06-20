# Strapi v5 (ControlKart CMS) — self-hosted on the same VPS via Dokploy.
# Build context is the REPO ROOT (Dokploy dockerContextPath "."), so COPY paths
# are repo-root-relative (apps/cms/...). node_modules + .env are .dockerignore'd.
FROM node:20-alpine

# Native build deps for Strapi (sharp/vips image processing, better-sqlite3).
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev python3 git

WORKDIR /app

COPY apps/cms/package.json ./
RUN npm install

COPY apps/cms/ ./

ENV NODE_ENV=production
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
