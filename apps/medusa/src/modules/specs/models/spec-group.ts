import { model } from "@medusajs/framework/utils"

/** Logical grouping of attributes, e.g. Electrical, Inputs/Outputs, Communication, Mechanical, Compliance. */
const SpecGroup = model.define("spec_group", {
  id: model.id({ prefix: "spgrp" }).primaryKey(),
  name: model.text(),
  code: model.text().unique(),
  display_order: model.number().default(0),
})

export default SpecGroup
