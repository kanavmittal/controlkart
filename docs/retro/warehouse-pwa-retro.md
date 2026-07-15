# Retro: Warehouse PWA (v1 attempt, 2026-07-12)

We built Milestone 0 + most of Milestone 1 (spec: `docs/specs/warehouse-scanning-system.md`)
with the employee app as a Next.js PWA, then pivoted to Expo/React Native after
real-device testing. This documents why, what failed, and what carries forward.

## The decisive mistake: platform choice weighted the wrong axis

The interview picked PWA for **update-ease and no app stores**. Both true. But
for this product, *scanning is the product* — the employee does nothing but
point a camera at barcodes all day — and web camera scanning is the single
weakest capability of the web platform, especially on iOS:

- **iOS Safari has no native BarcodeDetector** → software decoding (ZXing/WASM-less JS)
  at a few fps, vs. hardware-backed ML Kit/AVFoundation which is effectively instant.
- **No vibration API on iOS** → the "buzz on wrong item" requirement silently
  degrades to visuals only.
- **Secure-context wall**: camera, `crypto.randomUUID`, PWA install all require
  HTTPS. Every dev/test session on a LAN IP hit a different variant of this
  (fake "permission denied", Next error page, no install prompt) and cost a
  debugging round each. Employee phones will also hit it on any future
  non-HTTPS internal tooling.
- Even after tuning (1080p frames, TRY_HARDER, restricted formats, center-band
  crop decoding, aiming guide), iPhone scanning of a dense 31-char Code128 was
  "works but slow" — below warehouse-grade.

**Learning:** when one interaction dominates the product (here: scan), platform
choice must be driven by the quality ceiling of THAT interaction, not by
deployment convenience. Ask "what does the user do 500 times a day?" and pick
the platform that is best at exactly that.

## Implementation mistakes worth remembering

1. **React StrictMode vs. media streams**: a boolean "already starting" guard
   deadlocks under StrictMode's dev double-mount (start #1 cancelled while
   awaiting the permission prompt; guard blocks start #2 forever → camera light
   flashes 2s then dead UI). Correct pattern: **generation counter** — stop()
   bumps the generation, stale starts discard their stream on every await
   boundary. Applies identically to React Native fast-refresh lifecycles.
2. **`next build` while `next dev` is serving corrupts `.next`**
   ("Cannot find module './NNN.js'"). Never run a production build against a
   live dev server's output dir; lint/typecheck are the safe always-on checks.
3. **Secure-context-only APIs fail silently different ways** —
   `crypto.randomUUID` throws, `getUserMedia` is absent (not "denied", absent),
   install prompts just don't appear. Any of these reached via LAN-IP HTTP.
   Fallbacks + honest state labels ("insecure" ≠ "denied") matter.
4. **Draft→open PO gate shipped without a visible action** — user created a PO,
   app showed nothing, no affordance explained why. Status gates need their
   primary transition surfaced at creation time ("Create & open for receiving")
   and a banner on the gated object, not a lone button on a detail page.
   General rule: every "why is my thing not showing up?" support question is a
   missing affordance, not a user error.
5. **Camera-format tuning lessons** (transfer to any scanner impl): dense 1D
   codes need resolution (1080p+) and benefit hugely from restricting decode
   formats and cropping to an aiming band; full-frame scan-everything defaults
   are the slow path.

## What worked and carries forward unchanged (backend is client-agnostic)

The entire backend was deliberately built so the client is replaceable:

- `wms` module (supplier/barcode-template, PO + lines, serial ledger with
  per-variant uniqueness, shipment, pack-record, print-job, shift-config, staff).
- `warehouse_staff` auth actor — core `/auth/warehouse_staff/emailpass` issues
  bearer JWTs; **works identically for React Native**.
- Server-side scan validation (`POST /wms/purchase-orders/:id/scan`) — because
  parsing/validation lives on the server, the Expo app inherits vendor
  templates, NOT_ON_PO, SERIAL_EXISTS handling for free.
- `receivePurchaseOrderWorkflow` — serials + Medusa inventory adjustment
  (including create-level-on-first-receipt) + partial receiving + per-session
  idempotency. 15 integration + 13 unit tests green.
- Admin pages (staff, suppliers with scan preview, POs).

Tests caught three real bugs pre-device (uncountable "Staff" pluralization,
DB truncation between test cases, missing inventory level on first receipt) —
the test-per-task cadence pays for itself; keep it.

## What the Expo rewrite replaces

- `apps/warehouse` (Next.js PWA) → `apps/warehouse-app` (Expo).
- Scanner: `expo-camera` native ML Kit/AVFoundation scanning (instant, both
  platforms), `expo-haptics` for buzz (works on iOS too — better than the PWA).
- Session persistence: AsyncStorage/SQLite instead of IndexedDB.
- Distribution: EAS builds; Android APK direct-install for the warehouse
  (no Play Store needed), iOS via TestFlight/ad-hoc. Updates via `expo-updates`
  OTA — recovers most of the "easy to update" property that motivated the PWA.

## Process notes

- Real-device walkthroughs surfaced every one of the issues above; emulator/
  desktop testing surfaced none of them. Schedule device testing at the END of
  each UI milestone, not at the end of the project.
- The spec's phase-gating worked: pivoting after M0+M1 costs one app shell and
  one scanner component — the expensive parts (domain model, workflows, admin,
  tests) survive because the spec drew the client/server line correctly.
