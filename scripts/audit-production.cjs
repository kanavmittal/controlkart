const { spawnSync } = require("node:child_process")
const fs = require("node:fs")

// Only these deployment-specific exceptions are allowed. New advisories fail CI.
// Reassess before enabling telemetry, a Vite development server, or Windows hosting.
const exceptions = new Map([
  ["GHSA-fx2h-pf6j-xcff", "Vite development-server issue on Windows; production uses Linux and static admin assets"],
  ["GHSA-q7rr-3cgh-j5r3", "OpenTelemetry exporters are disabled; no Prometheus listener is deployed"],
  ["GHSA-45rx-2jwx-cxfr", "OpenTelemetry is disabled; no Jaeger propagator is registered"],
])

const instrumentation = fs.readFileSync("apps/medusa/instrumentation.ts", "utf8")
  .split("\n").filter(line => !line.trim().startsWith("//")).join("\n").trim()
const dockerfile = fs.readFileSync("apps/medusa/Dockerfile", "utf8")
if (instrumentation || !dockerfile.includes("OTEL_SDK_DISABLED=true")) {
  console.error("Telemetry configuration changed; review the production security exceptions")
  process.exit(1)
}

const result = spawnSync("pnpm", ["audit", "--prod", "--json"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 })
let audit
try { audit = JSON.parse(result.stdout) } catch {
  console.error("Dependency audit did not return a valid report")
  process.exit(1)
}
if (!audit.metadata || !audit.advisories || audit.error) {
  console.error("Dependency audit failed; no release decision can be made")
  process.exit(1)
}
let blocked = false
for (const advisory of Object.values(audit.advisories)) {
  if (!["high", "critical"].includes(advisory.severity)) continue
  const id = advisory.url?.split("/").pop()
  const reason = exceptions.get(id)
  if (reason && advisory.severity !== "critical") {
    console.log(`Deployment exception ${id} (${advisory.module_name}): ${reason}`)
  } else {
    console.error(`${advisory.severity}: ${advisory.module_name}: ${advisory.title} (${advisory.url})`)
    blocked = true
  }
}
console.log(JSON.stringify(audit.metadata.vulnerabilities))
process.exit(blocked ? 1 : 0)
