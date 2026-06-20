import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createPricePreferencesWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { SPECS_MODULE } from "../modules/specs"
import type SpecsModuleService from "../modules/specs/service"
import { DOCUMENTS_MODULE } from "../modules/documents"
import type DocumentsModuleService from "../modules/documents/service"

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[]
    store_id: string
  }) => {
    const normalizedInput = transform({ input }, (data) => ({
      selector: { id: data.input.store_id },
      update: {
        supported_currencies: data.input.supported_currencies.map((c) => ({
          currency_code: c.currency_code,
          is_default: c.is_default ?? false,
        })),
      },
    }))
    const stores = updateStoresStep(normalizedInput)
    return new WorkflowResponse(stores)
  }
)

export default async function seedControlKartData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  logger.info("Seeding ControlKart store data (India / INR)...")
  const [store] = await storeModuleService.listStores()
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "ControlKart Webstore",
  })

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: { salesChannelsData: [{ name: "ControlKart Webstore" }] },
    })
    defaultSalesChannel = salesChannelResult
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [{ currency_code: "inr", is_default: true }],
    },
  })

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_sales_channel_id: defaultSalesChannel[0].id },
    },
  })

  // Tax-inclusive INR pricing: storefront shows MRP, GST broken out at checkout
  await createPricePreferencesWorkflow(container).run({
    input: [
      { attribute: "currency_code", value: "inr", is_tax_inclusive: true },
    ],
  })

  logger.info("Seeding India region...")
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "India",
          currency_code: "inr",
          countries: ["in"],
          automatic_taxes: true,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  const region = regionResult[0]

  logger.info("Seeding GST tax region...")
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "in",
        provider_id: "tp_system",
        default_tax_rate: {
          name: "GST 18%",
          code: "GST18",
          rate: 18,
        },
      },
    ],
  })

  logger.info("Seeding stock location (Mumbai warehouse)...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "ControlKart Mumbai Warehouse",
          address: {
            address_1: "Plot 12, MIDC Industrial Area, Andheri East",
            city: "Mumbai",
            country_code: "IN",
            postal_code: "400093",
            province: "Maharashtra",
          },
        },
      ],
    },
  })
  const stockLocation = stockLocationResult[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: stockLocation.id },
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  logger.info("Seeding fulfillment data (pan-India)...")
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    shippingProfile = result[0]
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Pan-India Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: [{ country_code: "in", type: "country" }],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping (3-7 days)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Dispatch in 24-48 hrs, delivery in 3-7 working days.",
          code: "standard",
        },
        prices: [
          { currency_code: "inr", amount: 99 },
          { region_id: region.id, amount: 99 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Express Shipping (1-3 days)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Priority dispatch, delivery in 1-3 working days.",
          code: "express",
        },
        prices: [
          { currency_code: "inr", amount: 249 },
          { region_id: region.id, amount: 249 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [defaultSalesChannel[0].id] },
  })

  logger.info("Seeding publishable API key...")
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: { type: "publishable" },
  })
  let publishableApiKey = existingKeys?.[0]
  if (!publishableApiKey) {
    const {
      result: [created],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: "ControlKart Storefront", type: "publishable", created_by: "" },
        ],
      },
    })
    publishableApiKey = created as typeof publishableApiKey
  }
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [defaultSalesChannel[0].id] },
  })

  logger.info("Seeding customer groups (B2B tiers)...")
  await customerModuleService.createCustomerGroups([
    { name: "Retail" },
    { name: "Trade" },
    { name: "OEM / Panel Builder" },
  ])

  logger.info("Seeding product categories...")
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "PLCs",
          handle: "plcs",
          description:
            "Programmable Logic Controllers - modular and compact PLCs for industrial automation, machine control and process applications.",
          is_active: true,
        },
        { name: "HMIs", handle: "hmis", is_active: true },
        { name: "Timers & Counters", handle: "timers-counters", is_active: true },
        { name: "Energy Meters", handle: "energy-meters", is_active: true },
        { name: "VFDs", handle: "vfds", is_active: true },
        { name: "Power Supplies", handle: "power-supplies", is_active: true },
        {
          name: "Protection Devices",
          handle: "protection-devices",
          is_active: true,
        },
        {
          name: "PLC Accessories",
          handle: "plc-accessories",
          is_active: true,
        },
      ],
    },
  })
  const plcCategory = categoryResult.find((c) => c.name === "PLCs")!
  const accessoryCategory = categoryResult.find(
    (c) => c.name === "PLC Accessories"
  )!

  logger.info("Seeding Selec PLC products...")
  const { result: productResult } = await createProductsWorkflow(
    container
  ).run({
    input: {
      products: [
        {
          title: "Selec MiBRX 6M Sized Modular PLC",
          subtitle: "Rail Mount Modular PLC with 6 IO Slots",
          handle: "selec-mibrx-6m-modular-plc",
          category_ids: [plcCategory.id],
          description:
            "The Selec MiBRX 6M is a rail-mount modular PLC with 6 flexible IO card slots, RTC with time switch functions, and expansion via Modbus RTU. Multiple pluggable LED/LCD display options make it suitable for OEM machine builders, panel builders and process automation. Programmed via Windows-based SELPRO ladder software.",
          weight: 450,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            brand: "Selec",
            mpn: "MiBRX-6M",
            hsn_code: "8537",
            gst_rate: "18",
          },
          options: [
            {
              title: "Model",
              values: ["MiBRX-6M-1-1-1-230V", "MIBRX-6M-2-1-1-0-1-24VDC"],
            },
          ],
          variants: [
            {
              title: "230VAC Base - 6 Slots, 10+1 DI, 4RO, RTC, Master",
              sku: "MIBRX-6M-1-1-1-230V",
              options: { Model: "MiBRX-6M-1-1-1-230V" },
              manage_inventory: true,
              prices: [{ amount: 14160, currency_code: "inr" }],
            },
            {
              title:
                "24VDC Base - 6 Slots, 12 DI, Isolated PSU, Master, Ethernet, RTC",
              sku: "MIBRX-6M-2-1-1-0-1-24VDC",
              options: { Model: "MIBRX-6M-2-1-1-0-1-24VDC" },
              manage_inventory: true,
              prices: [{ amount: 16609, currency_code: "inr" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Selec MiBRX 6M Adapter Plate for Independent Display",
          handle: "selec-mibrx-dsp-ap-6m-adapter-plate",
          category_ids: [accessoryCategory.id],
          description:
            "Adapter plate that allows the MiBRX 6M display module to be mounted independently of the PLC base, for panel-door installations.",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            brand: "Selec",
            mpn: "MiBRX-DSP-AP-6M",
            hsn_code: "8538",
            gst_rate: "18",
          },
          options: [{ title: "Model", values: ["MiBRX-DSP-AP-6M"] }],
          variants: [
            {
              title: "MiBRX-DSP-AP-6M",
              sku: "MIBRX-DSP-AP-6M",
              options: { Model: "MiBRX-DSP-AP-6M" },
              manage_inventory: true,
              prices: [{ amount: 1584, currency_code: "inr" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Selec MiBRX 6M LCD Display Module (8x2)",
          handle: "selec-mibrx-dsp-6m-lcd-display",
          category_ids: [accessoryCategory.id],
          description:
            "Pluggable LCD display module for the MiBRX 6M modular PLC. 2 lines x 8 characters with blue backlight and 6 keys (5 user configurable).",
          weight: 120,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            brand: "Selec",
            mpn: "MiBRX-DSP-6M-8-2-08-A",
            hsn_code: "8538",
            gst_rate: "18",
          },
          options: [{ title: "Model", values: ["MiBRX-DSP-6M-8-2-08-A"] }],
          variants: [
            {
              title: "MiBRX-DSP-6M-8-2-08-A",
              sku: "MIBRX-DSP-6M-8-2-08-A",
              options: { Model: "MiBRX-DSP-6M-8-2-08-A" },
              manage_inventory: true,
              prices: [{ amount: 3066, currency_code: "inr" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  })
  const plcProduct = productResult.find(
    (p) => p.handle === "selec-mibrx-6m-modular-plc"
  )!

  logger.info("Seeding inventory levels...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })
  const stockBySku: Record<string, number> = {
    "MIBRX-6M-1-1-1-230V": 25,
    "MIBRX-6M-2-1-1-0-1-24VDC": 18,
    "MIBRX-DSP-AP-6M": 60,
    "MIBRX-DSP-6M-8-2-08-A": 42,
  }
  const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
    (item: any) => ({
      location_id: stockLocation.id,
      stocked_quantity: stockBySku[item.sku] ?? 10,
      inventory_item_id: item.id,
    })
  )
  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryLevels },
  })

  logger.info("Seeding spec schema and PLC spec values...")
  const specsService: SpecsModuleService = container.resolve(SPECS_MODULE)

  await specsService.createSpecGroups([
    { name: "Electrical", code: "electrical", display_order: 0 },
    { name: "Inputs / Outputs", code: "io", display_order: 1 },
    { name: "Communication", code: "communication", display_order: 2 },
    { name: "Memory & Processing", code: "memory", display_order: 3 },
    { name: "Mechanical", code: "mechanical", display_order: 4 },
    { name: "Compliance", code: "compliance", display_order: 5 },
  ])

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
  await specsService.createSpecAttributes(attributeDefs)

  await specsService.createCategorySpecTemplates(
    attributeDefs.map((attr, i) => ({
      category_id: plcCategory.id,
      attribute_code: attr.code,
      display_order: i,
    }))
  )

  const plcSpecs: { code: string; value: string; normalized?: number }[] = [
    { code: "supply_voltage", value: "230VAC / 24VDC" },
    { code: "digital_inputs", value: "10+1* / 12", normalized: 12 },
    { code: "analog_inputs", value: "1 V(0-10V) + As per IO Card Selection" },
    { code: "digital_outputs", value: "4 relay + As per IO card selection", normalized: 4 },
    { code: "analog_outputs", value: "As per IO Card Selection" },
    { code: "slots", value: "6", normalized: 6 },
    { code: "counting_frequency", value: "1 (5kHz) / 2 (5kHz)" },
    { code: "communication_interface", value: "RS485 Modbus RTU (Master-Slave), Ethernet (Slave), USB, CAN" },
    { code: "expansion", value: "Via Modbus RTU RS485" },
    { code: "code_memory", value: "240 KB" },
    { code: "data_memory", value: "1 MB" },
    { code: "rtc", value: "Yes" },
    { code: "display_type", value: "LED Display / LCD Display" },
    { code: "mounting_type", value: "DIN Rail" },
    { code: "dimensions", value: "70 x 90 x 66.4" },
    { code: "certification", value: "CE, RoHS" },
  ]
  await specsService.createSpecValues(
    plcSpecs.map((s) => ({
      product_id: plcProduct.id,
      attribute_code: s.code,
      value: s.value,
      normalized_value: s.normalized ?? null,
    }))
  )

  logger.info("Seeding product documents...")
  const documentsService: DocumentsModuleService =
    container.resolve(DOCUMENTS_MODULE)
  await documentsService.createProductDocuments([
    {
      product_id: plcProduct.id,
      title: "MiBRX-6M Datasheet",
      type: "datasheet" as const,
      file_url: "/downloads/MiBRX-6M_Datasheet.pdf",
      display_order: 0,
    },
    {
      product_id: plcProduct.id,
      title: "MiBRX-6M Instruction Manual",
      type: "manual" as const,
      file_url: "/downloads/MIBRX-6M_Instruction_Manual.pdf",
      display_order: 1,
    },
    {
      product_id: plcProduct.id,
      title: "MiBRX-6M CAD File",
      type: "cad" as const,
      file_url: "/downloads/MIBRX-6M_CAD.zip",
      display_order: 2,
    },
    {
      product_id: plcProduct.id,
      title: "MiBRX-6M CE / RoHS Certification",
      type: "certificate" as const,
      file_url: "/downloads/MIBRX-6M_Certification.pdf",
      display_order: 3,
    },
  ])


  logger.info("Finished seeding ControlKart data.")
  logger.info(
    `Publishable API key for storefront .env: ${(publishableApiKey as any).token ?? publishableApiKey.id}`
  )
}
