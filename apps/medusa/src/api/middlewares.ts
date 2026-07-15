import {
  defineMiddlewares,
  authenticate,
  type MedusaRequest,
  type MedusaResponse,
  type MedusaNextFunction,
} from "@medusajs/framework/http"
import { WMS_MODULE } from "../modules/wms"
import type WmsModuleService from "../modules/wms/service"

/**
 * CORS for the warehouse app routes. The native app itself sends no Origin
 * header (unaffected); this only matters for browser-based dev tooling.
 * Runs before authenticate so OPTIONS preflights don't need a token.
 */
const wmsCors = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const allowed = (process.env.WAREHOUSE_CORS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.origin

  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204)
    return
  }
  next()
}

/**
 * Disabling a staff account must lock them out immediately, even though their
 * bearer token stays cryptographically valid — so every /wms request re-checks
 * the active flag, not just /wms/me.
 */
const requireActiveStaff = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const staffId = (req as any).auth_context?.actor_id
  if (!staffId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const [staff] = await wms.listStaff({ id: staffId })

  if (!staff) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }
  if (!staff.active) {
    res.status(403).json({ message: "This staff account has been disabled" })
    return
  }
  next()
}

/**
 * True for every route under /wms/print-agent/* (the static-token routes).
 *
 * Deliberately reads `req.originalUrl`, NOT `req.path`: Medusa mounts each
 * middleware entry via `app.use(matcher, handler)`, and Express rewrites
 * `req.path`/`req.url` inside a mounted handler to be relative to the mount
 * match — so within the `/wms*`-mounted staff-auth chain, `req.path` no
 * longer starts with "/wms/...". `originalUrl` always carries the full
 * request path (plus query string, which is stripped here).
 */
const isPrintAgentPath = (req: MedusaRequest): boolean =>
  (req.originalUrl ?? "").split("?")[0].startsWith("/wms/print-agent")

/**
 * Medusa's route matchers aren't "first match wins" — every matcher entry
 * whose pattern matches the request runs its middleware chain, in array
 * order. `/wms/print-agent/*` matches BOTH the print-agent-specific matcher
 * below AND the general `/wms*` matcher, so the general entry's staff-auth
 * chain would otherwise still execute (and reject) print-agent requests.
 * Wrapping each staff-auth middleware with this guard makes the general
 * `/wms*` entry a no-op pass-through for print-agent paths, so only the
 * print-agent matcher's static-token middleware actually gates them.
 */
const skipForPrintAgent =
  (
    middleware: (
      req: MedusaRequest,
      res: MedusaResponse,
      next: MedusaNextFunction
    ) => unknown
  ) =>
  (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (isPrintAgentPath(req)) {
      next()
      return
    }
    middleware(req, res, next)
  }

/**
 * Static-token auth for the print agent (a headless device, not a logged-in
 * staff member) — bearer/session staff auth does not apply here on purpose.
 * 503 (not 401) when the server itself isn't configured with a token, so a
 * misconfigured deploy is distinguishable from a bad/missing client token.
 */
const printAgentAuth = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const expected = process.env.WMS_PRINT_AGENT_TOKEN
  if (!expected) {
    res.status(503).json({
      message:
        "WMS_PRINT_AGENT_TOKEN is not configured on this server; print agent routes are disabled.",
    })
    return
  }

  const provided = req.headers["x-print-agent-token"]
  if (!provided || provided !== expected) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      // Registered before the general "/wms*" matcher below so the print
      // agent's static-token check runs first for print-agent paths (see
      // skipForPrintAgent for why the general entry also has to cooperate —
      // both matchers run their chains for a print-agent request).
      matcher: "/wms/print-agent*",
      middlewares: [wmsCors, printAgentAuth],
    },
    {
      matcher: "/wms*",
      middlewares: [
        wmsCors,
        skipForPrintAgent(authenticate("warehouse_staff", ["bearer"])),
        skipForPrintAgent(requireActiveStaff),
      ],
    },
    {
      // H7 pack photo: base64 JSON body (client resizes to <=1600px, but
      // must still fit the route's own 5MB *decoded* cap — base64 inflates
      // that by ~1.37x, plus JSON framing). Medusa's default JSON body
      // limit (100kb) is far below that, so this route needs its own
      // bodyParser override. Must sit WELL ABOVE the route's decoded cap:
      // payloads between ~6.7mb (5MB decoded) and this limit get the
      // route's clean 413; only absurd payloads hit the raw parser error.
      matcher: "/wms/shipments/:id/pack-photo",
      method: "POST",
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/store/quotes",
      method: "GET",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/quotes",
      method: "POST",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/store/orders/:id/invoice",
      method: "GET",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auth/send-verification",
      method: "POST",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
