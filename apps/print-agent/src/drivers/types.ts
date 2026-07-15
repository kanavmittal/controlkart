export type LabelKind = "pdf" | "zpl";

export interface PrintJobPayload {
  id: string;
  content: Buffer;
  kind: LabelKind;
}

export interface PrinterDriver {
  print(job: PrintJobPayload): Promise<void>;
}
