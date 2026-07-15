/**
 * Environment configuration for the print agent.
 *
 * Required env vars fail fast with a clear message — this daemon runs
 * unattended on a Raspberry Pi, so a misconfiguration must be obvious from
 * the very first log line rather than surfacing as a cryptic runtime error.
 */

export type PrintDriverKind = "zebra-usb" | "cups" | "mock";

export interface AgentConfig {
  backendUrl: string;
  printAgentToken: string;
  pollIntervalMs: number;
  printDriver: PrintDriverKind;
  zebraDevicePath: string;
  cupsPrinterName: string | undefined;
}

const VALID_DRIVERS: PrintDriverKind[] = ["zebra-usb", "cups", "mock"];

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[print-agent] Missing required environment variable: ${key}. ` +
        `Set it in the environment file (see docs/print-agent-pi-setup.md) and restart.`
    );
  }
  return value;
}

function parsePositiveInt(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number
): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `[print-agent] Invalid value for ${key}: "${raw}". Expected a positive integer (milliseconds).`
    );
  }
  return parsed;
}

function parseDriver(env: NodeJS.ProcessEnv): PrintDriverKind {
  const raw = env.WMS_PRINT_DRIVER;
  if (raw === undefined || raw.trim() === "") {
    return "mock";
  }
  if (!VALID_DRIVERS.includes(raw as PrintDriverKind)) {
    throw new Error(
      `[print-agent] Invalid WMS_PRINT_DRIVER: "${raw}". Expected one of: ${VALID_DRIVERS.join(", ")}.`
    );
  }
  return raw as PrintDriverKind;
}

/** Reads and validates the agent configuration from `env` (defaults to process.env). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  return {
    backendUrl: requireEnv(env, "WMS_BACKEND_URL").replace(/\/+$/, ""),
    printAgentToken: requireEnv(env, "WMS_PRINT_AGENT_TOKEN"),
    pollIntervalMs: parsePositiveInt(env, "POLL_INTERVAL_MS", 15_000),
    printDriver: parseDriver(env),
    zebraDevicePath: env.ZEBRA_DEVICE_PATH?.trim() || "/dev/usb/lp0",
    cupsPrinterName: env.CUPS_PRINTER_NAME?.trim() || undefined,
  };
}
