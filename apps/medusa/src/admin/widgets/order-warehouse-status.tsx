import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { TriangleDownMini, TriangleRightMini } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/client"

type StaffRef = { id: string; name: string | null }

type WarehouseShipment = {
  id: string
  status: string
  awb: string | null
  courier: string | null
  label_url: string | null
  tracking: {
    status: string | null
    raw_status: string | null
    courier_name: string | null
  } | null
  items: {
    variant_id: string
    sku: string | null
    title: string | null
    serials: { serial: string; picked_at: string; received_by: StaffRef | null }[]
  }[]
  pack_photo: {
    photo_url: string
    packed_at: string | null
    packed_by: StaffRef | null
  } | null
  timeline: { at: string; event: string }[]
}

const STATUS_BADGE: Record<
  string,
  { label: string; color: "grey" | "blue" | "orange" | "purple" | "green" | "red" }
> = {
  pending: { label: "Pending", color: "grey" },
  label_ready: { label: "Label ready", color: "blue" },
  picked: { label: "Picked", color: "orange" },
  packed: { label: "Packed", color: "purple" },
  fulfilled: { label: "Fulfilled", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
}

const TRACKING_LABEL: Record<string, string> = {
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rto: "RTO",
  cancelled: "Cancelled",
  exception: "Exception",
}

const EVENT_LABEL: Record<string, string> = {
  label_ready: "Label ready",
  picking_started: "Picking started",
  picking_completed: "Picking completed",
  packed: "Packed",
  fulfilled: "Fulfilled",
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—"
  }
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function PickedItem({
  item,
}: {
  item: WarehouseShipment["items"][number]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-ui-border-base">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-ui-bg-base-hover"
      >
        <span className="flex min-w-0 items-center gap-2">
          {open ? <TriangleDownMini /> : <TriangleRightMini />}
          <span className="truncate">
            <Text size="small" leading="compact" weight="plus" as="span">
              {item.sku ?? item.variant_id}
            </Text>
            {item.title ? (
              <Text
                size="small"
                leading="compact"
                as="span"
                className="text-ui-fg-subtle"
              >
                {" "}
                · {item.title}
              </Text>
            ) : null}
          </span>
        </span>
        <Badge size="2xsmall" color="grey">
          {item.serials.length} serial{item.serials.length === 1 ? "" : "s"}
        </Badge>
      </button>
      {open ? (
        <div className="flex flex-col gap-1 border-t border-ui-border-base px-3 py-2">
          {item.serials.map((s) => (
            <div
              key={s.serial}
              className="flex items-center justify-between gap-2"
            >
              <Text size="small" leading="compact" className="font-mono">
                {s.serial}
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                picked {formatDateTime(s.picked_at)}
              </Text>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * J1 — warehouse status on the order detail page. Renders ONLY when the
 * order has a wms shipment; orders outside the warehouse flow show nothing.
 */
const OrderWarehouseStatusWidget = ({
  data,
}: DetailWidgetProps<AdminOrder>) => {
  const [shipment, setShipment] = useState<WarehouseShipment | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminFetch<{ shipment: WarehouseShipment | null }>(
      `/admin/wms/orders/${data.id}/warehouse`
    )
      .then((res) => {
        if (!cancelled) {
          setShipment(res.shipment)
          setLoaded(true)
        }
      })
      .catch(() => {
        // Silent: no shipment (or a read failure) simply hides the widget.
        if (!cancelled) {
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [data.id])

  if (!loaded || !shipment) {
    return null
  }

  const statusBadge =
    STATUS_BADGE[shipment.status] ?? { label: shipment.status, color: "grey" as const }
  const trackingLabel = shipment.tracking?.status
    ? TRACKING_LABEL[shipment.tracking.status] ?? shipment.tracking.status
    : null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Warehouse</Heading>
        <Badge size="2xsmall" color={statusBadge.color}>
          {statusBadge.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex items-center justify-between gap-2">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            AWB
          </Text>
          <Text size="small" leading="compact" className="text-right font-mono">
            {shipment.awb ?? "—"}
            {shipment.courier ? (
              <span className="font-sans text-ui-fg-subtle">
                {" "}
                · {shipment.courier}
              </span>
            ) : null}
          </Text>
        </div>

        {trackingLabel ? (
          <div className="flex items-center justify-between gap-2">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Tracking
            </Text>
            <Badge size="2xsmall" color="blue">
              {trackingLabel}
            </Badge>
          </div>
        ) : null}

        {shipment.pack_photo ? (
          <div className="flex items-center justify-between gap-2">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Pack photo
            </Text>
            <a
              href={shipment.pack_photo.photo_url}
              target="_blank"
              rel="noreferrer"
              title="Open pack photo in a new tab"
            >
              <img
                src={shipment.pack_photo.photo_url}
                alt="Pack photo"
                className="h-12 w-12 rounded-md border border-ui-border-base object-cover"
              />
            </a>
          </div>
        ) : null}

        {shipment.pack_photo ? (
          <div className="flex items-center justify-between gap-2">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Packed by
            </Text>
            <Text size="small" leading="compact">
              {shipment.pack_photo.packed_by?.name ??
                shipment.pack_photo.packed_by?.id ??
                "—"}{" "}
              <span className="text-ui-fg-subtle">
                {formatDateTime(shipment.pack_photo.packed_at)}
              </span>
            </Text>
          </div>
        ) : null}
      </div>

      {shipment.items.length ? (
        <div className="flex flex-col gap-2 px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            Picked serials
          </Text>
          {shipment.items.map((item) => (
            <PickedItem key={item.variant_id} item={item} />
          ))}
        </div>
      ) : null}

      {shipment.timeline.length ? (
        <div className="flex flex-col gap-1.5 px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            Timeline
          </Text>
          {shipment.timeline.map((event, index) => (
            <div
              key={`${event.event}-${index}`}
              className="flex items-center justify-between gap-2"
            >
              <Text size="small" leading="compact">
                {EVENT_LABEL[event.event] ?? event.event}
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {formatDateTime(event.at)}
              </Text>
            </div>
          ))}
        </div>
      ) : null}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderWarehouseStatusWidget
