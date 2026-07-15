import { defineRouteConfig } from "@medusajs/admin-sdk"
import { QueueList } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Tabs,
  Text,
  Tooltip,
  TooltipProvider,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch } from "../../lib/client"

type PrintJob = {
  id: string
  shipment_id: string | null
  label_url: string
  status: "pending" | "released" | "printing" | "done" | "failed"
  attempts: number
  released_at: string | null
  printed_at: string | null
  error: string | null
  created_at: string
  awb: string | null
  order_id: string | null
}

type AgentStatus = {
  last_seen: string | null
  state: "green" | "amber" | "red"
}

type PrintJobsResponse = {
  jobs: PrintJob[]
  count: number
  limit: number
  offset: number
  agent: AgentStatus
}

const STATUS_TABS = ["all", "pending", "released", "done", "failed"] as const
type StatusTab = (typeof STATUS_TABS)[number]

const STATUS_BADGE_COLOR: Record<
  PrintJob["status"],
  "grey" | "blue" | "orange" | "green" | "red"
> = {
  pending: "grey",
  released: "blue",
  printing: "orange",
  done: "green",
  failed: "red",
}

const AGENT_DOT_CLASS: Record<AgentStatus["state"], string> = {
  green: "bg-ui-tag-green-icon",
  amber: "bg-ui-tag-orange-icon",
  red: "bg-ui-tag-red-icon",
}

const relativeTime = (iso: string | null): string => {
  if (!iso) {
    return "never"
  }
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) {
    return "just now"
  }
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) {
    return "just now"
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

const formatTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString() : "—"

const PrintQueuePage = () => {
  const [tab, setTab] = useState<StatusTab>("all")
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [agent, setAgent] = useState<AgentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [reprintingId, setReprintingId] = useState<string | null>(null)
  const prompt = usePrompt()

  const refresh = useCallback(async (status: StatusTab) => {
    setLoading(true)
    try {
      const params = status === "all" ? "" : `?status=${status}`
      const data = await adminFetch<PrintJobsResponse>(
        `/admin/wms/print-jobs${params}`
      )
      setJobs(data.jobs)
      setAgent(data.agent)
    } catch {
      toast.error("Failed to load print jobs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(tab)
  }, [refresh, tab])

  const reprint = async (job: PrintJob) => {
    const confirmed = await prompt({
      title: "Reprint label?",
      description: `A new pending print job will be queued for ${
        job.awb ? `AWB ${job.awb}` : job.id
      }. The original job is kept for the audit trail.`,
      confirmText: "Reprint",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      return
    }
    setReprintingId(job.id)
    try {
      await adminFetch(`/admin/wms/print-jobs/${job.id}/reprint`, {
        method: "POST",
      })
      toast.success("Reprint queued")
      await refresh(tab)
    } catch {
      toast.error("Failed to queue reprint")
    } finally {
      setReprintingId(null)
    }
  }

  return (
    <TooltipProvider>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Print Queue</Heading>
          <div className="flex items-center gap-x-4">
            <div className="flex items-center gap-x-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  AGENT_DOT_CLASS[agent?.state ?? "red"]
                }`}
                aria-hidden
              />
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Agent last seen: {relativeTime(agent?.last_seen ?? null)}
              </Text>
            </div>
            <Button
              size="small"
              variant="secondary"
              onClick={() => refresh(tab)}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="px-6 py-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)}>
            <Tabs.List>
              {STATUS_TABS.map((status) => (
                <Tabs.Trigger key={status} value={status}>
                  {status === "all"
                    ? "All"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>

          <div className="mt-4">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>AWB</Table.HeaderCell>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Attempts</Table.HeaderCell>
                  <Table.HeaderCell>Released</Table.HeaderCell>
                  <Table.HeaderCell>Printed</Table.HeaderCell>
                  <Table.HeaderCell>Error</Table.HeaderCell>
                  <Table.HeaderCell />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {jobs.map((job) => (
                  <Table.Row key={job.id}>
                    <Table.Cell>
                      <StatusBadge color={STATUS_BADGE_COLOR[job.status]}>
                        {job.status}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell className="font-medium">
                      {job.awb ?? "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {job.order_id ?? "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{job.attempts}</Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {formatTime(job.released_at)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {formatTime(job.printed_at)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {job.error ? (
                        <Tooltip content={job.error}>
                          <span>
                            <Badge size="2xsmall" color="red">
                              {job.error.length > 24
                                ? `${job.error.slice(0, 24)}…`
                                : job.error}
                            </Badge>
                          </span>
                        </Tooltip>
                      ) : (
                        <Text size="small" className="text-ui-fg-subtle">
                          —
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={!job.label_url || reprintingId !== null}
                          isLoading={reprintingId === job.id}
                          onClick={() => reprint(job)}
                        >
                          Reprint
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
                {!jobs.length && (
                  <Table.Row>
                    <Table.Cell className="text-ui-fg-subtle">
                      {loading
                        ? "Loading print jobs…"
                        : tab === "all"
                          ? "No print jobs yet."
                          : `No ${tab} print jobs.`}
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
          </div>
        </div>
      </Container>
    </TooltipProvider>
  )
}

export const config = defineRouteConfig({
  label: "Print Queue",
  icon: QueueList,
})

export default PrintQueuePage
