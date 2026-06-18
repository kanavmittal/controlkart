# ControlKart — Production Deployment (India region)

A cheap, production-grade deploy of the Medusa v2 backend + Next.js storefront,
**entirely in India**, for **~$0–8/month**.

## Architecture

```
                ┌─────────────────────────────────────────────┐
  Customers ──▶ │  Storefront (Next.js)   api.* ──▶ Medusa     │  one India VPS
                │  yourdomain.in          backend + worker     │  + Dokploy
                │                         self-hosted Redis    │  (Mumbai/Bangalore)
                └───────────┬─────────────────────┬───────────┘
                            │                      │
                   PlanetScale Postgres    Cloudflare R2 (media)
                   ap-south-2 (India) ✅     free, no egress
```

**Why this shape:** Medusa needs an always-on Node server (≥2 GB RAM) plus Postgres
**and** Redis. Medusa's event bus + workflow engine run on **BullMQ, which polls Redis
constantly even when idle** — so a serverless/per-command Redis (Upstash free/PAYG) burns
its quota fast. Running Redis **on the same box** is free, fast, and removes that problem.
Postgres stays on PlanetScale (already in India); media goes to Cloudflare R2 (free tier,
no egress fees).

## Cost (monthly, INR-friendly)

| Component | Choice | Cost (₹/mo approx) |
|---|---|---|
| Compute (Medusa + Redis + storefront) | **Indian VPS, ≥4 GB, Mumbai/Bangalore** + Dokploy | ~₹500–850 ($6–10) |
| Database | PlanetScale Postgres `ap-south-2` (already set up) | existing |
| Redis | self-hosted on the VPS (Dokploy one-click) — or keep Upstash Mumbai + Fixed | $0 |
| Media | Cloudflare R2 (10 GB free, no egress) | $0 |
| TLS | Let's Encrypt via Dokploy (Traefik) | $0 |
| **Total** | | **~₹500–850 ($6–10)** — within the $15 budget |

> **Why an Indian provider:** INR billing with a **GST invoice** you can claim input credit on
> (real saving for a registered B2B), plus India-region latency.

### Choose your Indian VPS (paid path)
Any of these on **Ubuntu 22.04/24.04, ≥4 GB RAM**, Mumbai or Bangalore. Dokploy runs identically on all:

| Provider | Notes | Indicative |
|---|---|---|
| **Hostinger India — KVM 2** ⭐ | Big RAM for the price (often 8 GB), Mumbai DC, Dokploy-friendly, GST invoice | ~₹600–800/mo |
| **E2E Networks** | NSE-listed Indian cloud (Delhi/Mumbai/Chennai), strong data-residency story, INR + GST | ~₹500–900/mo |
| **MilesWeb** | Indian host (Mumbai/Pune), cheap unmanaged KVM, INR + GST | ~₹540–800/mo |

> India-region-but-USD options (DigitalOcean Bangalore, Vultr Mumbai, ~$12 for 2 GB) also work,
> but you lose the GST input credit. Avoid Hetzner & Railway — **no India region**.
>
> Free fallback: **Oracle Cloud Always-Free, Mumbai** (2 OCPU / 12 GB ARM, $0) if you ever want
> zero compute cost — only catch is A1 capacity can need a few retries to provision.

---

## Repo is already production-ready

These changes are committed in this repo:
- `apps/medusa/medusa-config.ts` — Redis **cache / event-bus / workflow-engine / locking**
  modules, auto-enabled when `REDIS_URL` is set; DB SSL verification for managed Postgres.
- `apps/medusa/package.json` — `predeploy: medusa db:migrate`.
- `apps/storefront/next.config.ts` — `output: "standalone"` (slim image).
- `apps/medusa/Dockerfile`, `apps/storefront/Dockerfile`, `.dockerignore`.
- `apps/*/.env.production.template` — every prod env var (with generated secrets).

> **Local dev:** leave `REDIS_URL` **unset** in `apps/medusa/.env` so dev uses in-memory
> infra and doesn't poll a managed Redis. Set `REDIS_URL` only in the production host env.

---

## Step-by-step

### 1. Accounts / assets
- [ ] Indian VPS (Hostinger India / E2E / MilesWeb) — **Ubuntu 22.04 or 24.04, ≥4 GB RAM**, Mumbai/Bangalore.
- [ ] A domain (e.g. `yourdomain.in`) with DNS you control.
- [ ] Cloudflare account → an **R2 bucket** `controlkart-media` + an API token (Access Key / Secret).
- [ ] PlanetScale connection string (already have it).

### 1b. Provision + harden the VPS
SSH in as root, create a sudo user, and open only the needed ports:
```bash
adduser deploy && usermod -aG sudo deploy        # non-root user
# (copy your SSH key to deploy, then disable root/password login in /etc/ssh/sshd_config)
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw allow 3000   # 3000 = Dokploy UI
ufw enable
apt update && apt upgrade -y
```
PlanetScale + R2 are reached **outbound** over TLS, so no inbound DB/Redis ports are exposed.

### 2. Install Dokploy on the VPS
**If your provider offers a one-click Dokploy image** (Hostinger: VPS → OS → "OS With Panel" →
**Dokploy**), select it and **skip the manual install** — it ships Ubuntu + Dokploy pre-installed.

Otherwise SSH in and run the installer (Dokploy is a free, self-hosted Vercel/Heroku
alternative built on Docker Swarm + Traefik — git deploys, automatic Let's Encrypt TLS,
one-click databases):
```bash
curl -sSL https://dokploy.com/install.sh | sh
```
Either way: open `http://<VPS_IP>:3000`, create the admin account. After login, **Settings →
update** to the latest version. (Optional: point `dokploy.yourdomain.in` at the server for the panel.)

