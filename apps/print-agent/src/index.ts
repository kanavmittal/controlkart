import { loadConfig } from "./config";
import { PrintAgent } from "./agent";
import type { PrinterDriver } from "./drivers/types";
import { ZebraUsbDriver } from "./drivers/zebra-usb";
import { CupsDriver } from "./drivers/cups";
import { MockDriver } from "./drivers/mock";

function buildDriver(
  config: ReturnType<typeof loadConfig>
): PrinterDriver {
  switch (config.printDriver) {
    case "zebra-usb":
      return new ZebraUsbDriver(config.zebraDevicePath);
    case "cups":
      return new CupsDriver(config.cupsPrinterName);
    case "mock":
      return new MockDriver();
  }
}

/** setTimeout-based sleep that can be interrupted early (used for prompt SIGTERM/SIGINT shutdown). */
function createInterruptibleSleep() {
  let cancel: (() => void) | null = null;

  const sleep = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        cancel = null;
        resolve();
      }, ms);
      cancel = () => {
        clearTimeout(timer);
        cancel = null;
        resolve();
      };
    });

  const interrupt = (): void => cancel?.();

  return { sleep, interrupt };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const driver = buildDriver(config);
  const { sleep, interrupt } = createInterruptibleSleep();

  // Never log printAgentToken.
  console.log(
    `[print-agent] starting — backendUrl=${config.backendUrl} driver=${config.printDriver} ` +
      `pollIntervalMs=${config.pollIntervalMs} zebraDevicePath=${config.zebraDevicePath} ` +
      `cupsPrinterName=${config.cupsPrinterName ?? "(default)"}`
  );

  const agent = new PrintAgent({
    fetchFn: fetch as unknown as import("./agent").FetchFn,
    driver,
    config,
    sleep,
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(
      `[print-agent] received ${signal} — finishing in-flight job, then exiting.`
    );
    agent.stop();
    interrupt();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await agent.run();
  console.log("[print-agent] stopped.");
  process.exit(0);
}

main().catch((err) => {
  console.error(
    `[print-agent] fatal startup error: ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
});
