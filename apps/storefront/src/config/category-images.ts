/** Official Selec category photography; never used for product thumbnails. */
const categoryImages: Record<string, string> = {
  plcs: "plcs",
  "plc-accessories": "plc-accessories",
  "io-modules": "plc-accessories",
  "io-cards": "plc-accessories",
  "panel-mounted-plcs": "panel-mounted-plcs",
  "wall-mounted-plcs": "plcs",
  "rail-mounted-plcs": "plcs",
  "fixed-io-plcs": "fixed-io-plcs",
  "plc-displays": "plc-displays",
  hmis: "hmis",
  hmi: "hmis",
  vfds: "vfds",
  drives: "vfds",
  "timers-counters": "timers-counters",
  "digital-timers": "timers-counters",
  counters: "counters",
  "energy-meters": "energy-meters",
  "power-supplies": "power-supplies",
  "protection-devices": "protection-devices",
  "line-monitoring": "protection-devices",
  "relay-modules": "relay-modules",
  "motor-protection": "motor-protection",
  "earth-leakage": "earth-leakage",
  "temperature-controllers": "temperature-controllers",
  "panel-meters": "panel-meters",
  "digital-panel-meters": "panel-meters",
  "current-transformers": "current-transformers",
  "communication-accessories": "communication-accessories",
  "industrial-communication-accessories": "communication-accessories",
}

export function getCategoryImage(handle: string, parentHandle?: string): string | null {
  const key = categoryImages[handle.toLowerCase().replaceAll("_", "-")]
  if (key) return `/marketing/selec/${key}.jpg`
  // A child without dedicated photography inherits its known product family.
  return parentHandle ? getCategoryImage(parentHandle) : null
}
