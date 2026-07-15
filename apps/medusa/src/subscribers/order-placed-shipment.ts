import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createShipmentWorkflow } from "../workflows/create-shipment"

/**
 * On order placement, creates the Medusa fulfillment for orders on the
 * Shiprocket shipping method (which triggers the Shiprocket plugin's
 * provider — order + AWB + label — and deducts stock), then records a wms
 * `shipment` row and enqueues its `print_job`.
 *
 * Orders on non-Shiprocket shipping methods skip cleanly (the workflow's own
 * guard). The workflow is idempotent, so a re-delivered event is safe.
 *
 * Failures are logged loudly (with the order id) rather than swallowed —
 * a failed shipment/print_job means a placed order that will never get
 * picked, so this must be visible in logs/alerts, not silently dropped.
 */
export default async function orderPlacedShipmentHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result } = await createShipmentWorkflow(container).run({
      input: { order_id: data.id },
    })

    if (result.skipped) {
      logger.info(
        `[wms] order ${data.id}: skipped shipment creation (no Shiprocket shipping method)`
      )
    } else {
      logger.info(
        `[wms] order ${data.id}: shipment ${result.shipment?.id} ready (awb=${
          result.shipment?.awb ?? "none"
        })`
      )
    }
  } catch (error) {
    logger.error(
      `[wms] FAILED to create shipment for order ${data.id}: ${
        (error as Error).message
      }`,
      error as Error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
