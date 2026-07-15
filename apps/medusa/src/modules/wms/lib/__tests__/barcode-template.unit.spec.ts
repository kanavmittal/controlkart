import {
  parseScan,
  validateTemplate,
  BarcodeTemplateError,
  BarcodeTemplateErrorCode,
} from "../barcode-template"

describe("barcode-template", () => {
  describe("parseScan", () => {
    it("decodes a simple two-part sku|serial scan", () => {
      const result = parseScan("{sku}|{serial}", "|", "SKU1|SER1")
      expect(result).toEqual({ sku: "SKU1", serial: "SER1" })
    })

    it("decodes a sku-only template", () => {
      const result = parseScan("{sku}", "|", "SKU-ABC123")
      expect(result).toEqual({ sku: "SKU-ABC123" })
    })

    it("decodes a serial-only template", () => {
      const result = parseScan("{serial}", "|", "SER-XYZ789")
      expect(result).toEqual({ serial: "SER-XYZ789" })
    })

    it("matches a literal prefix segment", () => {
      const result = parseScan(
        "PRE|{sku}|{serial}",
        "|",
        "PRE|SKU1|SER1"
      )
      expect(result).toEqual({ sku: "SKU1", serial: "SER1" })
    })

    it("throws SCAN_MISMATCH when a literal segment doesn't match", () => {
      expect.assertions(2)
      try {
        parseScan("PRE|{sku}|{serial}", "|", "XXX|SKU1|SER1")
      } catch (err) {
        expect(err).toBeInstanceOf(BarcodeTemplateError)
        expect((err as BarcodeTemplateError).code).toBe(
          BarcodeTemplateErrorCode.SCAN_MISMATCH
        )
      }
    })

    it("throws SCAN_MISMATCH when the scan has too few segments", () => {
      expect.assertions(2)
      try {
        parseScan("{sku}|{serial}", "|", "SKU1")
      } catch (err) {
        expect(err).toBeInstanceOf(BarcodeTemplateError)
        expect((err as BarcodeTemplateError).code).toBe(
          BarcodeTemplateErrorCode.SCAN_MISMATCH
        )
      }
    })

    it("tail-folds one extra segment into the trailing placeholder", () => {
      const result = parseScan("{sku}|{serial}", "|", "SKU1|SER-A|B")
      expect(result).toEqual({ sku: "SKU1", serial: "SER-A|B" })
    })

    it("tail-folds multiple extra segments into the trailing placeholder", () => {
      const result = parseScan("{sku}|{serial}", "|", "SKU1|SER|A|B")
      expect(result).toEqual({ sku: "SKU1", serial: "SER|A|B" })
    })

    it("maps the whole raw string when there's no delimiter and a single placeholder", () => {
      const result = parseScan("{sku}", null, "ABC-123-XYZ")
      expect(result).toEqual({ sku: "ABC-123-XYZ" })
    })

    it("throws EMPTY_SCAN for an empty scanned string", () => {
      expect.assertions(2)
      try {
        parseScan("{sku}|{serial}", "|", "")
      } catch (err) {
        expect(err).toBeInstanceOf(BarcodeTemplateError)
        expect((err as BarcodeTemplateError).code).toBe(
          BarcodeTemplateErrorCode.EMPTY_SCAN
        )
      }
    })
  })

  describe("validateTemplate", () => {
    it("rejects a template with a duplicate placeholder and one with an unknown placeholder", () => {
      expect.assertions(4)

      try {
        validateTemplate("{sku}|{sku}", "|")
      } catch (err) {
        expect(err).toBeInstanceOf(BarcodeTemplateError)
        expect((err as BarcodeTemplateError).code).toBe(
          BarcodeTemplateErrorCode.TEMPLATE_INVALID
        )
      }

      try {
        validateTemplate("{foo}|{sku}", "|")
      } catch (err) {
        expect(err).toBeInstanceOf(BarcodeTemplateError)
        expect((err as BarcodeTemplateError).code).toBe(
          BarcodeTemplateErrorCode.TEMPLATE_INVALID
        )
      }
    })
  })
})
