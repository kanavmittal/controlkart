import {
  CarrierError,
  ShiprocketCarrier,
  ShiprocketClientLike,
} from "../carrier"

/** Shape of the `MedusaError` the plugin's `handleError` helper throws,
 * reproduced here (not imported) so this spec has zero framework/plugin
 * dependencies and zero network calls. */
function fakeMedusaError(type: string, message: string) {
  return Object.assign(new Error(message), {
    __isMedusaError: true,
    type,
    message,
  })
}

function makeMockClient(
  overrides: Partial<jest.Mocked<ShiprocketClientLike>> = {}
): jest.Mocked<ShiprocketClientLike> {
  return {
    cancel: jest.fn().mockResolvedValue(undefined),
    schedulePickup: jest.fn().mockResolvedValue(true),
    generateLabel: jest.fn().mockResolvedValue("https://labels.example/label.pdf"),
    ...overrides,
  }
}

describe("ShiprocketCarrier", () => {
  describe("schedulePickup", () => {
    it("delegates to client.schedulePickup with the shipment id and pickup date", async () => {
      const client = makeMockClient()
      const carrier = new ShiprocketCarrier(client)
      const pickupDate = new Date("2026-07-12T00:00:00.000Z")

      const result = await carrier.schedulePickup({ shipmentId: "shp_123", pickupDate })

      expect(result).toBe(true)
      expect(client.schedulePickup).toHaveBeenCalledTimes(1)
      expect(client.schedulePickup).toHaveBeenCalledWith("shp_123", pickupDate)
    })

    it("delegates with an undefined date when none is given", async () => {
      const client = makeMockClient()
      const carrier = new ShiprocketCarrier(client)

      await carrier.schedulePickup({ shipmentId: "shp_123" })

      expect(client.schedulePickup).toHaveBeenCalledWith("shp_123", undefined)
    })

    it("throws CarrierError REQUEST_FAILED when the client reports a soft failure (returns false)", async () => {
      expect.assertions(2)
      const client = makeMockClient({ schedulePickup: jest.fn().mockResolvedValue(false) })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.schedulePickup({ shipmentId: "shp_123" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("REQUEST_FAILED")
      }
    })

    it("surfaces a Shiprocket auth failure as CarrierError AUTH_FAILED", async () => {
      expect.assertions(3)
      const client = makeMockClient({
        schedulePickup: jest
          .fn()
          .mockRejectedValue(fakeMedusaError("unauthorized", "Shiprocket authentication failed.")),
      })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.schedulePickup({ shipmentId: "shp_123" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("AUTH_FAILED")
        expect((err as CarrierError).message).toBe("Shiprocket authentication failed.")
      }
    })

    it("surfaces a non-auth Shiprocket error as CarrierError REQUEST_FAILED", async () => {
      expect.assertions(3)
      const client = makeMockClient({
        schedulePickup: jest
          .fn()
          .mockRejectedValue(fakeMedusaError("invalid_data", "Invalid shipment id.")),
      })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.schedulePickup({ shipmentId: "shp_123" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("REQUEST_FAILED")
        expect((err as CarrierError).message).toBe("Invalid shipment id.")
      }
    })

    it("surfaces an arbitrary thrown error as CarrierError REQUEST_FAILED", async () => {
      expect.assertions(2)
      const client = makeMockClient({
        schedulePickup: jest.fn().mockRejectedValue(new Error("socket hang up")),
      })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.schedulePickup({ shipmentId: "shp_123" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("REQUEST_FAILED")
      }
    })

    it("throws CarrierError NOT_CONFIGURED when no client is injected, without touching a client", async () => {
      expect.assertions(2)
      const carrier = new ShiprocketCarrier(null)

      try {
        await carrier.schedulePickup({ shipmentId: "shp_123" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("NOT_CONFIGURED")
      }
    })
  })

  describe("cancel", () => {
    it("delegates to client.cancel with the Shiprocket order id", async () => {
      const client = makeMockClient()
      const carrier = new ShiprocketCarrier(client)

      await carrier.cancel("sr_order_456")

      expect(client.cancel).toHaveBeenCalledTimes(1)
      expect(client.cancel).toHaveBeenCalledWith("sr_order_456")
    })

    it("surfaces a Shiprocket auth failure as CarrierError AUTH_FAILED", async () => {
      expect.assertions(2)
      const client = makeMockClient({
        cancel: jest.fn().mockRejectedValue(fakeMedusaError("unauthorized", "bad token")),
      })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.cancel("sr_order_456")
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("AUTH_FAILED")
      }
    })

    it("surfaces a non-auth Shiprocket error as CarrierError REQUEST_FAILED", async () => {
      expect.assertions(2)
      const client = makeMockClient({
        cancel: jest.fn().mockRejectedValue(fakeMedusaError("not_found", "Order not found.")),
      })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.cancel("sr_order_456")
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("REQUEST_FAILED")
      }
    })

    it("throws CarrierError NOT_CONFIGURED when no client is injected, without touching a client", async () => {
      expect.assertions(2)
      const carrier = new ShiprocketCarrier(null)

      try {
        await carrier.cancel("sr_order_456")
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("NOT_CONFIGURED")
      }
    })
  })

  describe("getLabel", () => {
    it("delegates to client.generateLabel with the shipment id and returns the label URL", async () => {
      const client = makeMockClient({
        generateLabel: jest.fn().mockResolvedValue("https://labels.example/abc.pdf"),
      })
      const carrier = new ShiprocketCarrier(client)

      const url = await carrier.getLabel({ shipmentId: "shp_789" })

      expect(url).toBe("https://labels.example/abc.pdf")
      expect(client.generateLabel).toHaveBeenCalledTimes(1)
      expect(client.generateLabel).toHaveBeenCalledWith({ shipment_id: "shp_789" })
    })

    it("throws CarrierError REQUEST_FAILED when the client reports a soft failure (returns empty string)", async () => {
      expect.assertions(2)
      const client = makeMockClient({ generateLabel: jest.fn().mockResolvedValue("") })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.getLabel({ shipmentId: "shp_789" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("REQUEST_FAILED")
      }
    })

    it("surfaces a Shiprocket auth failure as CarrierError AUTH_FAILED", async () => {
      expect.assertions(2)
      const client = makeMockClient({
        generateLabel: jest.fn().mockRejectedValue(fakeMedusaError("unauthorized", "bad token")),
      })
      const carrier = new ShiprocketCarrier(client)

      try {
        await carrier.getLabel({ shipmentId: "shp_789" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("AUTH_FAILED")
      }
    })

    it("throws CarrierError NOT_CONFIGURED when no client is injected, without touching a client", async () => {
      expect.assertions(2)
      const carrier = new ShiprocketCarrier(null)

      try {
        await carrier.getLabel({ shipmentId: "shp_789" })
      } catch (err) {
        expect(err).toBeInstanceOf(CarrierError)
        expect((err as CarrierError).code).toBe("NOT_CONFIGURED")
      }
    })
  })
})
