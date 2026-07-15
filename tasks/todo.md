# Warehouse Scanning System — Task List v3

Execution model, gates, and milestone map: `tasks/plan.md`. Spec: `docs/specs/warehouse-scanning-system.md` (supplementary — **each task block below is authoritative and self-contained**).

Every task block has: Description · Acceptance criteria · Verify (exact command) · Files · Depends on · Size. The brain dispatches one task per Sonnet worker; the worker's brief = the preamble below + the task block. Workers run the Verify command and report its actual output; the brain checks tasks off, never the worker.

## Standard worker-brief preamble (brain copies this into every worker brief)

- Monorepo: pnpm workspaces (`apps/*`, `packages/*`). Backend is `apps/medusa` (Medusa **2.15.3**, package name `@controlkart/medusa`). All backend paths below are relative to `apps/medusa/`.
- **Model style**: copy the conventions of `src/modules/quotes/models/quote.ts` — `model.define`, `model.id({ prefix }).primaryKey()`, enums via `model.enum([...]).default(...)`, named indexes (`IDX_*`), relations via `model.hasMany`/`belongsTo`, money in minor units (paise) as `model.bigNumber()` with a doc comment.
- **Module registration**: add `{ resolve: "./src/modules/wms" }` to the `modules` array in `medusa-config.ts` (follow the existing `./src/modules/quotes` entry).
- **Local DB**: run migrations/dev server with `DATABASE_SSL=false` (plain local Postgres; see `medusa-config.ts:15`).
- **Tests** (run from `apps/medusa/`):
  - HTTP integration: files at `integration-tests/http/*.spec.ts` using `medusaIntegrationTestRunner` (exemplar: `integration-tests/http/health.spec.ts`). Run: `pnpm test:integration:http -- <pattern>`.
  - Module integration: files at `src/modules/*/__tests__/*.ts`. Run: `pnpm test:integration:modules -- <pattern>`.
  - Unit: files matching `src/**/__tests__/*.unit.spec.ts`. Run: `pnpm test:unit -- <pattern>`.
  - **Create test data in `beforeEach`, not `beforeAll`** — the test runner resets the DB between tests, so `beforeAll` data silently vanishes (known past bug).
- **Auth middleware pattern**: `defineMiddlewares` + `authenticate(...)` in `src/api/middlewares.ts` (see existing customer routes there).
- **Stock changes only via workflows** — never adjust inventory or serial state directly from a route handler.
- **All Shiprocket traffic goes through `@sam-ael/medusa-plugin-shiprocket` (0.2.1, already in `medusa-config.ts`)** — never hand-roll a Shiprocket HTTP client. The plugin's fulfillment provider creates the Shiprocket order + AWB + label when a **Medusa fulfillment** is created, and ships its own webhook-fed `shiprocket-tracking` module, token-refresh job, and admin tracking/pickup routes. Design decision: **the Medusa fulfillment is created at order placement** (label first, pick-by-AWB per spec; stock deducts at placement), and pack completion marks the order **shipped** (`createOrderShipmentWorkflow`) rather than creating the fulfillment.
- **Service naming gotcha**: `MedusaService` auto-generates methods from model names; "staff" is uncountable, so the generated methods are `listStaff`/`createStaff` (NOT `listStaffs`) — tests and callers must use the uncountable forms.
- Scope discipline: touch only the files your task lists (plus its test files). If the task can't be done within that boundary, stop and report — don't improvise elsewhere.

## Progress

Milestone A — wms module core
- [x] A1 — wms module scaffold + 9 models + migration (M) — migrated + clean boot, brain-reviewed
- [x] A2 — read-only module links + duplicate-serial module test (S) — 3/3 green; brain fixed linkable key + wrote test after worker infra failures

Milestone B — staff auth vertical
- [x] B1 — warehouse_staff auth actor + /wms/me + CORS + auth spec (M) — 5/5 green; brain-implemented after worker infra failures; CORS via middleware (config only supports built-in keys)
- [x] B2 — staff admin API + admin Staff page + dev script (M) — 3/3 green (brain re-ran); clean build

Milestone C — suppliers & barcode templates
- [x] C1 — barcode template parser lib + unit suite (S) — 11/11 unit tests green, brain-reviewed
- [x] C2 — suppliers admin CRUD + preview-scan + admin page (M) — 7/7 green (brain re-ran); typed template errors surface in admin UI

Milestone D — purchase orders (admin)
- [x] D1 — PO admin API + status transitions (M) — 4/4 green (brain re-ran); advisory-lock display_id, transitions enforced, snapshots on lines
- [x] D2 — PO admin UI (M) — clean build; "Create & open" primary + draft banner + short/over badges confirmed; browser check at Checkpoint 1

Milestone E — inbound backend
- [x] E1 — app-facing PO routes + scan validation (M) — 6/6 green incl. zero-writes proof (brain re-ran). Note: serial-only templates (no {sku}) fall through to NOT_ON_PO — fine for v1, revisit if a serial-only supplier appears
- [x] E2 — receivePurchaseOrderWorkflow + receive endpoint (M) — 4/4 + full wms sweep 29/29; brain-reviewed compensations, idempotency via metadata.received_sessions, create-level-on-first-receipt in
- [x] E3 — stock-take workflow + endpoint (S) — 4/4 incl. inventory-untouched proof; stock_take_session model for idempotency
- [x] Checkpoint 1 (brain, 2026-07-12): unit 11/11, modules 3/3, http 34/34 (8 suites), build exit 0; LIVE smoke on dev server (real variant): admin login → staff create/login → /wms/me → supplier + preview-scan → PO create&open → staff scan accept/NOT_ON_PO → receive → idempotent re-post. No browser MCP available — user click-through checklist issued for visual UI pass

Milestone F — Expo app foundation
- [x] F1 — apps/warehouse-app scaffold (M) — user approved full dep set; Expo SDK 57, lint/typecheck/test green + headless android export; deps verified against approved list
- [x] F2 — typed API client + login + home (M) — 10/10 tests, lint+typecheck clean (brain re-ran); 401 vs 403-disabled distinct; no dead nav
- [ ] F3 — device checkpoint M0d (user)

Milestone G — scanner + inbound in app
- [x] G1 — scanner component (M) — 9/9 scanner-core tests (brain re-ran); generation counter + 1.8s dedupe + busy latch all pure-tested; device proof at G5
- [x] G2 — receiving session store (S) — 27/27 (brain re-ran); cross-line dup rejection, AsyncStorage persistence, toReceivePayload; full app suite 46/46 lint+typecheck clean
- [ ] G3 — receiving screens (M)
- [ ] G4 — stock-take screen (S)
- [ ] G5 — device checkpoint M1d (user)

Milestone H — outbound backend (may run in parallel with F/G after Checkpoint 1)
- [x] H1 — carrier adapter over the Shiprocket plugin (S) — 15/15; injectable ShipmentCarrier, plugin client via public subpath export, zero own HTTP. Plugin recon: client methods cancel/schedulePickup/generateLabel (latter two swallow errors → adapter normalizes to CarrierError)
- [x] H2 — shipping-option repoint to the plugin provider (staging) (S) — idempotent script verified 2 runs on local; KEY FINDINGS: provider id is `shiprocket_shiprocket`; stock-location↔provider link required (script ensures it); data stores full fulfillment option object. Local shipping options now repointed (revert: provider_id='manual_manual', data=NULL)
- [x] H3 — order.placed → auto-fulfillment workflow + wms shipment + auto-cancel (M) — 3/3 (brain re-ran); KEY: core createFulfillment returns STALE entity — workflow re-queries for data/labels; test-runner env quirk documented in spec; SHIPROCKET_PROVIDER_ID exported
- [x] H4 — print queue + shift windows + agent poll/ack (M) — 17/17 unit + 11/11 http (brain re-ran); atomic claim (SKIP LOCKED), IST overnight windows, heartbeat upsert, static-token boundary proven (guard uses req.originalUrl — Express rewrites req.path in mounted middleware)
- [x] H5 — print-agent heartbeat monitor + alerts (S) — 9/9 unit + build green; brain registered the missing `wms-agent-alert` template in the Resend provider (worker correctly stayed in scope)
- [x] H6 — pick backend (M) — 6/6 + full-suite regression (brain re-ran); pick_state JSON on shipment, two-phase serial lookup (WRONG_ITEM vs SERIAL_NOT_IN_STOCK), pick-qty is delta + reject-only
- [x] H7 — pack/ship backend (M) — 7/7 (brain fixed bodyParser headroom 8mb→10mb so the 5MB-decoded cap 413s cleanly); full regression: 52 unit + 3 module + 66 http green, build exit 0. Milestone H COMPLETE

