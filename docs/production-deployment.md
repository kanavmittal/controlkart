# Production deployment

The storefront runs at `controlkart.com`; Medusa serves the API and existing admin
at `api.controlkart.com` (`/app` for the admin). Dokploy belongs at
`dokploy.controlkart.com`. PostgreSQL remains on PlanetScale. Do not seed, replace,
or reset the existing database or its Medusa administrator.

R2 serves existing objects at `media.controlkart.com`. Resend already verifies
`controlkart.com`, uses `info.controlkart.com` for the return path, and uses
`links.controlkart.com` for tracking. Set `EMAIL_FROM=no-reply@controlkart.com` and
`EMAIL_REPLY_TO=support@controlkart.com`. This configures transactional mail; it does
not create a support mailbox. Razorpay and Shiprocket stay disabled until enabled
explicitly with production credentials.

## Release process

GitHub Actions tests and builds images tagged by commit SHA. The deploy workflow
uses repository variables `MEDUSA_APP_ID`, `STOREFRONT_APP_ID`, and
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. `DOKPLOY_DEPLOY_ENABLED=true` enables deployment
after the new infrastructure is verified. Keep it unset during recovery.

Use GitHub Secrets for `DOKPLOY_URL`, `DOKPLOY_API_TOKEN`, and, when Cloudflare Access
protects the panel, `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. Build and
test jobs do not receive these credentials. Dokploy pulls the public GHCR images;
application secrets belong only in Dokploy's runtime environment.

Before releasing backend schema changes, create and verify an encrypted database
backup and run `./node_modules/.bin/medusa db:migrate` once using the new image and
a migration role. Ordinary starts run `npm run start` and do not migrate. Maintain
separate migration and application roles. Check migration compatibility before
rolling back an image; an image rollback does not undo a database migration.

Verify completed Dokploy deployments, container health, public HTTPS, storefront
catalog/cart, unauthenticated admin API rejection, and an authorized email test.
Rollback by selecting the previous known-good commit image and redeploying.
The GitHub deployment step polls its own deployment record, checks public health,
and exercises the backend product endpoint before reporting success. Image
rollback still requires checking the actual running image and application flows.

## Security decisions

Both images use supported Node 22 on Linux and run as the non-root `node` user.
The backend assembles its production dependency tree with pnpm; it does not run an
unlocked npm install when building the runtime image. Containers expose health
checks. Production requires long JWT/cookie secrets and verified database TLS.

`scripts/audit-production.cjs` blocks new high or critical dependency advisories.
The following existing high advisories have deployment-specific mitigations:

| Advisory | Mitigation and review trigger |
| --- | --- |
| [Vite Windows filesystem bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | Images run Linux, and `medusa start` serves a compiled admin rather than a Vite development server. Reassess before Windows hosting or exposing development servers. |
| [OpenTelemetry Prometheus denial of service](https://github.com/advisories/GHSA-q7rr-3cgh-j5r3) | Instrumentation is unregistered, `OTEL_SDK_DISABLED=true`, and no Prometheus exporter listener is deployed. Reassess before enabling instrumentation. |
| [OpenTelemetry Jaeger denial of service](https://github.com/advisories/GHSA-45rx-2jwx-cxfr) | No Jaeger propagator is registered and OpenTelemetry is disabled. Reassess before enabling tracing. |

The audit still reports these dependencies and moderate advisories; this is not a
claim of zero vulnerabilities. The gate verifies that instrumentation remains
disabled and prints every exception. Before launch, verify that runtime settings
and published ports preserve these mitigations. Use Dokploy/container health and
external availability checks for initial monitoring.

Keep Redis and Meilisearch authenticated and private. Backups must use a separate
private destination, never the public media bucket. Verify restore procedures,
retention, alert delivery, and access restrictions before declaring recovery complete.

## Recovery configuration

The recovered services use one backend process in shared worker mode, a separate
storefront, password-protected Redis with AOF persistence, and a persistent private
Meilisearch instance. Public traffic enters through Traefik on HTTPS. The `www`
hostname permanently redirects to the root domain. Authentication routes have a
separate rate limit; HTTPS responses carry HSTS and anti-framing headers.

SSH uses the recovery key stored outside the repository; password login is disabled.
The persistent IPv4/IPv6 firewall also filters Docker ingress. Database, Redis,
search, Swarm ports, and the raw Dokploy port are not publicly reachable.
Docker log rotation is configured at the daemon level for new containers.

The application and Dokploy alerts use a domain-restricted sending-only Resend
key. GitHub uses a separate Dokploy API key. Rotate a runtime key by updating its
consumers and verifying delivery/deployment before revoking the previous key.
Do not revoke runtime credentials merely because the setup token is being rotated.

The MikroORM security update requires the Medusa compatibility backports documented
in [patches/README.md](../patches/README.md). A successful health endpoint alone
does not prove the catalog works; exercise product, region, category and cart APIs.

An encrypted PlanetScale recovery archive was downloaded outside this repository.
Its archive listing, checksum, and authenticated decryption were verified. This
is not a complete restore rehearsal. Recurring off-server backup configuration
still requires a private destination and credentials; public media credentials
must never be used for database backups. Cloudflare Access is not configured with
the current DNS-only token. Enable MFA on administrative accounts separately.
