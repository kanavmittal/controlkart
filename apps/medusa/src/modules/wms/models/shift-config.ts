import { model } from "@medusajs/framework/utils"

const ShiftConfig = model.define("shift_config", {
  id: model.id({ prefix: "wsft" }).primaryKey(),
  /** 0-6 */
  weekday: model.number(),
  /** "HH:MM" */
  start_time: model.text(),
  /** "HH:MM" */
  end_time: model.text(),
  active: model.boolean().default(true),
})

export default ShiftConfig
