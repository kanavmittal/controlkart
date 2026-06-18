import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"

type ShiprocketOptions = {
  email: string
  password: string
  pickup_location: string
}

type InjectedDependencies = {
  logger: Logger
}

const SHIPROCKET_API = "https://apiv2.shiprocket.in/v1/external"

/**
 * Shiprocket fulfillment provider.
 *
 * Creates Shiprocket orders and AWBs when a fulfillment is created in Medusa,
 * and cancels them when the fulfillment is cancelled. Delhivery/BlueDart can
 * be added later as sibling providers without touching checkout logic.
 */
class ShiprocketFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shiprocket"

  protected options_: ShiprocketOptions
  protected logger_: Logger
  private token_: { value: string; expiresAt: number } | null = null

  constructor({ logger }: InjectedDependencies, options: ShiprocketOptions) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  private async getToken(): Promise<string> {
    if (this.token_ && this.token_.expiresAt > Date.now()) {
      return this.token_.value
    }
    const res = await fetch(`${SHIPROCKET_API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.options_.email,
        password: this.options_.password,
      }),
    })
    if (!res.ok) {
      throw new Error(`Shiprocket auth failed: ${res.status}`)
    }
    const data = (await res.json()) as { token: string }
    // Shiprocket tokens are valid for 10 days; refresh after 9
    this.token_ = {
      value: data.token,
      expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000,
    }
    return data.token
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const token = await this.getToken()
    const res = await fetch(`${SHIPROCKET_API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
    if (!res.ok) {
      throw new Error(
        `Shiprocket request ${path} failed (${res.status}): ${await res.text()}`
      )
    }
    return res.json()
  }

  async getFulfillmentOptions() {
    return [
      { id: "shiprocket-standard", name: "Shiprocket Standard" },
      { id: "shiprocket-express", name: "Shiprocket Express" },
    ]
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return ["shiprocket-standard", "shiprocket-express"].includes(
      data.id as string
    )
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return data
  }

  async canCalculate(): Promise<boolean> {
    // Flat shipping option prices defined in admin; serviceability-based
    // rate calculation can be enabled later via /courier/serviceability.
    return false
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Record<string, unknown>[],
    order: Record<string, any> | undefined,
    fulfillment: Record<string, any>
  ) {
    if (!order) {
      return { data, labels: [] }
    }

    const address = order.shipping_address ?? {}
    const payload = {
      order_id: order.display_id?.toString() ?? order.id,
      order_date: new Date(order.created_at ?? Date.now())
        .toISOString()
        .slice(0, 10),
      pickup_location: this.options_.pickup_location,
      billing_customer_name: address.first_name ?? "",
      billing_last_name: address.last_name ?? "",
      billing_address: address.address_1 ?? "",
      billing_address_2: address.address_2 ?? "",
      billing_city: address.city ?? "",
      billing_pincode: address.postal_code ?? "",
      billing_state: address.province ?? "",
      billing_country: "India",
      billing_email: order.email ?? "",
      billing_phone: address.phone ?? "",
      shipping_is_billing: true,
      order_items: items.map((item: Record<string, any>) => ({
        name: item.title,
        sku: item.sku ?? item.title,
        units: item.quantity,
        selling_price: item.unit_price ?? 0,
      })),
      payment_method: "Prepaid",
      sub_total: order.item_total ?? 0,
      length: 20,
      breadth: 15,
      height: 10,
      weight: 0.5,
    }

    try {
      const result = await this.request<{
        order_id: number
        shipment_id: number
      }>("/orders/create/adhoc", { method: "POST", body: payload })

      this.logger_.info(
        `Shiprocket order ${result.order_id} (shipment ${result.shipment_id}) created for ${order.id}`
      )
      return {
        data: {
          ...((fulfillment.data as object) ?? {}),
          shiprocket_order_id: result.order_id,
          shiprocket_shipment_id: result.shipment_id,
        },
        labels: [],
      }
    } catch (error) {
      this.logger_.error(`Shiprocket fulfillment failed: ${error}`)
      throw error
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<void> {
    const shiprocketOrderId = data.shiprocket_order_id
    if (!shiprocketOrderId) return
    await this.request("/orders/cancel", {
      method: "POST",
      body: { ids: [shiprocketOrderId] },
    })
  }

  async getFulfillmentDocuments(): Promise<never[]> {
    return []
  }

  async createReturnFulfillment(fulfillment: Record<string, unknown>) {
    return { data: fulfillment.data as Record<string, unknown>, labels: [] }
  }
}

export default ShiprocketFulfillmentService
