import { model } from "@medusajs/framework/utils"

const Staff = model.define("staff", {
  id: model.id({ prefix: "wstf" }).primaryKey(),
  name: model.text(),
  email: model.text().unique("IDX_staff_email"),
  active: model.boolean().default(true),
})

export default Staff
