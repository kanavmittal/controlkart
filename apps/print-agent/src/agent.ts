import type { PrinterDriver, PrintJobPayload, LabelKind } from "./drivers/types";
import type { AgentConfig } from "./config";

export interface PollJob {
  id: string;
  label_url: string;
  shipment_id: string;
  attempts: number;
}

export interface PollResponse {
  jobs: PollJob[];
  shift_open: boolean;
}

/** Minimal shape of the global `fetch` this module relies on — kept narrow so tests can inject simple mocks. */
export type FetchFn = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

export type LogFn = (...args: unknown[]) => void;

export interface AgentDeps {
  fetchFn: FetchFn;
  driver: PrinterDriver;
  config: AgentConfig;
  sleep: (ms: number) => Promise<void>;
  log?: LogFn;
}

export interface CycleOutcome {
  ok: boolean;
  authOrConfigError: boolean;
}

/** Poll job limit — matches the backend's own default (cap is 20). */
export const POLL_LIMIT = 5;

/** Hard cap for exponential backoff on poll/network errors, and the fixed
 * retry interval used while the agent is misconfigured (401/503). */
export const MAX_BACKOFF_MS = 60_000;

const MAX_ERROR_MESSAGE_LENGTH = 500;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Looks at the first bytes of a downloaded label to decide how to print it.
 * PDFs start with the `%PDF` magic bytes; ZPL labels begin a format with
 * `^XA` (start-of-format), which — per the task contract — may appear
 * slightly after byte 0, so we scan a small window rather than requiring
 * an exact prefix match.
 */
export function sniffLabelKind(content: Buffer): LabelKind {
  const head = content.subarray(0, 32).toString("latin1");
  if (head.startsWith("%PDF")) {
    return "pdf";
  }
  if (head.includes("^XA")) {
    return "zpl";
  }
  throw new Error(
    `unrecognized label content — expected a PDF or ZPL label (first bytes: ${JSON.stringify(head.slice(0, 8))})`
  );
}

/**
 * The print agent poll/process loop. All I/O is injected (`fetchFn`,
 * `driver`, `sleep`) so the loop's control flow — backoff, error handling,
 * graceful shutdown — can be tested without a real network or printer.
 */
export class PrintAgent {
  private backoffMs: number;
  private stopping = false;
  private readonly log: LogFn;

  constructor(private readonly deps: AgentDeps) {
    this.backoffMs = deps.config.pollIntervalMs;
    this.log = deps.log ?? console.log;
  }

  /** Requests the loop stop after the current job (if any) finishes. */
  stop(): void {
    this.stopping = true;
  }

  get isStopping(): boolean {
    return this.stopping;
  }

  /** Runs until `stop()` is called. Never rejects — errors are logged and retried. */
  async run(): Promise<void> {
    while (!this.stopping) {
      const outcome = await this.pollAndProcessOnce();
      if (this.stopping) {
        break;
      }

      if (outcome.authOrConfigError) {
        this.log(
          `[print-agent] AUTH/CONFIG ERROR from backend — check WMS_PRINT_AGENT_TOKEN and that the ` +
            `backend has a print-agent token configured. The agent will keep retrying every ` +
            `${MAX_BACKOFF_MS / 1000}s; fix the environment and it will recover on its own.`
        );
        await this.deps.sleep(MAX_BACKOFF_MS);
        continue;
      }

      if (outcome.ok) {
        this.backoffMs = this.deps.config.pollIntervalMs;
        await this.deps.sleep(this.deps.config.pollIntervalMs);
      } else {
        const wait = this.backoffMs;
        this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
        await this.deps.sleep(wait);
      }
    }
  }

  /** One poll + process cycle. Exposed directly for tests. */
  async pollAndProcessOnce(): Promise<CycleOutcome> {
    const { fetchFn, config } = this.deps;

    let res: Awaited<ReturnType<FetchFn>>;
    try {
      res = await fetchFn(`${config.backendUrl}/wms/print-agent/poll`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-print-agent-token": config.printAgentToken,
        },
        body: JSON.stringify({ limit: POLL_LIMIT }),
      });
    } catch (err) {
      this.log(`[print-agent] poll network error: ${errorMessage(err)}`);
      return { ok: false, authOrConfigError: false };
    }

    if (res.status === 401 || res.status === 503) {
      const reason =
        res.status === 401
          ? "bad or missing WMS_PRINT_AGENT_TOKEN"
          : "backend has no print-agent token configured";
      this.log(`[print-agent] poll rejected with HTTP ${res.status} (${reason}).`);
      return { ok: false, authOrConfigError: true };
    }

    if (!res.ok) {
      this.log(`[print-agent] poll failed with HTTP ${res.status}`);
      return { ok: false, authOrConfigError: false };
    }

    let body: PollResponse;
    try {
      body = (await res.json()) as PollResponse;
    } catch (err) {
      this.log(`[print-agent] failed to parse poll response: ${errorMessage(err)}`);
      return { ok: false, authOrConfigError: false };
    }

    if (!body.shift_open) {
      this.log("[print-agent] shift closed — no jobs released this cycle.");
    }

    for (const job of body.jobs ?? []) {
      if (this.stopping) {
        break;
      }
      await this.processJob(job);
    }

    return { ok: true, authOrConfigError: false };
  }

  private async processJob(job: PollJob): Promise<void> {
    const { fetchFn, driver } = this.deps;
    try {
      const labelRes = await fetchFn(job.label_url);
      if (!labelRes.ok) {
        throw new Error(`label download failed with HTTP ${labelRes.status}`);
      }
      const arrayBuffer = await labelRes.arrayBuffer();
      const content = Buffer.from(arrayBuffer);
      const kind = sniffLabelKind(content);
      const payload: PrintJobPayload = { id: job.id, content, kind };

      await driver.print(payload);
      await this.ack(job.id, "done");
      this.log(`[print-agent] job ${job.id} printed (${kind}).`);
    } catch (err) {
      const message = errorMessage(err).slice(0, MAX_ERROR_MESSAGE_LENGTH);
      this.log(`[print-agent] job ${job.id} failed: ${message}`);
      try {
        await this.ack(job.id, "failed", message);
      } catch (ackErr) {
        this.log(
          `[print-agent] failed to ack job ${job.id} as failed: ${errorMessage(ackErr)}`
        );
      }
    }
  }

  private async ack(
    id: string,
    status: "done" | "failed",
    error?: string
  ): Promise<void> {
    const { fetchFn, config } = this.deps;
    await fetchFn(`${config.backendUrl}/wms/print-agent/jobs/${id}/ack`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-print-agent-token": config.printAgentToken,
      },
      body: JSON.stringify(error !== undefined ? { status, error } : { status }),
    });
  }
}
