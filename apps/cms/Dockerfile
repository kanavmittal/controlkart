# Strapi v5 (ControlKart CMS) — self-hosted on the same VPS via Dokploy.
# Build context: apps/cms
FROM node:20-alpine

# Native build deps for Strapi (sharp/vips image processing, better-sqlite3).
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev python3 git

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