> In Dokploy you'll create a **Project**, then add **Services** to it (Applications + Databases).
> Put the Redis DB, the backend, and the storefront in the **same Project** so they share a
> network and can reach each other by service name.

### 3. Self-hosted Redis
In Dokploy → your Project → **Create Service → Database → Redis**. Deploy it, then open its
page and copy the **internal connection URL** (looks like
`redis://default:<password>@<service-name>:6379`). This becomes `REDIS_URL` for the backend.
(Plain `redis://`, no TLS — simpler and faster than Upstash's `rediss://` for BullMQ.)

### 4. Cloudflare R2 (media)
- Create bucket `controlkart-media`; enable public access or attach `media.yourdomain.in`.
- Create an R2 API token → Access Key ID + Secret.
- Fill the `S3_*` vars in the backend env (template below). The S3 file provider is already
  wired in `medusa-config.ts` and activates when `S3_BUCKET` is present.

### 5. Deploy the Medusa backend
In Dokploy → your Project → **Create Service → Application** → connect your Git repo (GitHub
app or a Git URL + branch):
- **Build Type: Dockerfile.** Dockerfile Path `apps/medusa/Dockerfile` (build context = repo root).
- **Environment** tab: paste `apps/medusa/.env.production.template`, filled in:
  - `DATABASE_URL` = PlanetScale (no `?sslmode=...` query — SSL is handled in config),
  - `REDIS_URL` = the Dokploy Redis internal URL from step 3,
  - `JWT_SECRET` / `COOKIE_SECRET` = the generated values,
  - `MEDUSA_BACKEND_URL=https://api.yourdomain.in`, CORS vars → your domains,
  - `S3_*` → R2.
- **Domains** tab: add `api.yourdomain.in` → **container port 9000**, enable **HTTPS** (Traefik
  issues the Let's Encrypt cert once DNS resolves).
- Deploy. The image runs `medusa db:migrate` then `medusa start`. Schema is already migrated
  (PlanetScale), so migrate is a no-op/idempotent.
- **Create an admin user** (one-off — open the service's **Terminal** in Dokploy, or
  `docker exec` into the container from the host):
  ```bash
  npx medusa user -e you@yourdomain.in -p '<strong-password>'
  ```
  Admin dashboard: `https://api.yourdomain.in/app`.

### 6. Deploy the storefront
In Dokploy → same Project → **Create Service → Application** → same repo:
- **Build Type: Dockerfile.** Dockerfile Path `apps/storefront/Dockerfile` (context = repo root).
- **Build args** (NEXT_PUBLIC_* are inlined at build time — add these under the build/args
  section, not just runtime env):
  - `NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.yourdomain.in`
  - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...` (from Admin → Settings → Publishable API Keys;
    the key migrated from `acme_medusa` works, or make a fresh one)
  - `NEXT_PUBLIC_BASE_URL=https://yourdomain.in`
- **Domains** tab: add `yourdomain.in` → **container port 3000**, enable HTTPS.
- Deploy.

### 7. DNS
Point `A`/`AAAA` records for `yourdomain.in`, `api.yourdomain.in` (and `media.yourdomain.in`
→ R2) at the VPS / Cloudflare. Dokploy (Traefik) issues Let's Encrypt certs once DNS resolves.

---

## Post-deploy checklist
- [ ] `https://api.yourdomain.in/health` → `OK`
- [ ] `https://api.yourdomain.in/app` → admin login works
- [ ] `https://yourdomain.in/products` → products render (served from PlanetScale via the API)
- [ ] Upload a product image in admin → it lands in R2 and serves from `media.yourdomain.in`
- [ ] Place a test order end-to-end
- [ ] Confirm CORS: no browser CORS errors between storefront and API

## Operations
- **Backups:** PlanetScale handles DB backups. Enable your VPS provider's automated snapshots
  (Hetzner/DO/Oracle) for the box. R2 is durable. Keep a periodic `pg_dump` too:
  `pg_dump "<DATABASE_URL>" -Fc -f backup-$(date +%F).dump`.
- **Deploys:** push to the repo → Dokploy rebuilds & redeploys (enable auto-deploy via the Git webhook).
- **Logs/metrics:** Dokploy shows per-service logs, CPU/RAM, and restarts.

## When to scale up (later)
- **Split worker mode** for higher traffic: deploy the *same* image a second time with
  `MEDUSA_WORKER_MODE=worker` + `DISABLE_MEDUSA_ADMIN=true`, set the first to
  `MEDUSA_WORKER_MODE=server`. Both share Postgres + Redis. Move `medusa db:migrate` out of the
  container `CMD` into a one-off release step so the two instances don't race.
- **Bump RAM** (CAX21/DO 4 GB, or carve more of the Oracle 12 GB) if the box gets tight during builds.
- **CDN:** put Cloudflare in front of `yourdomain.in` for edge caching of the storefront.

## Gotchas baked into this repo
- **DB SSL:** managed Postgres needs TLS, but the pinned `pg` driver can't parse
  `sslmode=verify-full&sslrootcert=system` in the URL. SSL is set in `medusa-config.ts`
  (`databaseDriverOptions.connection.ssl.rejectUnauthorized = true`, still full verification),
  so keep the `DATABASE_URL` **without** those query params.
- **Redis + Upstash:** if you insist on Upstash, use its **Mumbai** region + a **Fixed** plan
  (not free/PAYG) and the `rediss://` TLS URL — BullMQ idle-polling will otherwise exhaust the
  free command quota. Self-hosted Redis on the VPS avoids all of this.
- **Media:** never use local-disk file storage in prod — container redeploys wipe it. R2 is wired.
