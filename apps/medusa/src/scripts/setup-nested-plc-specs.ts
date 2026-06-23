import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { SPECS_MODULE } from "../modules/specs"
import type SpecsModuleService from "../modules/specs/service"

/**
 * Idempotent prod setup for the nested-PLC spec demo. The dev seed never runs
 * in prod, so this script brings an existing prod database up to the nested
 * structure WITHOUT wiping anything:
 *   - ensures the spec catalogue (groups + attributes) exists
 *   - creates the "Panel-mounted PLCs" / "Wall-mounted PLCs" sub-categories
 *     under the existing "PLCs" category (only if missing)
 *   - sets the per-level spec templates (common on PLCs, specifics on children)
 *   - moves the MiBRX demo product into the panel sub-category (if present)
 *
 * Safe to re-run. Run with:  npx medusa exec ./src/scripts/setup-nested-plc-specs.ts
 */
export default async function setupNestedPlcSpecs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const specsService: SpecsModuleService = container.resolve(SPECS_MODULE)

  // --- 1. Ensure the spec catalogue (groups + attributes) -------------------
  const groupDefs = [
    { name: "Electrical", code: "electrical", display_order: 0 },
    { name: "Inputs / Outputs", code: "io", display_order: 1 },
    { name: "Communication", code: "communication", display_order: 2 },
    { name: "Memory & Processing", code: "memory", display_order: 3 },
    { name: "Mechanical", code: "mechanical", display_order: 4 },
    { name: "Compliance", code: "compliance", display_order: 5 },
  ]
  const attributeDefs = [
    { name: "Supply Voltage", code: "supply_voltage", group_code: "electrical", display_order: 0, is_filterable: true },
    { name: "Digital Inputs", code: "digital_inputs", group_code: "io", display_order: 0, is_filterable: true },
    { name: "Analog Inputs", code: "analog_inputs", group_code: "io", display_order: 1 },
    { name: "Digital Outputs", code: "digital_outputs", group_code: "io", display_order: 2 },
    { name: "Analog Outputs", code: "analog_outputs", group_code: "io", display_order: 3 },
    { name: "Number of Slots", code: "slots", group_code: "io", display_order: 4, is_filterable: true },
    { name: "Max Counting Frequency", code: "counting_frequency", group_code: "io", display_order: 5 },
    { name: "Communication Interface", code: "communication_interface", group_code: "communication", display_order: 0, is_filterable: true },
    { name: "Expansion", code: "expansion", group_code: "communication", display_order: 1 },
    { name: "Code Memory", code: "code_memory", group_code: "memory", display_order: 0 },
    { name: "Data Memory", code: "data_memory", group_code: "memory", display_order: 1 },
    { name: "RTC with Time Switch", code: "rtc", group_code: "memory", display_order: 2 },
    { name: "Display Type", code: "display_type", group_code: "mechanical", display_order: 0 },
    { name: "Mounting Type", code: "mounting_type", group_code: "mechanical", display_order: 1, is_filterable: true },
    { name: "Dimensions (W x H x D)", code: "dimensions", group_code: "mechanical", display_order: 2, unit: "mm" },
    { name: "Certification", code: "certification", group_code: "compliance", display_order: 0, is_filterable: true },
  ]

  const existingGroups = await specsService.listSpecGroups({})
  const existingGroupCodes = new Set(existingGroups.map((g) => g.code))
  const missingGroups = groupDefs.filter((g) => !existingGroupCodes.has(g.code))
  if (missingGroups.length) {
    await specsService.createSpecGroups(missingGroups)
    logger.info(`Created ${missingGroups.length} spec group(s).`)
  }

  const existingAttrs = await specsService.listSpecAttributes({})
  const existingAttrCodes = new Set(existingAttrs.map((a) => a.code))
  const missingAttrs = attributeDefs.filter(
    (a) => !existingAttrCodes.has(a.code)
  )
  if (missingAttrs.length) {
    await specsService.createSpecAttributes(missingAttrs)
    logger.info(`Created ${missingAttrs.length} spec attribute(s).`)
  }

  // --- 2. Resolve the PLCs parent category ----------------------------------
  const { data: plcMatches } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
    filters: { handle: "plcs" },
  })
  const plc = plcMatches[0] as { id: string } | undefined
  if (!plc) {
    logger.error(
      'No category with handle "plcs" found — create it first, then re-run.'
    )
    return
  }

  // --- 3. Create the sub-categories if missing ------------------------------
  const childDefs = [
    {
      name: "Panel-mounted PLCs",
      handle: "panel-mounted-plcs",
      description:
        "Modular panel / DIN-rail mounted PLCs with expandable IO slots for cabinet installation.",
    },
    {
      name: "Wall-mounted PLCs",
      handle: "wall-mounted-plcs",
      description:
        "Compact wall-mounted PLCs for distributed control and standalone machines.",
    },
  ]

  const { data: existingChildren } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: childDefs.map((c) => c.handle) },
  })
  const childIdByHandle = new Map<string, string>(
    existingChildren.map((c: { handle: string; id: string }) => [c.handle, c.id])
  )

  const toCreate = childDefs.filter((c) => !childIdByHandle.has(c.handle))
  if (toCreate.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: toCreate.map((c) => ({
          name: c.name,
          handle: c.handle,
          description: c.description,
          parent_category_id: plc.id,
          is_active: true,
        })),
      },
    })
    for (const c of result) {
      childIdByHandle.set(c.handle, c.id)
    }
    logger.info(`Created ${result.length} sub-category(ies) under PLCs.`)
  }

  const panelId = childIdByHandle.get("panel-mounted-plcs")!
  const wallId = childIdByHandle.get("wall-mounted-plcs")!

  // --- 4. Set per-level spec templates (replace for these 3 categories) -----
  const commonCodes = [
    "supply_voltage",
    "communication_interface",
    "expansion",
    "code_memory",
    "data_memory",
    "rtc",
    "certification",
  ]
  const panelCodes = [
    "slots",
    "digital_inputs",
    "analog_inputs",
    "digital_outputs",
    "analog_outputs",
    "counting_frequency",
    "display_type",
    "mounting_type",
    "dimensions",
  ]
  const wallCodes = [
    "digital_inputs",
    "digital_outputs",
    "display_type",
    "mounting_type",
    "dimensions",
  ]

  const targetCategoryIds = [plc.id, panelId, wallId]
  const existingTemplates = await specsService.listCategorySpecTemplates({
    category_id: targetCategoryIds,
  })
  if (existingTemplates.length) {
    await specsService.deleteCategorySpecTemplates(
      existingTemplates.map((t) => t.id)
    )
  }
  const rows = (categoryId: string, codes: string[]) =>
    codes.map((code, i) => ({
      category_id: categoryId,
      attribute_code: code,
      display_order: i,
    }))
  await specsService.createCategorySpecTemplates([
    ...rows(plc.id, commonCodes),
    ...rows(panelId, panelCodes),
    ...rows(wallId, wallCodes),
  ])
  logger.info("Spec templates set: common on PLCs, specifics on children.")

  // --- 5. Move the MiBRX demo product into the panel sub-category -----------
  const { data: productMatches } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id"],
    filters: { handle: "selec-mibrx-6m-modular-plc" },
  })
  const product = productMatches[0] as
    | { id: string; categories?: { id: string }[] }
    | undefined
  if (!product) {
    logger.info(
      "MiBRX product not found by handle — skipping product reassignment."
    )
  } else {
    const alreadyPanel =
      (product.categories ?? []).length === 1 &&
      product.categories?.[0]?.id === panelId
    if (alreadyPanel) {
      logger.info("MiBRX product already in Panel-mounted PLCs — no change.")
    } else {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: product.id },
          update: { category_ids: [panelId] },
        },
      })
      logger.info("Moved MiBRX product into Panel-mounted PLCs.")
    }
  }

  logger.info("Nested-PLC spec setup complete.")
}
