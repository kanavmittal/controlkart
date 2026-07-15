import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "./models/supplier"
import Staff from "./models/staff"
import PurchaseOrder from "./models/purchase-order"
import PurchaseOrderLine from "./models/purchase-order-line"
import SerialUnit from "./models/serial-unit"
import Shipment from "./models/shipment"
import PackRecord from "./models/pack-record"
import PrintJob from "./models/print-job"
import ShiftConfig from "./models/shift-config"
import StockTakeSession from "./models/stock-take-session"
import AgentHeartbeat from "./models/agent-heartbeat"

class WmsModuleService extends MedusaService({
  Supplier,
  Staff,
  PurchaseOrder,
  PurchaseOrderLine,
  SerialUnit,
  Shipment,
  PackRecord,
  PrintJob,
  ShiftConfig,
  StockTakeSession,
  AgentHeartbeat,
}) {}

export default WmsModuleService
