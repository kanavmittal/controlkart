import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelShipmentWorkflow } from "../workflows/create-shipment"

/**
 * On order cancellation, cancels the wms side of the shipment: if a wms
 * `shipment` exists and isn't already `fulfilled`/`cancelled`, cancels the
 * Medusa fulfillment (defensively — the normal admin flow cancels the
 * fulfillment before the order itself can be canceled, so this is usually a
 * no-op there), marks the shipment `cancelled`, and marks its pending
 * `print_job` `failed`.
 *
 * Failures are logged loudly (with the order id) rather than swallowed.
 */
export default async function orderCanceledShipmentHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result } = await cancelShipmentWorkflow(container).run({
      input: { order_id: data.id },
    })

    if (result.skipped) {
      logger.info(
        `[wms] order ${data.id}: skipped shipment cancellation (no active wms shipment)`
      )
    } else {
      logger.info(
        `[wms] order ${data.id}: shipment ${result.shipment?.id} cancelled`
      )
    }
  } catch (error) {
    logger.error(
      `[wms] FAILED to cancel shipment for order ${data.id}: ${
        (error as Error).message
      }`,
      error as Error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
