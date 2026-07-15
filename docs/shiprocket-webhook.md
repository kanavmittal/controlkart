# Shiprocket delivery-updates webhook

How to register Shiprocket's inbound tracking webhook against production,
and how it's secured. Source: `@sam-ael/medusa-plugin-shiprocket@0.2.1`
(`.medusa/server/src/api/hooks/fulfillment/delivery-updates/route.ts` and
its `README.md`).

## Endpoint

```
POST https://<your-medusa-domain>/hooks/fulfillment/delivery-updates
```

This route is registered automatically by the plugin when it's present in
`medusa-config.ts`'s `plugins` array (gated on `SHIPROCKET_EMAIL`, same as
the fulfillment provider) — nothing extra to wire up on the Medusa side.

## Auth — NOT HMAC, a shared static token

The plugin's own docs/comments loosely call this "webhook security", and
it's easy to assume it's an HMAC signature over the payload — **it isn't**.
It's a plain shared-secret header, compared in constant time
(`crypto.timingSafeEqual`) to resist timing attacks, but there's no
signing/digest of the request body:

- **Header:** `x-api-key`
- **Value:** must exactly match the env var **`SHIPROCKET_WEBHOOK_TOKEN`**
  on the Medusa backend.

If `SHIPROCKET_WEBHOOK_TOKEN` isn't set, the route returns `500
WEBHOOK_NOT_CONFIGURED` for every request. If the header is missing or
doesn't match, it returns `401 UNAUTHORIZED`.

The route also deduplicates events using
`${awb}:${current_status_id ?? current_status}:${current_timestamp ?? "na"}`
for 10 minutes, so re-sent/duplicate scan events are safe to retry.

## Registering the webhook in the Shiprocket dashboard

1. Log in to the Shiprocket dashboard.
2. Go to **Settings → API → Configure Webhook** (or **Settings →
   Webhooks**, depending on account type).
3. Set the webhook URL to:
   `https://<your-medusa-domain>/hooks/fulfillment/delivery-updates`
4. Add a custom header:
   - Key: `x-api-key`
   - Value: the same string set as `SHIPROCKET_WEBHOOK_TOKEN` in the
     backend's production env.
5. Save. Shiprocket will POST scan/status updates to this URL as they
   happen; the plugin's `shiprocket-tracking` module stores them, keyed by
   AWB (`upsertByAwb`).

## Env vars involved

| Var | Purpose |
|---|---|
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` | Gate the whole plugin (provider + webhook route + tracking module) on/off in `medusa-config.ts`. |
| `SHIPROCKET_WEBHOOK_TOKEN` | The shared secret this webhook route checks against `x-api-key`. Must be set in prod or the route 500s. |
| `SHIPROCKET_WEBHOOK_PAYLOAD_RETENTION_DAYS` | Optional (default 30). A daily job nulls out `raw_payload` on tracking rows older than this, for storage hygiene. |

## curl example

```bash
curl -X POST https://<your-medusa-domain>/hooks/fulfillment/delivery-updates \
  -H "Content-Type: application/json" \
  -H "x-api-key: $SHIPROCKET_WEBHOOK_TOKEN" \
  -d '{
    "awb": "AWB1234567890",
    "current_status": "IN TRANSIT",
    "current_status_id": 18,
    "shipment_status": "IN TRANSIT",
    "shipment_status_id": 18,
    "current_timestamp": "2026-07-12 10:15:00",
    "courier_name": "Test Courier",
    "order_id": "ord_01ABC-1752307200"
  }'
```

A `200` response looks like:

```json
{ "message": "Webhook processed", "awb": "AWB1234567890" }
```

Wrong/missing `x-api-key` returns `401`; a malformed payload (missing/
invalid `awb`, or missing both `current_status` and `shipment_status`)
returns `400`.

## Reading tracking back out (wms)

wms never talks to Shiprocket directly for tracking — it reads exclusively
from the plugin's own tracking module via
`src/modules/wms/lib/tracking-read.ts` (`getTrackingForShipment`,
`mapTrackingToStatus`), which resolves the plugin's module from the
container by its registration key, `shiprocketTrackingModuleService`.