Milestone I — outbound app + print agent
- [x] I1 — apps/print-agent (M) — user approved zero-runtime-deps; 12/12 (brain re-ran, deps:{} confirmed); live smoke: backoff + graceful SIGTERM; Pi setup doc at docs/print-agent-pi-setup.md
- [ ] I2 — app pick flow (M)
- [ ] I3 — app pack flow (M)
- [x] I4 — tracking read-side via plugin module + webhook config (S) — 5/5 (brain re-ran); registration key `shiprocketTrackingModuleService`; NOTE: webhook auth is shared-secret `x-api-key` + `SHIPROCKET_WEBHOOK_TOKEN` (NOT HMAC) — doc at docs/shiprocket-webhook.md
- [ ] I5 — device+hardware checkpoint M2d (user)

Milestone J — admin polish, distribution, launch
- [x] J1 — admin order-detail widget + serial lookup (M) — 8/8 (brain fixed a timeline test-timestamp bug + verified after 4 worker infra deaths; all worker files were complete)
- [x] J2 — admin print-queue page + low-stock filter (M) — 11/11 + build green (brain re-ran); reprint clones (audit trail), agent last-seen buckets, low_stock_threshold metadata convention
- [x] J3 — variant weight/dims audit script (S) — 15/15 unit + live exec exit-1 verified (brain re-ran). FINDING: local seed has 4/4 published variants missing ALL shipping fields — prod catalog must be filled before J5
- [ ] J4 — EAS Android build + OTA channel (M) — iOS blocked on Apple Developer decision
- [ ] J5 — launch gate (user + brain)

---

## Milestone A — wms module core

### A1 — wms module scaffold + 9 models + migration (M)

**Description:** Create the `wms` Medusa module at `src/modules/wms/` (service extending `MedusaService`, `index.ts` with `Module(...)` export, `models/` directory) and register it in `medusa-config.ts`. Define all 9 models in the style of `src/modules/quotes/models/quote.ts`:

1. `supplier` (id prefix `wsup`): `name`, `barcode_template` (text, e.g. `"{sku}|{serial}"`), `delimiter` (text, nullable — the character separating template segments), `notes` (nullable).
2. `staff` (id prefix `wstf`): `name`, `email` (unique index), `active` (boolean, default true). Note: generated service methods are `listStaff`/`createStaff` (uncountable).
3. `purchase_order` (id prefix `wpo`): `display_id` (number, sequential — see D1 for assignment), `supplier_id` (indexed), `status` enum `["draft","open","partially_received","received","cancelled"]` default `draft`, `expected_date` (nullable), `notes` (nullable), `lines` hasMany → purchase_order_line.
4. `purchase_order_line` (id prefix `wpol`): belongsTo purchase_order, `variant_id` (indexed), `sku` (snapshot at creation), `title` (snapshot), `quantity_ordered` (number), `quantity_received` (number, default 0).
5. `serial_unit` (id prefix `wser`): `variant_id`, `serial`, `status` enum `["in_stock","shipped","removed"]` default `in_stock`, `purchase_order_id` (nullable), `order_id` (nullable, set when shipped), `received_by` (staff id, nullable). **Unique composite index on `(variant_id, serial)`** — serials are unique per variant, NOT globally (known past bug: a global unique serial index broke suppliers who reuse serial ranges across SKUs).
6. `shipment` (id prefix `wshp`): `order_id` (indexed), `shiprocket_order_id` (nullable), `awb` (nullable, indexed), `label_url` (nullable), `status` enum `["pending","label_ready","picked","packed","fulfilled","cancelled"]` default `pending`, `courier` (nullable), `tracking_status` (nullable).
7. `pack_record` (id prefix `wpck`): `shipment_id` (indexed), `photo_file_id`, `photo_url`, `packed_by` (staff id), `packed_at` (dateTime).
8. `print_job` (id prefix `wprt`): `shipment_id` (nullable), `label_url`, `status` enum `["pending","released","printing","done","failed"]` default `pending`, `attempts` (number, default 0), `released_at`/`printed_at` (nullable dateTimes), `error` (nullable).
9. `shift_config` (id prefix `wsft`): `weekday` (number 0–6), `start_time` (text `"HH:MM"`), `end_time` (text `"HH:MM"`), `active` (boolean, default true).

Field sets above are the minimum required by later tasks; add fields only if the spec section for the model names more.

Generate the migration with the Medusa CLI (do not hand-write it).

**Acceptance criteria:**
- `src/modules/wms/index.ts` exports the module; `medusa-config.ts` registers `./src/modules/wms`.
- All 9 models defined; `serial_unit` has the unique `(variant_id, serial)` composite index.
- Generated migration applies cleanly to a fresh local DB; server boots with no module errors.

**Verify:** from `apps/medusa/`: `DATABASE_SSL=false npx medusa db:generate wms && DATABASE_SSL=false npx medusa db:migrate` succeed, then `DATABASE_SSL=false npx medusa develop` boots clean (Ctrl-C after "Server is ready").

**Files:** `src/modules/wms/index.ts`, `src/modules/wms/service.ts`, `src/modules/wms/models/*.ts` (9 files), `src/modules/wms/migrations/` (generated), `medusa-config.ts` (one entry).

**Depends on:** — · **Size:** M

### A2 — read-only module links + duplicate-serial module test (S)

**Description:** Define read-only module links in `src/links/` (follow any existing link file style there): `serial_unit.variant_id` → Product module variant, and `shipment.order_id` → Order module order, both `readOnly: true` so Query can traverse them without pivot tables. Add a module-integration test at `src/modules/wms/__tests__/wms-module.spec.ts` covering: create serial_unit succeeds; creating a second serial_unit with the same `(variant_id, serial)` throws; the same `serial` under a different `variant_id` succeeds.

**Acceptance criteria:**
- Query can resolve `serial_unit.variant.*` and `shipment.order.*` fields.
- Test proves the composite unique index (duplicate rejected, cross-variant reuse allowed). Test data created in `beforeEach`.

**Verify:** `pnpm test:integration:modules -- wms-module`

**Files:** `src/links/serial-unit-variant.ts`, `src/links/shipment-order.ts`, `src/modules/wms/__tests__/wms-module.spec.ts`.

**Depends on:** A1 · **Size:** S

---

## Milestone B — staff auth vertical

### B1 — warehouse_staff auth actor + /wms/me + CORS + auth spec (M)

**Description:** Wire a `warehouse_staff` auth actor type so warehouse workers log in with email/password separately from admins/customers.

