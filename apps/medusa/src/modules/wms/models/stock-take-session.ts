import { model } from "@medusajs/framework/utils"

const StockTakeSession = model
  .define("stock_take_session", {
    id: model.id({ prefix: "wsts" }).primaryKey(),
    session_id: model.text(),
    staff_id: model.text(),
    serial_count: model.number(),
  })
  .indexes([
    {
      name: "IDX_stock_take_session_session_id",
      on: ["session_id"],
      unique: true,
    },
  ])

export default StockTakeSession
