import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";
import type { PrinterDriver, PrintJobPayload } from "./types";

/**
 * Prints via the CUPS `lp` command. Handles both PDF and ZPL labels — CUPS
 * queues can be configured as raw passthrough for ZPL printers too, so this
 * driver works as a fallback for any label kind.
 */
export class CupsDriver implements PrinterDriver {
  constructor(private readonly printerName: string | undefined) {}

  async print(job: PrintJobPayload): Promise<void> {
    const tmpFile = path.join(
      os.tmpdir(),
      `print-agent-${job.id}.${job.kind}`
    );
    await fs.promises.writeFile(tmpFile, job.content);
    try {
      await this.runLp(tmpFile);
    } finally {
      await fs.promises.unlink(tmpFile).catch(() => {
        // best-effort cleanup; a stray temp file isn't fatal
      });
    }
  }

  private runLp(filePath: string): Promise<void> {
    const args = this.printerName
      ? ["-d", this.printerName, filePath]
      : [filePath];

    return new Promise((resolve, reject) => {
      const child = spawn("lp", args);
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", (err) => {
        reject(new Error(`[print-agent] Failed to spawn "lp": ${err.message}`));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `[print-agent] "lp" exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`
            )
          );
        }
      });
    });
  }
}
