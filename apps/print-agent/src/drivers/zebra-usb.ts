import * as fs from "fs";
import type { PrinterDriver, PrintJobPayload } from "./types";

/**
 * Thrown when the zebra-usb driver is asked to print a label kind it can't
 * handle directly (PDF). The Zebra ZD230 only understands raw ZPL over the
 * USB device path — PDFs need to be rasterized/spooled through CUPS instead.
 */
export class UnsupportedLabelKindError extends Error {
  constructor(kind: string) {
    super(
      `[print-agent] zebra-usb driver cannot print "${kind}" labels directly. ` +
        `Switch WMS_PRINT_DRIVER=cups (with a CUPS queue for this printer) to print PDF labels.`
    );
    this.name = "UnsupportedLabelKindError";
  }
}

/** Writes raw ZPL straight to the Zebra printer's USB device path. */
export class ZebraUsbDriver implements PrinterDriver {
  constructor(private readonly devicePath: string) {}

  async print(job: PrintJobPayload): Promise<void> {
    if (job.kind !== "zpl") {
      throw new UnsupportedLabelKindError(job.kind);
    }
    await fs.promises.writeFile(this.devicePath, job.content);
  }
}
