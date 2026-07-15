import * as fs from "fs";
import * as path from "path";
import type { PrinterDriver, PrintJobPayload } from "./types";

/**
 * Dev/test driver: writes labels to `./out/<job id>.<pdf|zpl>` instead of a
 * real printer, and logs what would have been printed.
 */
export class MockDriver implements PrinterDriver {
  constructor(private readonly outDir: string = "./out") {}

  async print(job: PrintJobPayload): Promise<void> {
    await fs.promises.mkdir(this.outDir, { recursive: true });
    const filePath = path.join(this.outDir, `${job.id}.${job.kind}`);
    await fs.promises.writeFile(filePath, job.content);
    console.log(
      `[print-agent] [mock] wrote ${job.kind} label for job ${job.id} -> ${filePath} (${job.content.length} bytes)`
    );
  }
}