- Workflow `src/workflows/create-warehouse-staff.ts`: input `{ name, email, password }` → step 1 creates the staff row (wms module), step 2 creates an emailpass auth identity with `app_metadata.warehouse_staff_id = <staff id>` and actor type `warehouse_staff`. Each step has a compensation deleting what it created.
- Route `GET /wms/me` (`src/api/wms/me/route.ts`): returns the staff row for `req.auth_context.actor_id`; **403 if `staff.active === false`** (immediate lockout for disabled staff).
- Middleware in `src/api/middlewares.ts`: `authenticate("warehouse_staff", ["bearer"])` on matcher `/wms/*` (login route excluded — Medusa's core `/auth/warehouse_staff/emailpass` handles token issuance). Add an active-flag guard middleware applied to all `/wms/*` routes so a disabled staff's still-valid token is rejected everywhere, not just `/me`.
- CORS: add a `WAREHOUSE_CORS` env (same pattern as `storeCors`/`adminCors` in `medusa-config.ts` http block) applied to `/wms` routes.
- Spec `integration-tests/http/wms-auth.spec.ts`, 5 cases: (1) register+login via `/auth/warehouse_staff/emailpass` returns a token; (2) `GET /wms/me` with that bearer returns the staff row; (3) no token → 401; (4) a **customer** token → 401/403 (actor-type isolation); (5) staff with `active=false` → 403.

**Acceptance criteria:** all five cases pass; disabled staff rejected on every `/wms` route; data in `beforeEach`.

**Verify:** `pnpm test:integration:http -- wms-auth`

**Files:** `src/workflows/create-warehouse-staff.ts`, `src/api/wms/me/route.ts`, `src/api/middlewares.ts`, `medusa-config.ts` (CORS), `integration-tests/http/wms-auth.spec.ts`.

**Depends on:** A1 · **Size:** M

### B2 — staff admin API + admin Staff page + dev script (M)

**Description:** Give admins control over warehouse staff.

- Admin API `src/api/admin/wms/staff/route.ts` (+ `[id]/route.ts`): list staff; create (invokes the B1 workflow); update `active` flag and name. Deleting is out of scope — disable instead.
- Admin UI page `src/admin/routes/warehouse-staff/page.tsx` (follow the structure of existing pages under `src/admin/routes/`, e.g. `quotes`): table of staff (name, email, active badge), "Create staff" drawer (name/email/password), enable/disable toggle with confirmation. Disabling takes effect immediately (B1 guard).
- Dev convenience script `src/scripts/create-warehouse-staff.ts` runnable via `npx medusa exec ./src/scripts/create-warehouse-staff.ts` (args or env for name/email/password) — for seeding a first staff login without the admin UI.
- Spec `integration-tests/http/wms-staff-admin.spec.ts`, 3 cases: admin creates staff (and that staff can then log in); admin disables staff (their `/wms/me` then 403s); non-admin token cannot hit the admin staff routes.

**Acceptance criteria:** all three cases pass; admin page renders in a clean `medusa build`; script creates a working login. Remember `listStaff`/`createStaff` uncountable naming.

**Verify:** `pnpm test:integration:http -- wms-staff-admin && pnpm build`

**Files:** `src/api/admin/wms/staff/route.ts`, `src/api/admin/wms/staff/[id]/route.ts`, `src/admin/routes/warehouse-staff/page.tsx`, `src/scripts/create-warehouse-staff.ts`, `integration-tests/http/wms-staff-admin.spec.ts`.

**Depends on:** B1 · **Size:** M

---

## Milestone C — suppliers & barcode templates

### C1 — barcode template parser lib + unit suite (S)

**Description:** Pure-logic library `src/modules/wms/lib/barcode-template.ts` that decodes a scanned string against a supplier's template. A template is a string of literal segments and placeholders `{sku}`, `{serial}` (each at most once), separated by the supplier's `delimiter` (e.g. template `"{sku}|{serial}"`, delimiter `"|"`). API: `parseScan(template: string, delimiter: string | null, raw: string): { sku?: string; serial?: string }` plus `validateTemplate(template, delimiter)` for admin-time checks.

Rules:
- Split `raw` on the delimiter and match segments positionally against the template's segments; literal segments must match exactly.
- **Tail-fold:** if the template ends in a placeholder and the scan contains MORE delimiter-separated segments than the template, fold the extra segments (with delimiters) into that trailing `{sku}` or `{serial}` — some suppliers embed the delimiter character inside serials.
- No delimiter (`delimiter` null/empty): the whole raw string maps to a single-placeholder template only.
- Typed errors (an exported error enum/union, thrown or returned): `TEMPLATE_INVALID` (bad template at config time), `SCAN_MISMATCH` (segment count/literal mismatch), `EMPTY_SCAN`.

Unit suite `src/modules/wms/lib/__tests__/barcode-template.unit.spec.ts` — 11 cases: simple two-part decode; sku-only; serial-only; literal prefix segment; literal mismatch → `SCAN_MISMATCH`; too few segments → `SCAN_MISMATCH`; tail-fold with one extra segment; tail-fold with multiple extras; no-delimiter single placeholder; empty scan → `EMPTY_SCAN`; `validateTemplate` rejects duplicate placeholder / unknown placeholder → `TEMPLATE_INVALID`.

**Acceptance criteria:** pure functions, no Medusa/module imports; all 11 cases pass.

**Verify:** `pnpm test:unit -- barcode-template`

**Files:** `src/modules/wms/lib/barcode-template.ts`, `src/modules/wms/lib/__tests__/barcode-template.unit.spec.ts`.

**Depends on:** — (pure logic; can run before A1 lands) · **Size:** S

### C2 — suppliers admin CRUD + preview-scan + admin page (M)

**Description:**
- Admin API `src/api/admin/wms/suppliers/route.ts` (+ `[id]/route.ts`): CRUD for suppliers. Create/update validate `barcode_template` via C1's `validateTemplate` and 400 with the typed error on failure.
- Preview endpoint `POST /admin/wms/suppliers/preview-scan`: body `{ template, delimiter, raw }` → returns the C1 parse result or the typed error, WITHOUT persisting — powers the admin "test a scan" box.
- Admin page `src/admin/routes/warehouse-suppliers/page.tsx`: supplier table; create/edit drawer with template + delimiter fields and a live "test a scan" input that calls preview-scan and shows the decoded `{sku, serial}` or the error inline.
- Spec `integration-tests/http/wms-suppliers.spec.ts`: create supplier; reject invalid template with typed error; preview-scan decodes a valid scan; preview-scan surfaces `SCAN_MISMATCH`.

**Acceptance criteria:** CRUD + preview pass; admin page in clean `pnpm build`; invalid templates cannot be saved.

**Verify:** `pnpm test:integration:http -- wms-suppliers && pnpm build`

**Files:** `src/api/admin/wms/suppliers/route.ts`, `src/api/admin/wms/suppliers/[id]/route.ts`, `src/api/admin/wms/suppliers/preview-scan/route.ts`, `src/admin/routes/warehouse-suppliers/page.tsx`, `integration-tests/http/wms-suppliers.spec.ts`.

**Depends on:** A1, C1 · **Size:** M

---

## Milestone D — purchase orders (admin)

### D1 — PO admin API + status transitions (M)

**Description:** Admin API for purchase orders at `src/api/admin/wms/purchase-orders/` (list/create/detail/update + line management).

- **Sequential `display_id`**: assign atomically at creation (Postgres sequence created in a wms migration, or `SELECT max+1` inside a transaction — must be race-safe).
- **Status transitions enforced server-side**: `draft → open → (partially_received →) received`; `draft|open → cancelled`; anything else 400. Receiving-driven transitions (`open → partially_received/received`) happen in E2, not here — this task only enforces legality.
- **Line edits only while `draft`**: add/update/remove lines 400 once the PO is open. Lines snapshot `sku` and `title` from the variant at add time.
- **Gotcha carried from v1:** the generated module DTOs don't type nested creates — create the PO parent first, then its lines separately (service-level helper in the wms service or a small workflow).
- Spec `integration-tests/http/wms-purchase-orders.spec.ts`, 4 cases: (1) create draft with lines → sequential display_ids across two POs; (2) illegal transition (`draft → received`) 400s; (3) line edit on an `open` PO 400s, on `draft` succeeds; (4) open a draft → status `open`.

**Acceptance criteria:** 4 cases pass; display_id race-safe; snapshots present on lines.

**Verify:** `pnpm test:integration:http -- wms-purchase-orders`

**Files:** `src/api/admin/wms/purchase-orders/route.ts`, `src/api/admin/wms/purchase-orders/[id]/route.ts`, `src/api/admin/wms/purchase-orders/[id]/lines/route.ts` (+ `[line_id]`), wms service or `src/workflows/create-purchase-order.ts`, migration if using a sequence, `integration-tests/http/wms-purchase-orders.spec.ts`.

**Depends on:** A1 · **Size:** M

### D2 — PO admin UI (M)

**Description:** Admin pages under `src/admin/routes/purchase-orders/`:

- **List page**: table (display_id, supplier, status badge, expected date, received/ordered totals) with an **inline "Open" action** on draft rows.
- **Create drawer**: supplier select, expected date, notes, line editor with **variant search** (use the admin SDK's product/variant search the way existing admin pages query data), qty per line. Primary button is **"Create & open for receiving"** (creates the PO and immediately transitions it to `open`) — retro lesson: warehouse users were stranded on draft POs they didn't know needed opening. Secondary: "Save as draft".
- **Detail page**: header with status; a visible **draft banner** ("This PO is a draft — open it to start receiving") with an Open button; lines table with received/ordered per line and **short/over badges** (received < ordered after PO closed = short, > ordered = over).

**Acceptance criteria:** flows work against D1's API in the browser; clean build.

**Verify:** `pnpm build` (clean); brain browser-verifies create→open→detail at the milestone checkpoint.

**Files:** `src/admin/routes/purchase-orders/page.tsx`, `src/admin/routes/purchase-orders/[id]/page.tsx`, shared components under `src/admin/routes/purchase-orders/components/` as needed.

**Depends on:** D1 · **Size:** M

---

## Milestone E — inbound backend

### E1 — app-facing PO routes + scan validation (M)

**Description:** Warehouse-app-facing routes under `src/api/wms/purchase-orders/` (staff bearer auth via B1 middleware):

- `GET /wms/purchase-orders`: POs with status `open`/`partially_received`, newest first, with supplier name and per-line received/ordered.
- `GET /wms/purchase-orders/:id`: full detail. Each line includes a `serialized` boolean read from the **variant's metadata** (`variant.metadata.serialized === true`; default false) — serialized lines require per-unit serial scans, non-serialized lines take a quantity.
- `POST /wms/purchase-orders/:id/scan`: body `{ raw }`. Decodes `raw` with the PO's supplier template (C1 lib), then validates: decoded sku must match a line on this PO → else `{ verdict: "reject", code: "NOT_ON_PO" }`; for serialized lines, serial must not already exist for that variant (`serial_unit` lookup) → else `{ verdict: "reject", code: "SERIAL_EXISTS" }`; template mismatch → `{ verdict: "reject", code: "SCAN_MISMATCH" }`. Success → `{ verdict: "accept", variant_id, sku, serial? }`. **Read-only** — no writes; the app accumulates a local session and commits via E2.
- Spec `integration-tests/http/wms-inbound-scan.spec.ts`: accept on a valid serialized scan; `NOT_ON_PO`; `SERIAL_EXISTS` (pre-create the serial_unit in `beforeEach`); `SCAN_MISMATCH`; non-serialized line accepts a sku-only scan.

**Acceptance criteria:** all cases pass; endpoint provably does zero writes (assert serial_unit count unchanged after scans).

**Verify:** `pnpm test:integration:http -- wms-inbound-scan`

**Files:** `src/api/wms/purchase-orders/route.ts`, `src/api/wms/purchase-orders/[id]/route.ts`, `src/api/wms/purchase-orders/[id]/scan/route.ts`, `integration-tests/http/wms-inbound-scan.spec.ts`.

**Depends on:** B1, C1, D1 · **Size:** M

### E2 — receivePurchaseOrderWorkflow + receive endpoint (M)

**Description:** The inbound commit path. Workflow `src/workflows/receive-purchase-order.ts`, input `{ po_id, session_id, staff_id, items: [{ line_id, serials?: string[], quantity?: number }] }`:

1. **Idempotency step**: if this `session_id` was already committed for this PO (store committed session ids on the PO, e.g. `metadata.received_sessions`), short-circuit and return the previous result — the app retries on flaky warehouse Wi-Fi.
2. **Validate step**: PO is `open`/`partially_received`; every line belongs to the PO; serialized lines get serials, non-serialized get quantity; re-check `SERIAL_EXISTS` server-side (scan-time checks can race).
3. **Create serial_units** in chunks (batches of ~100 — a single insert of a large PO blew the query size in v1) with `purchase_order_id` and `received_by`. Compensation: delete the created units.
4. **Adjust inventory** via the Inventory module for each variant's inventory item at the warehouse stock location — **create the inventory level on first receipt if the variant has no level at this location** (known past bug: adjust threw for brand-new variants). Compensation: reverse the adjustment.
5. **Finalize step**: bump `quantity_received` per line; PO status → `received` if all lines full, else `partially_received`; append `session_id` to committed sessions. **Compensation must receive `po_id` in its input** (known past bug: the compensation only got the step's return value and couldn't find the PO to roll back).

Endpoint `POST /wms/purchase-orders/:id/receive` invokes the workflow with the authed staff id.

Spec `integration-tests/http/wms-receive.spec.ts`: (1) full receive → serial_units exist, inventory up by the received qty, PO `received`; (2) partial receive → `partially_received`, later second session completes it; (3) same `session_id` re-posted → 200 but **no** double stock/serials; (4) a payload containing an already-received serial → rejected AND stock unchanged (compensations ran).

**Acceptance criteria:** all 4 cases pass; every write step has a compensation; stock only ever changes through this workflow.

**Verify:** `pnpm test:integration:http -- wms-receive`

**Files:** `src/workflows/receive-purchase-order.ts`, `src/api/wms/purchase-orders/[id]/receive/route.ts`, `integration-tests/http/wms-receive.spec.ts`.

**Depends on:** E1 · **Size:** M

### E3 — stock-take workflow + endpoint (S)

**Description:** PO-less serial registration for the launch backfill (existing shelf stock was bought before the system existed). Workflow `src/workflows/stock-take.ts`, input `{ staff_id, session_id, items: [{ variant_id, serials: string[] }] }`: creates `serial_unit` rows (chunked, `purchase_order_id` null, `received_by` set, same idempotency-by-session pattern as E2 — store committed session ids in a wms-module setting or dedicated place) — **zero inventory quantity change** (quantities were already set in Medusa; stock-take only attaches serials to them). Serialized-variant validation and `SERIAL_EXISTS` re-check as in E2. Endpoint `POST /wms/stock-take`.

Spec addition (`integration-tests/http/wms-stock-take.spec.ts`): serials created, inventory levels unchanged, duplicate serial rejected, session idempotent.

**Acceptance criteria:** cases pass; provably no inventory adjustment.

**Verify:** `pnpm test:integration:http -- wms-stock-take`

**Files:** `src/workflows/stock-take.ts`, `src/api/wms/stock-take/route.ts`, `integration-tests/http/wms-stock-take.spec.ts`.

**Depends on:** E2 · **Size:** S

**→ Checkpoint 1 (brain):** run all three suites (`test:unit`, `test:integration:modules`, `test:integration:http`) green; browser-verify staff admin, suppliers (live test-a-scan), PO create→open→detail; summarize to user.

---

## Milestone F — Expo app foundation

### F1 — apps/warehouse-app scaffold (M) — ask-first

**Description:** New Expo app at `apps/warehouse-app` (package name `@controlkart/warehouse-app`). **The brain gets the user's approval on the dependency set before dispatching this task.** Latest Expo SDK, TypeScript, `expo-router` for navigation. Follow Expo's official pnpm-monorepo guidance: app-local `metro.config.js` with monorepo watchFolders/nodeModulesPaths, deps declared in the app's own `package.json` (never hoisted assumptions). Wire `lint` (eslint, expo config), `typecheck` (`tsc --noEmit`), and `test` (jest-expo) package scripts. Dark theme as the app-wide default (warehouse floor, low ambient light): dark background, high-contrast text, large touch targets. A placeholder home screen proving router + theme work.

**Acceptance criteria:** `pnpm install` clean at repo root; the three scripts pass; `npx expo start` boots and renders the placeholder in Expo Go (worker verifies the bundle builds; actual phone check is F3).

**Verify:** `pnpm --filter @controlkart/warehouse-app lint && pnpm --filter @controlkart/warehouse-app typecheck && pnpm --filter @controlkart/warehouse-app test`

**Files:** `apps/warehouse-app/` (package.json, app.json, metro.config.js, tsconfig.json, eslint config, `app/_layout.tsx`, `app/index.tsx`, theme constants).

**Depends on:** — (parallel with backend; F2 needs B1) · **Size:** M

### F2 — typed API client + login + home (M)

**Description:**
- `src/api/client.ts`: small typed fetch wrapper. **Base URL**: in dev, derive the backend origin from Expo's dev-server host (`Constants.expoConfig.hostUri` → swap port to 9000) so phones on the LAN reach the dev backend with zero config; in production builds use `EXPO_PUBLIC_API_URL`. Bearer token stored in `expo-secure-store`; on any 401, clear the token and route to login.
- Login screen (`app/login.tsx`): email/password → `POST /auth/warehouse_staff/emailpass` → store token → `GET /wms/me` to hydrate the staff profile. Friendly errors for bad credentials and disabled accounts.
- Authed home (`app/(app)/index.tsx` behind a token-gate layout): staff name, big action tiles for **Receive** and **Stock take** only (outbound tiles appear when I2/I3 land — **no dead links**), logout button (clears secure-store).
- Jest tests: dev-URL derivation from several `hostUri` shapes; 401 → token cleared + redirect state.

**Acceptance criteria:** login/logout round-trip works against a local backend; tests pass; no dead navigation targets.

**Verify:** `pnpm --filter @controlkart/warehouse-app test && pnpm --filter @controlkart/warehouse-app typecheck`

**Files:** `apps/warehouse-app/src/api/client.ts`, `app/login.tsx`, `app/(app)/_layout.tsx`, `app/(app)/index.tsx`, `src/api/__tests__/client.test.ts`.

**Depends on:** F1, B1 · **Size:** M

### F3 — device checkpoint M0d (user)

Login on the Android phone **and** the iPhone via Expo Go over LAN; a disabled staff account is bounced with a clear message. (Spec criterion 6.) Brain provides the step-by-step checklist; user executes and reports.

---

## Milestone G — scanner + inbound in app

### G1 — scanner component (M) — brain reviews this diff extra carefully

**Description:** The shared camera-scanner component, `apps/warehouse-app/src/components/Scanner.tsx` — the riskiest client piece.

- `expo-camera` `CameraView` with `barcodeScannerSettings` for `qr, code128, code39, ean13, ean8, upc_a, upc_e`.
- **Generation-counter lifecycle (retro lesson #1):** keep a `useRef` generation counter incremented on every screen focus/unfocus and session reset; scan callbacks capture the generation at registration and drop results from a stale generation. (v1 bug: unmounted screens' callbacks fired on late frames and double-committed scans.)
- **Dedupe:** the same decoded string within **1.8s** is ignored (per-generation timestamp map).
- **Verdict API:** parent passes `onScan(raw) => Promise<"accept" | "reject" | "warn" | "ignore">`; component renders feedback: accept → green flash + `expo-haptics` success; reject → red flash + heavy buzz; warn → amber + double tick; ignore → nothing.
- UI: full-screen camera, centered aiming frame, torch toggle, **manual entry** fallback (keyboard input → same verdict path), and honest permission UX: explain why the camera is needed, deep-link to Settings when permanently denied — never a silent black screen.
- Jest tests for the pure parts (generation filtering, dedupe window) with the camera mocked.

**Acceptance criteria:** component compiles into any screen; stale-generation and dedupe logic unit-tested; all four verdicts produce distinct feedback.

**Verify:** `pnpm --filter @controlkart/warehouse-app test -- Scanner && pnpm --filter @controlkart/warehouse-app typecheck`

**Files:** `apps/warehouse-app/src/components/Scanner.tsx`, `src/components/__tests__/Scanner.test.tsx`, plus `expo-haptics` dep (in the F1-approved set).

**Depends on:** F1 · **Size:** M

### G2 — receiving session store (S)

**Description:** Local receiving-session state, `apps/warehouse-app/src/stores/receiving-session.ts`: a reducer-based store (plain reducer + React context or zustand if it's in the approved dep set) keyed by PO id, persisted to AsyncStorage on every action so the session **survives an app kill** mid-receiving. State per PO: scanned serials per line, quantities per non-serialized line, session_id (generated once per session). Actions: `addSerial` (rejects duplicates already in the session — server can't see unsent scans), `setQuantity`, `reset`, `hydrate`. Jest suite: reducer transitions, dup-in-session rejection, persistence round-trip (AsyncStorage mocked), hydration after "kill".

**Acceptance criteria:** suite passes; store is UI-free (pure logic + storage adapter).

**Verify:** `pnpm --filter @controlkart/warehouse-app test -- receiving-session`

**Files:** `apps/warehouse-app/src/stores/receiving-session.ts`, `src/stores/__tests__/receiving-session.test.ts`.

**Depends on:** F1 · **Size:** S

### G3 — receiving screens (M)

**Description:** The inbound flow in the app, under `app/(app)/receive/`:

- **PO list** (`index.tsx`): open/partially-received POs from `GET /wms/purchase-orders`; tap → session.
- **Scan session** (`[id].tsx`): Scanner (G1) + session store (G2). Each scan → `POST /wms/purchase-orders/:id/scan`; server verdict drives Scanner feedback; accepted serials land in the session (dup-in-session → reject verdict locally). Per-SKU tally strip (scanned/ordered per line). Non-serialized lines: tapping the line opens a **quantity sheet** instead of requiring scans.
- **Review screen**: lines with received-this-session vs ordered; **short and over lines highlighted**; "Add to Warehouse" button → `POST /wms/purchase-orders/:id/receive` with the store's `session_id` (idempotent on retry).
- **Done**: success state; session cleared from AsyncStorage **only after a successful commit**.

**Acceptance criteria:** full flow works against the local backend; commit clears the session; a network-failed commit keeps the session and can be retried safely.

**Verify:** `pnpm --filter @controlkart/warehouse-app typecheck && pnpm --filter @controlkart/warehouse-app test` (flow logic); brain drives the flow in Expo Go against local backend at the milestone gate.

**Files:** `apps/warehouse-app/app/(app)/receive/index.tsx`, `app/(app)/receive/[id].tsx`, review/done screens or steps within `[id].tsx`, home tile wiring in `app/(app)/index.tsx`.

**Depends on:** G1, G2, E1, E2 · **Size:** M

### G4 — stock-take screen (S)

**Description:** `app/(app)/stock-take.tsx`: reuses Scanner + a PO-less variant of the session store (keyed `"stock-take"`). Flow: pick/scan a variant context or scan template-decoded serials directly (server validation via a stock-take-mode scan → reuse E1's parser through a lightweight `POST /wms/stock-take/scan` if needed, else validate client-side by sku lookup) → accumulate serials per variant → review → commit to `POST /wms/stock-take` with session_id. Zero quantity change is the backend's guarantee (E3); the screen just states it ("attaches serials to existing stock").

**Acceptance criteria:** flow completes against local backend; session survives kill; idempotent commit.

**Verify:** `pnpm --filter @controlkart/warehouse-app typecheck && pnpm --filter @controlkart/warehouse-app test`

**Files:** `apps/warehouse-app/app/(app)/stock-take.tsx` (+ small store variant), home tile wiring.

**Depends on:** G1, G2, E3 · **Size:** S

### G5 — device checkpoint M1d (user)

Full inbound on both phones: dense Code128 labels scan reliably; scan feedback feels instant; killing the app mid-session and reopening restores the session; a partial receive completes and the PO shows `partially_received`. (Spec criteria 3, 4-partial, 5-inbound.) Brain provides checklist.

---

## Milestone H — outbound backend (parallel-eligible with F/G after Checkpoint 1)

### H1 — carrier adapter over the Shiprocket plugin (S)

**Description:** `src/modules/wms/lib/carrier.ts`: a thin `ShipmentCarrier` interface + adapter over `@sam-ael/medusa-plugin-shiprocket` for the few operations wms invokes **outside** Medusa's fulfillment workflows (which already route to the plugin's provider): `schedulePickup(shipmentData)`, `cancel(shiprocket_order_id)`, `getLabel(shipmentData)` (for reprint when a stored label URL has expired). **Do not re-implement any Shiprocket HTTP call** — the plugin's client (`providers/shiprocket/client`) already handles auth/token caching (plus a token-refresh job), adhoc orders, AWB, labels, pickup, and cancel.

Implementation: resolve the plugin's registered fulfillment provider instance from the fulfillment module's provider registry (provider id `shiprocket`) and call through its `client`; if provider resolution proves awkward in 2.15.3, fall back to instantiating the plugin's exported client class with the same `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD`/`SHIPROCKET_PICKUP_LOCATION` options — either way it is the plugin's code doing the talking. Everything downstream (H3/H7) depends on the `ShipmentCarrier` interface so tests inject a mock — **no live Shiprocket calls in any test**.

Unit tests `src/modules/wms/lib/__tests__/carrier.unit.spec.ts` (plugin client mocked): each adapter method delegates to the right plugin-client method with the right arguments; plugin errors surface as typed errors.

**Acceptance criteria:** tests pass with zero network; interface exported; no `fetch`/`axios` calls of our own.

**Verify:** `pnpm test:unit -- carrier`

**Files:** `src/modules/wms/lib/carrier.ts`, `src/modules/wms/lib/__tests__/carrier.unit.spec.ts`.

**Depends on:** A1 · **Size:** S

### H2 — shipping-option repoint to the plugin provider (staging) (S)

**Description:** The plugin's provider is registered (`medusa-config.ts`, gated on `SHIPROCKET_EMAIL`) but the storefront's shipping option(s) don't point at it yet. Write an idempotent `medusa exec` script `src/scripts/repoint-shipping-option.ts` that repoints the active shipping option(s) to the plugin provider's `shiprocket-standard` fulfillment option (the plugin also exposes `shiprocket-return`; leave returns alone for now), printing before/after state. **Run on staging only — the prod run is a separate user-approved step at J5.** The plugin's registration in `medusa-config.ts` and its `package.json` dependency are **permanent — never remove them**.

Also verify (and document in the script output) that checkout still completes against the repointed option with the plugin's `validateFulfillmentData`/`calculatePrice` path.

**Acceptance criteria:** script idempotent (second run is a no-op); staging checkout completes; clean boot.

**Verify:** run the exec twice against a local/staging DB with Shiprocket env set; `pnpm build`.

**Files:** `src/scripts/repoint-shipping-option.ts`.

**Depends on:** — (plugin already registered) · **Size:** S

### H3 — order.placed → auto-fulfillment workflow + wms shipment + auto-cancel (M)

**Description:** The order-time leg. **Design decision (user-approved): the Medusa fulfillment is created at order placement**, because the plugin's `createFulfillment` is what creates the Shiprocket adhoc order + assigns the AWB + generates the label — and the warehouse flow needs the label printed *before* picking. Stock is therefore deducted at placement (accepted trade-off: prevents overselling).

- Workflow `src/workflows/create-shipment.ts`: for a placed order whose shipping method targets the plugin's provider → invoke Medusa's core **`createOrderFulfillmentWorkflow`** (this calls the plugin: Shiprocket order + AWB + label; deducts stock; stores label/tracking on the fulfillment's `labels` and provider `data` — fields `awb`, `order_id` (Shiprocket), `shipment_id`, `label_url`, `tracking_number`) → read those back → create the wms `shipment` row (`label_ready`, awb, label_url, shiprocket_order_id, medusa fulfillment id) → **enqueue a `print_job`** with the label URL. Compensations: cancel the Medusa fulfillment (which triggers the plugin's `cancelFulfillment` → Shiprocket cancel) / delete the shipment row / mark the print_job failed.
- Subscriber `src/subscribers/order-placed-shipment.ts` (follow existing subscriber style, e.g. `product-created.ts`): on `order.placed`, invoke the workflow; skip orders on non-Shiprocket shipping methods; failures land visibly (logger error + no half-created shipment — NOT swallowed).
- Auto-cancel: subscriber on order cancellation → if the shipment isn't shipped yet → cancel the Medusa fulfillment via the core cancel workflow (plugin cancels at Shiprocket, stock restocks), shipment status `cancelled`, pending print_job `failed`.
- Spec `integration-tests/http/wms-shipment-create.spec.ts` (plugin provider mocked at the provider seam): order placed → Medusa fulfillment + wms shipment row + print_job with the mock's AWB/label, stock decremented; order cancelled → fulfillment cancelled, stock restored, statuses updated.

**Acceptance criteria:** spec passes with the provider mocked; stock movement happens only via Medusa's core workflows; nothing talks to Shiprocket except through the plugin.

**Verify:** `pnpm test:integration:http -- wms-shipment-create`

**Files:** `src/workflows/create-shipment.ts`, `src/subscribers/order-placed-shipment.ts`, `src/subscribers/order-canceled-shipment.ts`, `integration-tests/http/wms-shipment-create.spec.ts`.

**Depends on:** H1, H2, A1 · **Size:** M

### H4 — print queue + shift windows + agent poll/ack (M)

**Description:** The Postgres-backed print queue the Pi agent consumes.

- **Shift-window release**: pure function `src/modules/wms/lib/shift-window.ts` — given shift_config rows and a timestamp (IST), is the window open? Print jobs enqueue at any hour (H3), but poll only **releases** jobs inside a shift window (labels printed at 3am curl and jam by morning — the printer sits idle overnight).
- Agent routes under `src/api/wms/print-agent/` authenticated by a **static token** (`WMS_PRINT_AGENT_TOKEN` env, checked in middleware — the Pi is headless, no interactive login): `POST poll` → atomically claim up to N `pending` jobs if the shift window is open (mark `released`, set `released_at`), also records agent heartbeat (last-seen timestamp — a wms-module setting or dedicated row) even when no jobs; `POST jobs/:id/ack` → body `{ status: "done" | "failed", error? }`, increments `attempts`, `failed` jobs with attempts < 3 revert to `pending` for re-release.
- Admin shift-config API `src/api/admin/wms/shift-config/route.ts`: CRUD over shift windows.
- Unit tests for `shift-window` (boundaries, overnight windows, inactive rows). Spec `integration-tests/http/wms-print-queue.spec.ts`: poll inside window releases + claims atomically (two polls don't double-claim); poll outside window returns none but records heartbeat; ack done/failed + retry revert; bad token 401.

**Acceptance criteria:** all tests pass; claiming is atomic; heartbeat recorded on every poll.

**Verify:** `pnpm test:unit -- shift-window && pnpm test:integration:http -- wms-print-queue`

**Files:** `src/modules/wms/lib/shift-window.ts` (+ unit test), `src/api/wms/print-agent/poll/route.ts`, `src/api/wms/print-agent/jobs/[id]/ack/route.ts`, `src/api/middlewares.ts` (token check), `src/api/admin/wms/shift-config/route.ts`, `integration-tests/http/wms-print-queue.spec.ts`.

**Depends on:** A1, H3 (jobs to release) · **Size:** M

### H5 — print-agent heartbeat monitor + alerts (S)

**Description:** Scheduled job `src/jobs/print-agent-monitor.ts` (follow `src/jobs/meilisearch-resync.ts` style; every ~5 min): during an open shift window, if the agent's last heartbeat is **>10 min old**, or any print_job has been `released` without ack for >10 min ("stuck"), send an alert email to the ops address (`WMS_ALERT_EMAIL` env) **via the existing Notification module** (`createNotifications` with the `email` channel — routes to the `src/modules/resend` provider in prod and the console-logging local provider in dev; do NOT import the Resend SDK directly). Deduplicate: don't re-alert for the same condition more than once per hour.

**Acceptance criteria:** unit-test the decision function (stale heartbeat / stuck job / dedupe) as a pure function with injected clock; job wiring compiles and registers.

**Verify:** `pnpm test:unit -- print-agent-monitor && pnpm build`

**Files:** `src/jobs/print-agent-monitor.ts`, `src/modules/wms/lib/agent-monitor.ts` (pure decision logic) + unit test.

**Depends on:** H4 · **Size:** S

### H6 — pick backend (M)

**Description:** Server-persisted picking state (pick state must survive app restarts and be visible to admins — it lives on the shipment, not in the app).

- `GET /wms/shipments/by-awb/:awb`: resolve a scanned AWB to the shipment + its order's items (variant, sku, qty, serialized flag, already-picked progress). 404 for unknown AWB; 409 if the shipment isn't in a pickable state (`label_ready`/`picked` for resume).
- `POST /wms/shipments/:id/pick-scan`: body `{ raw }` (template-decoded like inbound where supplier-labeled, or plain serial scan). Validation: decoded/scanned serial must exist as a `serial_unit` with status `in_stock` → else reject `SERIAL_NOT_IN_STOCK`; its variant must be on this order → else `WRONG_ITEM`; not more units of a variant than ordered → `OVER_SCAN`; same serial twice → `ALREADY_PICKED`. Success: serial recorded on the shipment's pick state (JSON on shipment or a metadata structure), progress returned. Non-serialized lines: `POST .../pick-qty` sets picked quantity ≤ ordered.
- When all lines fully picked → shipment status `picked` (unlocks Pack in the app).
- Spec `integration-tests/http/wms-pick.spec.ts`: happy path to `picked`; `WRONG_ITEM`; `OVER_SCAN`; `SERIAL_NOT_IN_STOCK`; resume (state persists across requests).

**Acceptance criteria:** cases pass; pick state readable back via the by-awb endpoint (resume works).

**Verify:** `pnpm test:integration:http -- wms-pick`

**Files:** `src/api/wms/shipments/by-awb/[awb]/route.ts`, `src/api/wms/shipments/[id]/pick-scan/route.ts`, `src/api/wms/shipments/[id]/pick-qty/route.ts`, `integration-tests/http/wms-pick.spec.ts`.

**Depends on:** H3 · **Size:** M

### H7 — pack/ship backend (M)

**Description:** The outbound commit path. The Medusa fulfillment (and stock deduction) already happened at order placement (H3) — pack completion **marks the order shipped**, it does not create a fulfillment.

- `POST /wms/shipments/:id/verify-awb`: body `{ raw }` — the packer re-scans the label on the box; server confirms it matches this shipment's AWB (reject `AWB_MISMATCH` — v1 retro: boxes got the wrong label).
- Photo upload `POST /wms/shipments/:id/pack-photo`: multipart image → store via the **existing File module** (S3/R2 in prod, local in dev) → create `pack_record` (photo file id/url, `packed_by`, `packed_at`).
- Workflow `src/workflows/pack-and-ship.ts`, invoked by `POST /wms/shipments/:id/ship`: validate shipment `picked` + AWB verified + pack_record exists → mark picked serial_units `shipped` with the `order_id` (compensation: revert to `in_stock`) → invoke Medusa's core **`createOrderShipmentWorkflow`** on the H3 fulfillment with the AWB as tracking number (this fires the customer "shipped" notification) → schedule Shiprocket pickup via the H1 carrier adapter (compensation: log + flag for manual pickup — Shiprocket has no pickup-cancel) → shipment row `fulfilled`. **No inventory adjustment anywhere in this workflow.**
- Spec `integration-tests/http/wms-pack-ship.spec.ts` (carrier mocked): AWB mismatch rejected; ship without photo rejected; ship before fully picked rejected; happy path → Medusa shipment exists with AWB tracking, serials `shipped` with order id, pickup scheduled, inventory unchanged by this step; mid-way failure leaves serials `in_stock`.

**Acceptance criteria:** cases pass; serials carry the order id; provably zero inventory change in this workflow.

**Verify:** `pnpm test:integration:http -- wms-pack-ship`

**Files:** `src/api/wms/shipments/[id]/verify-awb/route.ts`, `src/api/wms/shipments/[id]/pack-photo/route.ts`, `src/api/wms/shipments/[id]/ship/route.ts`, `src/workflows/pack-and-ship.ts`, `integration-tests/http/wms-pack-ship.spec.ts`.

**Depends on:** H1, H6 · **Size:** M

---

## Milestone I — outbound app + print agent

### I1 — apps/print-agent (M) — ask-first

**Description:** New workspace package `apps/print-agent` (`@controlkart/print-agent`) — the Raspberry Pi label-print daemon. **Brain gets user approval on the dependency set first.** Node 20, TypeScript, no framework: a poll loop hitting `POST <backend>/wms/print-agent/poll` (env: `WMS_BACKEND_URL`, `WMS_PRINT_AGENT_TOKEN`, `POLL_INTERVAL_MS` default 15s), downloads each job's label (PDF/ZPL per Shiprocket label URL), sends to the printer, acks done/failed. Two driver implementations behind one `PrinterDriver` interface: `zebra-usb` (raw ZPL to the USB device path, converting/rendering PDF→ZPL only if the label isn't already ZPL — if conversion is needed, prefer printing the PDF via CUPS `lp` as the pragmatic path and document it) and `mock` (writes to `./out/*.label`, for dev). `systemd` unit file + `docs/print-agent-pi-setup.md` (flash → node install → env file → enable unit). Jest tests with mocked fetch/driver: poll→print→ack loop, failure→ack failed, backoff on network errors.

**Acceptance criteria:** `pnpm --filter @controlkart/print-agent test` passes; mock-driver run against a local backend prints a queued job end-to-end (brain verifies at gate); setup doc complete.

**Verify:** `pnpm --filter @controlkart/print-agent test && pnpm --filter @controlkart/print-agent typecheck`

**Files:** `apps/print-agent/` (package.json, tsconfig, `src/index.ts`, `src/drivers/{zebra-usb,mock}.ts`, `src/__tests__/`), `apps/print-agent/systemd/print-agent.service`, `docs/print-agent-pi-setup.md`.

**Depends on:** H4 · **Size:** M

### I2 — app pick flow (M)

**Description:** `app/(app)/pick/` in the warehouse app: entry tile appears on home. Flow: Scanner scans an **AWB** → `GET /wms/shipments/by-awb/:awb` → order screen listing items with picked/ordered progress → per-serial pick scans via Scanner → `POST pick-scan`; server verdicts drive feedback (**wrong item = heavy buzz + red flash + persistent banner naming the expected SKU** — the packer must not have to squint); non-serialized lines use a qty stepper → `pick-qty`. When the server flips the shipment to `picked`, the **Pack button unlocks**. Resume: reopening the AWB shows server-side progress (H6 persistence).

**Acceptance criteria:** full flow against local backend; wrong-item feedback unmissable; resume works after app kill.

**Verify:** `pnpm --filter @controlkart/warehouse-app typecheck && pnpm --filter @controlkart/warehouse-app test`

**Files:** `apps/warehouse-app/app/(app)/pick/index.tsx`, `app/(app)/pick/[id].tsx`, home tile wiring.

**Depends on:** G1, H6 · **Size:** M

### I3 — app pack flow (M)

**Description:** Continuation from I2's unlocked Pack button, `app/(app)/pack/[id].tsx`:

1. **AWB re-scan gate**: Scanner → `POST verify-awb`; mismatch = reject feedback, cannot proceed.
2. **Packed-box photo**: `expo-camera` still capture → client-side resize so the longest edge ≤ **1600px** (`expo-image-manipulator`, in the approved dep set) → upload to `POST pack-photo` with progress state and retry on failure.
3. **Ship**: button → `POST ship` → success screen (AWB, courier, "hand to pickup").

**Acceptance criteria:** flow completes against local backend (carrier mocked/staging); photo lands via the File module; failed upload retryable without redoing the re-scan.

**Verify:** `pnpm --filter @controlkart/warehouse-app typecheck && pnpm --filter @controlkart/warehouse-app test`

**Files:** `apps/warehouse-app/app/(app)/pack/[id].tsx`, small upload helper in `src/api/client.ts`.

**Depends on:** I2, H7 · **Size:** M

### I4 — tracking read-side via plugin module + webhook config (S)

**Description:** **No custom tracking sync job** (user-approved): the Shiprocket plugin already ships a webhook-fed `shiprocket-tracking` module (service methods `findByAwb`, `findByFulfillmentId`, `upsertByAwb`), an HMAC-protected webhook endpoint at `POST /hooks/fulfillment/delivery-updates`, a token-refresh job, and admin sync/pickup routes under `/admin/shiprocket/tracking/[awb]`. This task is read-side only:

- Read helper in the wms service (or a small util) that resolves the plugin's tracking module service from the container (registration key `shiprocketTrackingModuleService`) and returns tracking for a wms shipment by AWB — used by J1's admin widget and any app status display. Map the plugin's tracking status onto `shipment.tracking_status` lazily on read (no writes to the plugin's tables).
- Configure the webhook: document (in `docs/warehouse-ops.md` draft or a `docs/shiprocket-webhook.md` stub) how to register the delivery-updates webhook URL + secret env in the Shiprocket dashboard, and which env var the plugin checks for the HMAC secret (read it from the plugin's route source when implementing).
- Test: integration case (`integration-tests/http/wms-tracking-read.spec.ts`) seeding a row via the plugin module's `upsertByAwb` and asserting the wms read helper returns it.

**Acceptance criteria:** wms reads tracking exclusively from the plugin's module; zero Shiprocket API calls added; doc tells ops how to wire the webhook.

**Verify:** `pnpm test:integration:http -- wms-tracking-read && pnpm build`

**Files:** wms service or `src/modules/wms/lib/tracking-read.ts`, `integration-tests/http/wms-tracking-read.spec.ts`, webhook setup doc.

**Depends on:** H3 · **Size:** S

### I5 — device+hardware checkpoint M2d (user)

Spec criteria 1, 2, 5, 8 end-to-end: real order → label auto-prints on the **Zebra ZD230** during shift; pick with wrong-item rejection; pack with photo; fulfillment visible in admin; **kill-the-Pi drill** (unplug mid-shift → alert email arrives; plug back → queue drains). Brain provides checklist.

---

## Milestone J — admin polish, distribution, launch

### J1 — admin order-detail widget + serial lookup (M)

**Description:**
- Widget `src/admin/widgets/order-warehouse-status.tsx` (zone: order detail; follow `src/admin/widgets/product-documents.tsx` style): shows the wms shipment for the order — status, AWB, courier, **picked serials per item**, the pack **photo** (thumbnail → full view), and a pick/pack **timeline** (picked_at per scan bucket, packed_at, fulfilled_at).
- Serial lookup page `src/admin/routes/serial-lookup/page.tsx`: search a serial → matching serial_units (variant, status, PO received on, order shipped on, dates) — the "customer says the unit is faulty, which batch was it?" tool.
- Backing admin routes under `src/api/admin/wms/` as needed (shipment-by-order, serial search).

**Acceptance criteria:** widget renders on an order with wms data and stays absent otherwise; lookup finds by exact serial across variants; clean build.

**Verify:** `pnpm build`; brain browser-verifies both against seeded data.

**Files:** `src/admin/widgets/order-warehouse-status.tsx`, `src/admin/routes/serial-lookup/page.tsx`, `src/api/admin/wms/serials/route.ts`, `src/api/admin/wms/shipments/route.ts`.

**Depends on:** H7 · **Size:** M

### J2 — admin print-queue page + low-stock filter (M)

**Description:**
- Print-queue page `src/admin/routes/print-queue/page.tsx`: jobs table filterable pending/released/failed; **agent last-seen** indicator (green <5 min, amber <15, red otherwise, from the H4 heartbeat); **Reprint** action (clones a job back to `pending`); failed jobs show their error.
- Inventory low-stock: a filter/view (admin route page `src/admin/routes/low-stock/page.tsx` or widget) listing variants whose available quantity at the warehouse location is at or below a threshold (`variant.metadata.low_stock_threshold`, default 0 = only out-of-stock).
- Backing admin routes: print-job list/reprint, heartbeat read, low-stock query (Query across inventory levels).

**Acceptance criteria:** reprint produces a job the agent's next poll picks up; last-seen reflects H4 heartbeats; clean build.

**Verify:** `pnpm build`; brain browser-verifies with the mock print agent running.

**Files:** `src/admin/routes/print-queue/page.tsx`, `src/admin/routes/low-stock/page.tsx`, `src/api/admin/wms/print-jobs/route.ts` (+ reprint), `src/api/admin/wms/agent-status/route.ts`, low-stock route.

**Depends on:** H4, I1 (for live verify) · **Size:** M

### J3 — variant weight/dims audit script (S)

**Description:** `src/scripts/audit-variant-shipping-data.ts`, run via `npx medusa exec ./src/scripts/audit-variant-shipping-data.ts`: lists every published variant missing weight, length, width, or height (required for H3's Shiprocket payloads — missing dims cause silent bad freight quotes). Prints a table (sku, title, missing fields) and **exits non-zero if any gaps** so it can gate the launch checklist.

**Acceptance criteria:** catches seeded gap-variants; exit codes correct.

**Verify:** run the exec against local seed data; confirm non-zero exit with gaps, zero without.

**Files:** `src/scripts/audit-variant-shipping-data.ts`.

**Depends on:** — · **Size:** S

### J4 — EAS Android build + OTA channel (M)

**Description:** Production distribution for the warehouse phones. `apps/warehouse-app/eas.json` with a `production` profile building an **APK** (not AAB — sideloaded, not Play Store), `EXPO_PUBLIC_API_URL` set to the prod backend; `expo-updates` configured with a production **OTA channel** so JS-only fixes ship without reinstalling. `docs/warehouse-app-install.md`: build command, download link retrieval, Android sideload steps, how OTA updates land. **iOS/TestFlight is blocked on the user's Apple Developer account decision — do not spend time on it**; iPhone stays on Expo Go meanwhile (noted in the doc).

**Acceptance criteria:** `eas build --platform android --profile production` succeeds (needs the user's Expo account — brain coordinates); installed APK logs in against prod; an OTA update reaches the phone.

**Verify:** EAS build completes; user confirms install per doc.

**Files:** `apps/warehouse-app/eas.json`, `app.json` updates (updates URL, runtimeVersion), `docs/warehouse-app-install.md`.

**Depends on:** G5 (app worth shipping), user's Expo account · **Size:** M

### J5 — launch gate (user + brain)

All 9 spec success criteria demonstrated end-to-end; stock-take backfill executed on real shelf stock (E3/G4); **prod shipping-option cutover** — run the H2 repoint script against prod (the Shiprocket plugin itself stays registered permanently) — **only with the user's explicit approval**; Shiprocket delivery-updates webhook registered for prod (I4 doc); J3 audit passes with zero gaps; existing storefront test suites green (no regression from the shipping-option repoint or order-time fulfillment); ops runbook `docs/warehouse-ops.md` written (daily flows, printer jams, Pi recovery, alert responses, staff on/offboarding).
