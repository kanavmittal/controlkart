import { model } from "@medusajs/framework/utils"

/**
 * Tracks the last time the print agent polled, regardless of whether the
 * shift window was open (poll always records a heartbeat). Single row per
 * agent_id — the print agent always polls as "default" for now, but the
 * column is kept generic in case multiple agents are introduced later.
 */
const AgentHeartbeat = model.define("agent_heartbeat", {
  id: model.id({ prefix: "wagh" }).primaryKey(),
  agent_id: model.text().unique("IDX_agent_heartbeat_agent_id"),
  last_seen: model.dateTime(),
})

export default AgentHeartbeat
