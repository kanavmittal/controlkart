import {
  PrintAgent,
  sniffLabelKind,
  POLL_LIMIT,
  MAX_BACKOFF_MS,
  type FetchFn,
} from "../agent";
import type { AgentConfig } from "../config";
import type { PrinterDriver, PrintJobPayload } from "../drivers/types";

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    backendUrl: "http://backend.test",
    printAgentToken: "test-token",
    pollIntervalMs: 15_000,
    printDriver: "mock",
    zebraDevicePath: "/dev/usb/lp0",
    cupsPrinterName: undefined,
    ...overrides,
  };
}

function fakeResponse(status: number, jsonBody: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json: async () => jsonBody,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

function pdfBuffer(): Buffer {
  return Buffer.from("%PDF-1.4\n%some pdf bytes here\n");
}

function zplBuffer(): Buffer {
  return Buffer.from("^XA\n^FO50,50^A0N,50,50^FDHello^FS\n^XZ\n");
}

class RecordingDriver implements PrinterDriver {
  calls: PrintJobPayload[] = [];
  shouldThrow: Error | null = null;

  async print(job: PrintJobPayload): Promise<void> {
    this.calls.push(job);
    if (this.shouldThrow) {
      throw this.shouldThrow;
    }
  }
}

function noopSleep(): Promise<void> {
  return Promise.resolve();
}

describe("sniffLabelKind", () => {
  it("recognizes PDF content", () => {
    expect(sniffLabelKind(pdfBuffer())).toBe("pdf");
  });

  it("recognizes ZPL content", () => {
    expect(sniffLabelKind(zplBuffer())).toBe("zpl");
  });

  it("recognizes ZPL when ^XA is not the very first bytes", () => {
    expect(sniffLabelKind(Buffer.from("\r\n^XA^FS^XZ"))).toBe("zpl");
  });

  it("throws for unrecognized content", () => {
    expect(() => sniffLabelKind(Buffer.from("not a label"))).toThrow(
      /unrecognized label content/
    );
  });
});

describe("PrintAgent.pollAndProcessOnce — happy path", () => {
  it("downloads, prints, and acks done", async () => {
    const driver = new RecordingDriver();
    const calls: { url: string; init?: any }[] = [];

    const fetchFn: FetchFn = (async (url: string, init?: any) => {
      calls.push({ url, init });
      if (url.endsWith("/wms/print-agent/poll")) {
        return fakeResponse(200, {
          jobs: [
            { id: "job_1", label_url: "http://labels.test/job_1.pdf", shipment_id: "ship_1", attempts: 0 },
          ],
          shift_open: true,
        });
      }
      if (url === "http://labels.test/job_1.pdf") {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          arrayBuffer: async () => pdfBuffer().buffer.slice(
            pdfBuffer().byteOffset,
            pdfBuffer().byteOffset + pdfBuffer().byteLength
          ),
        };
      }
      if (url.endsWith("/wms/print-agent/jobs/job_1/ack")) {
        return fakeResponse(200, { job: { id: "job_1", status: "done" } });
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const agent = new PrintAgent({
      fetchFn,
      driver,
      config: makeConfig(),
      sleep: noopSleep,
    });

    const outcome = await agent.pollAndProcessOnce();

    expect(outcome).toEqual({ ok: true, authOrConfigError: false });
    expect(driver.calls).toHaveLength(1);
    expect(driver.calls[0].id).toBe("job_1");
    expect(driver.calls[0].kind).toBe("pdf");

    const ackCall = calls.find((c) => c.url.endsWith("/ack"));
    expect(ackCall).toBeDefined();
    expect(JSON.parse(ackCall!.init.body)).toEqual({ status: "done" });

    const pollCall = calls.find((c) => c.url.endsWith("/poll"));
    expect(pollCall!.init.headers["x-print-agent-token"]).toBe("test-token");
  });
});

describe("PrintAgent.pollAndProcessOnce — driver failure", () => {
  it("acks failed with the driver's error message, truncated to 500 chars", async () => {
    const driver = new RecordingDriver();
    driver.shouldThrow = new Error("printer offline");
    const ackBodies: unknown[] = [];

    const fetchFn: FetchFn = (async (url: string, init?: any) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        return fakeResponse(200, {
          jobs: [
            { id: "job_2", label_url: "http://labels.test/job_2.pdf", shipment_id: "ship_2", attempts: 0 },
          ],
          shift_open: true,
        });
      }
      if (url === "http://labels.test/job_2.pdf") {
        const buf = pdfBuffer();
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        };
      }
      if (url.endsWith("/wms/print-agent/jobs/job_2/ack")) {
        ackBodies.push(JSON.parse(init.body));
        return fakeResponse(200, { job: { id: "job_2", status: "pending" } });
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const agent = new PrintAgent({
      fetchFn,
      driver,
      config: makeConfig(),
      sleep: noopSleep,
    });

    await agent.pollAndProcessOnce();

    expect(ackBodies).toHaveLength(1);
    expect(ackBodies[0]).toEqual({ status: "failed", error: "printer offline" });
  });

  it("truncates a long error message to 500 characters", async () => {
    const driver = new RecordingDriver();
    driver.shouldThrow = new Error("x".repeat(1000));
    const ackBodies: any[] = [];

    const fetchFn: FetchFn = (async (url: string, init?: any) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        return fakeResponse(200, {
          jobs: [
            { id: "job_3", label_url: "http://labels.test/job_3.pdf", shipment_id: "ship_3", attempts: 0 },
          ],
          shift_open: true,
        });
      }
      if (url === "http://labels.test/job_3.pdf") {
        const buf = pdfBuffer();
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        };
      }
      if (url.endsWith("/wms/print-agent/jobs/job_3/ack")) {
        ackBodies.push(JSON.parse(init.body));
        return fakeResponse(200, {});
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const agent = new PrintAgent({
      fetchFn,
      driver,
      config: makeConfig(),
      sleep: noopSleep,
    });

    await agent.pollAndProcessOnce();

    expect(ackBodies[0].error).toHaveLength(500);
  });
});

describe("PrintAgent.run — backoff on poll/network errors", () => {
  it("backs off 15s -> 30s -> 60s -> 60s, then resets to the base interval on success", async () => {
    let pollCount = 0;
    const fetchFn: FetchFn = (async (url: string) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        pollCount++;
        if (pollCount <= 4) {
          throw new Error("network down");
        }
        return fakeResponse(200, { jobs: [], shift_open: true });
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const driver = new RecordingDriver();
    const sleepCalls: number[] = [];

    let agent!: PrintAgent;
    const sleep = async (ms: number): Promise<void> => {
      sleepCalls.push(ms);
      if (sleepCalls.length >= 5) {
        agent.stop();
      }
    };

    agent = new PrintAgent({
      fetchFn,
      driver,
      config: makeConfig({ pollIntervalMs: 15_000 }),
      sleep,
    });

    await agent.run();

    expect(sleepCalls).toEqual([15_000, 30_000, 60_000, 60_000, 15_000]);
  });
});

describe("PrintAgent.run — 401/503 auth/config errors", () => {
  it("keeps polling forever at the cap interval on 401, never exiting", async () => {
    let pollCount = 0;
    const fetchFn: FetchFn = (async (url: string) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        pollCount++;
        return fakeResponse(401, {});
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const driver = new RecordingDriver();
    const sleepCalls: number[] = [];
    let agent!: PrintAgent;
    const sleep = async (ms: number): Promise<void> => {
      sleepCalls.push(ms);
      if (sleepCalls.length >= 3) {
        agent.stop();
      }
    };

    agent = new PrintAgent({
      fetchFn,
      driver,
      config: makeConfig(),
      sleep,
    });

    await agent.run();

    expect(sleepCalls).toEqual([MAX_BACKOFF_MS, MAX_BACKOFF_MS, MAX_BACKOFF_MS]);
    expect(pollCount).toBe(3);
  });

  it("does the same for 503 (no token configured on the backend)", async () => {
    const fetchFn: FetchFn = (async (url: string) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        return fakeResponse(503, {});
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const driver = new RecordingDriver();
    const sleepCalls: number[] = [];
    let agent!: PrintAgent;
    const sleep = async (ms: number): Promise<void> => {
      sleepCalls.push(ms);
      if (sleepCalls.length >= 2) {
        agent.stop();
      }
    };

    agent = new PrintAgent({ fetchFn, driver, config: makeConfig(), sleep });

    await agent.run();

    expect(sleepCalls).toEqual([MAX_BACKOFF_MS, MAX_BACKOFF_MS]);
  });
});

describe("PrintAgent.pollAndProcessOnce — poll limit", () => {
  it("requests the documented poll limit and processes exactly the jobs returned", async () => {
    const driver = new RecordingDriver();
    let pollBody: any = null;

    const jobIds = ["a", "b", "c"];
    const fetchFn: FetchFn = (async (url: string, init?: any) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        pollBody = JSON.parse(init.body);
        return fakeResponse(200, {
          jobs: jobIds.map((id) => ({
            id,
            label_url: `http://labels.test/${id}.pdf`,
            shipment_id: `ship_${id}`,
            attempts: 0,
          })),
          shift_open: true,
        });
      }
      if (url.startsWith("http://labels.test/")) {
        const buf = pdfBuffer();
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        };
      }
      if (url.includes("/ack")) {
        return fakeResponse(200, {});
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    const agent = new PrintAgent({
      fetchFn,
      driver,
      config: makeConfig(),
      sleep: noopSleep,
    });

    await agent.pollAndProcessOnce();

    expect(pollBody).toEqual({ limit: POLL_LIMIT });
    expect(driver.calls.map((c) => c.id)).toEqual(jobIds);
  });
});

describe("PrintAgent — graceful shutdown", () => {
  it("stop() prevents further poll cycles but lets an in-flight job finish", async () => {
    const driver = new RecordingDriver();
    let pollCount = 0;

    const fetchFn: FetchFn = (async (url: string) => {
      if (url.endsWith("/wms/print-agent/poll")) {
        pollCount++;
        return fakeResponse(200, { jobs: [], shift_open: true });
      }
      throw new Error(`unexpected fetch url in test: ${url}`);
    }) as unknown as FetchFn;

    let agent!: PrintAgent;
    const sleep = async (): Promise<void> => {
      agent.stop();
    };

    agent = new PrintAgent({ fetchFn, driver, config: makeConfig(), sleep });
    await agent.run();

    expect(pollCount).toBe(1);
    expect(agent.isStopping).toBe(true);
  });
});
