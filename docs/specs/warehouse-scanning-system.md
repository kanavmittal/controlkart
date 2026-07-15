# Spec: Warehouse Scanning System (WMS)

Status: **approved 2026-07-12; revised 2026-07-12 (v3)** — employee app re-platformed from Next.js PWA to **Expo / React Native (Android + iOS)** after device testing showed web camera scanning on iOS is below warehouse grade. The v1 PWA implementation was removed at the user's direction; lessons in `docs/retro/warehouse-pwa-retro.md`. (Earlier adopted proposals unchanged: per-variant serial uniqueness, stock-take backfill session, partial PO receiving, one required photo ≤1600px.)
v3 revision (user-confirmed): **Shiprocket is plugin-owned** — all traffic goes through the installed `@sam-ael/medusa-plugin-shiprocket`; the **Medusa fulfillment is created at order placement** (that's when the plugin creates the Shiprocket order + AWB + label, so the label prints before picking; stock deducts at placement), and pack completion **marks the order shipped** (`createOrderShipmentWorkflow`). Serial statuses simplified to `in_stock | shipped | removed`. Task list `tasks/todo.md` (v3) is authoritative where it is more specific.
Intent source: interview 2026-07-12 (confirmed). This spec is the source of truth for the build; update it when decisions change.

## Objective

A scan-driven warehouse execution layer on top of the existing Medusa 2.15.3 backend, so warehouse work can be handed to employees without giving them the admin panel and without hand-editing stock.

Three deliverables:

1. **Warehouse mobile app** (`apps/warehouse-app`, Expo/React Native, Android + iOS) — employee-facing app for outbound pick/pack and inbound PO receiving, driven entirely by native camera barcode scans.
2. **WMS backend module** (`apps/medusa/src/modules/wms`) — suppliers, purchase orders, per-unit serial ledger, print-job queue, shifts, staff accounts; plus admin UI extensions and API routes for the app and print agent.
3. **Print agent** (`apps/print-agent`) — always-on Node service at the warehouse (Raspberry Pi + Zebra ZD230, USB) that drains the backend print queue.

**Non-negotiable architecture rule:** Medusa's native inventory/fulfillment stays the source of truth for stock *quantities*. The WMS layer never writes inventory tables directly — all stock changes go through Medusa workflows (`createOrderFulfillmentWorkflow`, stock-adjustment workflows). The serial ledger is additive, alongside quantities.

### User stories

**Outbound (employee):**
- Order placed (paid) → backend creates the **Medusa fulfillment** (the Shiprocket plugin's provider creates the Shiprocket order, assigns AWB + courier, generates the label; stock is deducted at placement) → print job queued. Inside the shift window it prints immediately; outside, it queues until "Start shift." Order cancellation before shipping auto-cancels the fulfillment (plugin cancels at Shiprocket, stock restocks).
- Employee scans the label's AWB barcode with the app → the order opens (no searching).
- Picks items, scanning each unit's serial barcode. App validates per scan: right SKU for this order? quantity not exceeded? serial in stock? Wrong item → vibration + red screen naming what the order needs. Duplicate/excess → warning.
- All units scanned → **Pack** unlocks. Employee packs, pastes label on box, taps Pack.
- Pack step requires re-scanning the AWB barcode on the pasted label — verifies right label on right box.
- App prompts for a photo of the packed box → uploaded via File module, linked to the order.
- App marks shipped → order shipment created via `createOrderShipmentWorkflow` (the fulfillment and stock deduction already happened at order placement), serials marked `shipped` with the order id, Shiprocket pickup requested via the plugin.

**Inbound (manager + employee):**
- Manager creates a Purchase Order in admin: supplier, SKUs, expected quantities.
- Employee opens the PO list in the app, taps the arrived PO, scans units one by one. Scans are held locally in the session (survives app kill) until commit.
- Supplier's barcode decode template (e.g. `{model}_{sku}_{serial}` with delimiter) parses each scan → SKU + serial. Checks per scan: duplicate in session? serial already known to the ledger? SKU not on this PO? → warnings.
- Running tally per SKU (`Expected 50 / Scanned 32`) → Review screen highlights short/over lines → "Add to Warehouse" commits in one transaction: serials created as `in_stock`, quantities adjusted via Medusa workflow, PO marked received (with discrepancies recorded).

**Admin (manager):**
- Inventory page (extended): SKU, variant, stock, last updated, low-stock filter.
- Order detail (extended): picked serials per line, packed-box photo, pick/pack timeline (who, when).
- New pages: Suppliers (with barcode template), Purchase Orders (create/track/receive history), Warehouse staff (create/disable accounts), Shift window config, Print queue (pending/failed jobs, agent last-seen), Serial lookup (serial → status/order/PO; SKU → serials in stock).

### Serial ledger rules

- `SerialUnit`: serial, variant/SKU ref, status (`in_stock` → `shipped` | `removed`), PO ref, order ref, timestamps, scanned-by. (Returns/warranty-claim workflow is out of scope v1; `removed` covers write-offs.)
- Serialized by default; per-SKU `serialized=false` escape hatch → those SKUs skip per-unit scans (scan once + enter quantity) in both flows.
- Warranty queries this enables: "which serials shipped on order X", "which serials of SKU Y are in stock", "when did serial Z arrive and on which PO".

## Tech Stack

| Piece | Choice |
|---|---|
| Backend | Medusa 2.15.3 (existing app), custom module + workflows + subscribers + admin widgets/routes (`@medusajs/admin-sdk`, `@medusajs/ui`) |
| Mobile app | Expo SDK (latest) + React Native + TypeScript, expo-router; monorepo workspace `apps/warehouse-app` |
| Barcode scanning | `expo-camera` native scanning (ML Kit on Android, AVFoundation on iOS) — hardware-grade speed on both platforms; QR + Code128/EAN. `expo-haptics` for accept/reject buzz (works on iOS, unlike the web) |
| Session persistence | AsyncStorage (receiving sessions survive app kill until committed) |
| Staff auth | Medusa auth module, custom actor type `warehouse_staff`, emailpass provider; bearer JWT stored in `expo-secure-store` |
| Distribution | Dev: Expo Go on the shop phones (instant, no accounts). Prod: EAS build — Android APK direct-install; iOS requires an Apple Developer account (TestFlight). OTA JS updates via `expo-updates` preserves the "easy to update" goal |
| Photos | Existing File module (R2/S3 in prod, local in dev) |
| Shiprocket | **Plugin-owned**: all traffic through `@sam-ael/medusa-plugin-shiprocket` (0.2.1, installed & registered in `medusa-config.ts`). Creating the Medusa fulfillment at order placement triggers the plugin's provider (Shiprocket order + AWB + label); wms adds only a thin carrier adapter (pickup / cancel / label re-fetch). Never hand-roll a Shiprocket HTTP client |
| Print queue | Durable `print_job` table in backend Postgres (same DB as orders — survives any warehouse outage); jobs marked `printed` only on agent confirmation; retries + manual reprint from admin |
| Print agent | Node 20 service, **stateless** (holds no jobs), long-polls backend over HTTPS, ZPL to Zebra ZD230 via USB; systemd on Raspberry Pi; every poll updates `last_seen` heartbeat |
| Print hardware | Zebra ZD230 direct thermal, 4x6" labels |

## Commands

Backend (`apps/medusa`):
```
Dev:               pnpm --filter @controlkart/medusa dev          # medusa develop
Build:             pnpm --filter @controlkart/medusa build
Migrations:        npx medusa db:generate wms && npx medusa db:migrate   # run in apps/medusa
Unit tests:        pnpm --filter @controlkart/medusa test:unit
HTTP integration:  pnpm --filter @controlkart/medusa test:integration:http
Module integration:pnpm --filter @controlkart/medusa test:integration:modules
```

Warehouse mobile app (`apps/warehouse-app`, new — Expo):
```
Dev:        pnpm --filter @controlkart/warehouse-app start    # expo start (scan QR with Expo Go)
Typecheck:  pnpm --filter @controlkart/warehouse-app typecheck # tsc --noEmit
Lint:       pnpm --filter @controlkart/warehouse-app lint
Unit tests: pnpm --filter @controlkart/warehouse-app test      # jest (pure logic only)
Prod build: eas build -p android --profile production  (APK; iOS needs Apple Dev account)
```

Print agent (`apps/print-agent`, new):
```
Dev:   pnpm --filter @controlkart/print-agent dev   # runs against local backend, mock printer
Build: pnpm --filter @controlkart/print-agent build
```

Local dev DB: local seeded `acme_medusa` Postgres with `DATABASE_SSL=false` (never develop against the shared cloud DB).

## Project Structure

```
apps/medusa/src/
  modules/wms/                → module def, service, models/, migrations/
    models/                   → supplier, purchase-order, purchase-order-line,
                                serial-unit, print-job, shift-config, staff,
                                pack-record (photo + order ref)
  workflows/                  → create-warehouse-staff, receive-purchase-order,
                                stock-take, create-shipment, pack-and-ship
  subscribers/                → order.placed → Medusa fulfillment (plugin: AWB+label) + print job;
                                order cancel → fulfillment auto-cancel
  api/wms/                    → app routes (auth: warehouse_staff bearer)
  api/wms/print-agent/        → print-agent routes (static token auth)
  api/admin/wms/              → admin panel routes (POs, suppliers, staff, shifts, serials)
  admin/                      → admin UI routes/widgets (PO pages, order-detail widget,
                                inventory low-stock filter, print queue page)
  links/                      → wms ↔ product-variant, wms ↔ order module links
apps/warehouse-app/           → Expo app (expo-router: app/, src/lib/, src/components/)
apps/print-agent/src/         → poller, zpl printer driver, mock driver for dev
docs/specs/                   → this spec
tasks/                        → plan.md, todo.md (Plan/Tasks phases)
```

## Code Style

Match the existing repo exactly. Reference model style (`src/modules/quotes/models/quote.ts`):

```ts
import { model } from "@medusajs/framework/utils"

const SerialUnit = model.define("serial_unit", {
  id: model.id({ prefix: "wser" }).primaryKey(),
  serial: model.text().index("IDX_serial_unit_serial"),
  variant_id: model.text().index("IDX_serial_unit_variant_id"),
  status: model
    .enum(["in_stock", "shipped", "removed"])
    .default("in_stock"),
  purchase_order_line_id: model.text().nullable(),
  order_id: model.text().nullable(),
  received_by_staff_id: model.text().nullable(),
  shipped_by_staff_id: model.text().nullable(),
})

export default SerialUnit
```

Conventions: snake_case DB fields, `IDX_`-prefixed explicit indexes, module constant exports (`export const WMS_MODULE = "wms"`), comments only for non-obvious constraints (see medusa-config.ts style), amounts in minor units, workflows for anything multi-step/transactional.

## Testing Strategy

Existing harness: Jest + `@medusajs/test-utils`, split by `TEST_TYPE` (unit / integration:http / integration:modules), integration specs in `integration-tests/http/`.

- **Unit** (`src/modules/wms/__tests__/`): barcode template parser (per-supplier decode, malformed input), shift-window/queue-release logic, PO discrepancy calculation.
- **Module integration**: wms service CRUD, serial lifecycle transitions (illegal transitions rejected, e.g. shipping a serial that isn't `in_stock`), receive-PO workflow adjusts inventory levels correctly and rolls back on failure.
- **HTTP integration** (`integration-tests/http/wms.spec.ts`): staff auth (login, non-staff rejected), pick session flow (wrong SKU rejected, over-scan rejected, Pack gated until complete), receiving commit, agent job polling.
- Shiprocket client is interface-wrapped and mocked in all tests; no live calls in CI.
- Mobile app: lint + typecheck gate + jest for pure logic (API client, session reducers); scanning is hardware-dependent → manual device checklist AT THE END OF EACH UI MILESTONE (retro lesson: device-test early), covering Android + iPhone via Expo Go.

Every task in the Tasks phase names its verification command.

## Boundaries

**Always:**
- Change stock quantities only through Medusa workflows; never raw writes to inventory/order tables.
- Generate module migrations with `npx medusa db:generate wms`; never hand-write migration files.
- Run `test:unit` + affected integration suites before each commit; the app must pass `lint` + `typecheck` + `test`.
- Keep secrets in env (Shiprocket creds, agent token); Shiprocket/Meili/etc. are only ever called server-side (existing proxy convention).
- Develop against the local `acme_medusa` DB (`DATABASE_SSL=false`).

**Ask first:**
- Adding any new dependency to any package.
- Schema changes to *existing* modules (specs/quotes/documents/content) or Medusa core-table links beyond the planned wms links.
- Changing medusa-config.ts beyond registering the wms module / envs.
- Anything touching the deploy pipeline or Dokploy config (git auto-deploy stays OFF — on-VPS builds OOM the host).

**Never:**
- Commit secrets or `.env` files.
- Expose Shiprocket credentials or admin-scoped APIs to the PWA.
- Edit `node_modules`, generated migrations after they've run in prod, or delete failing tests without approval.
- Give `warehouse_staff` actors access to admin APIs.
- Remove, replace, or bypass the `@sam-ael/medusa-plugin-shiprocket` plugin — all Shiprocket traffic goes through it (its registration in `medusa-config.ts` and its dependency entry are permanent).

## Success Criteria

Done means all of the following, demonstrable on a phone against a staging backend:

1. Paid order → Shiprocket AWB assigned and label ZPL queued within 60s; prints immediately in-shift, queues out-of-shift, and a queued backlog prints in order after "Start shift."
2. Employee completes a full outbound: scan AWB → pick with per-serial scans (wrong-SKU scan visibly/vibration-rejected; over-scan warned; Pack locked until every unit scanned) → label re-scan verified at Pack → photo captured → order marked shipped in Medusa with the AWB as tracking (fulfillment + stock deduction happened at order placement), serials marked `shipped` with order id, pickup requested.
3. Employee completes a full inbound: PO with 2+ SKUs → per-unit scans decoded via supplier template → duplicate and not-on-PO scans warned → review shows short/over per line → commit creates `in_stock` serials and adjusts Medusa inventory levels in one transaction; session survives an app reload before commit.
4. Warranty answers in admin: order → serials shipped; serial → status + order/PO; SKU → count and list of `in_stock` serials, matching Medusa's stocked quantity for fully-serialized SKUs.
5. A SKU flagged `serialized=false` flows through both paths via scan-once + quantity entry, no serial records created.
6. Staff accounts created/disabled from admin; disabled staff cannot authenticate; every scan/pack/receive is attributed to a staff id.
7. Packed-box photo visible on the admin order detail page.
8. Print agent survives printer-offline (job retries, failure visible in admin print queue with agent last-seen); no order is ever silently unprinted. Killing the Pi mid-day loses zero jobs — backlog drains on reconnect. Manager is notified (email) when the agent misses heartbeats for 10+ minutes during shift hours or a job is stuck pending.
9. Existing storefront checkout, inventory availability, and admin flows unchanged (existing integration tests still pass).

## Open Questions

1. **Serial uniqueness scope** — unique globally, or per SKU/vendor? Vendor serials can collide across brands. Proposal: unique per (variant, serial), warn on global duplicates.
2. **Onboarding current stock** — existing on-hand units have no serials in the system. Proposal: a one-time "stock take" receiving session in the PWA (no PO) that scans existing shelf stock into the ledger without changing Medusa quantities.
3. **Shiprocket integration mechanics** — RESOLVED (v3, user-confirmed): plugin-owned. The plugin only creates shipments inside its fulfillment provider's `createFulfillment()`, so the Medusa fulfillment is created at order placement to get the AWB + label up front (stock deducts at placement — accepted trade-off, prevents oversell; cancellation restocks). wms adds only a thin adapter over the plugin for pickup/cancel/label re-fetch.
4. **Multi-line partial receiving** — if a PO arrives in two shipments, do we support receiving the same PO twice (remainder stays open)? Proposal: yes, PO status `partially_received`.
5. **Photo policy** — one photo required, more optional? Compression target (label must stay legible)? Proposal: exactly one required, client-side resize to ≤1600px longest edge.
