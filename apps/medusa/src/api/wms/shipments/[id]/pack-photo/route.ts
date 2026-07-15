import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { IFileModuleService } from "@medusajs/framework/types"
import { WMS_MODULE } from "../../../../../modules/wms"
import type WmsModuleService from "../../../../../modules/wms/service"
import { validateBody } from "../../../../../workflows/create-purchase-order"

const PackPhotoBodySchema = z.object({
  image_base64: z.string(),
  mime_type: z.enum(["image/jpeg", "image/png"]),
})

/** Decoded-content cap. The client resizes photos to <=1600px before
 * upload, so legitimate payloads stay well under this — this exists to
 * reject abuse/mistakes, not to constrain normal use. */
const MAX_DECODED_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
}

/**
 * H7 step 2 of pack/ship: stores the packer's photo of the packed box via
 * the File module and records a `pack_record`. Requires AWB verification
 * (verify-awb) to have already happened on this shipment — photographing the
 * box comes after confirming the right label is on it, not before. One
 * photo per shipment: re-uploading replaces the previous file + pack_record
 * rather than accumulating rows.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { image_base64, mime_type } = validateBody(
    PackPhotoBodySchema,
    req.body
  )
  const { id } = req.params
  const staffId = req.auth_context.actor_id

  const wms: WmsModuleService = req.scope.resolve(WMS_MODULE)
  const [shipment] = await wms.listShipments({ id }, { take: 1 })

  if (!shipment) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipment "${id}" not found`
    )
  }

  if ((shipment as any).status !== "picked") {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Shipment "${id}" is not ready for a pack photo (status: "${(shipment as any).status}")`
    )
  }

  const pickState = ((shipment as any).pick_state ?? {}) as {
    awb_verified_at?: string
  }
  if (!pickState.awb_verified_at) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Shipment "${id}" must have its AWB verified before a pack photo can be uploaded`
    )
  }

  const decoded = Buffer.from(image_base64, "base64")
  if (decoded.length > MAX_DECODED_BYTES) {
    return res.status(413).json({
      type: "invalid_data",
      message: `Photo exceeds the 5MB limit (decoded size: ${decoded.length} bytes)`,
    })
  }

  const fileModule: IFileModuleService = req.scope.resolve(Modules.FILE)

  const [existing] = await wms.listPackRecords({ shipment_id: id }, { take: 1 })
  if (existing) {
    await fileModule.deleteFiles((existing as any).photo_file_id)
    await wms.deletePackRecords((existing as any).id)
  }

  const extension = EXTENSION_BY_MIME[mime_type]
  const filename = `pack-${id}-${Date.now()}.${extension}`

  const file = await fileModule.createFiles({
    filename,
    mimeType: mime_type,
    content: image_base64,
    access: "private",
  })

  const packRecord = await wms.createPackRecords({
    shipment_id: id,
    photo_file_id: file.id,
    photo_url: file.url,
    packed_by: staffId,
    packed_at: new Date(),
  } as any)

  return res.json({ pack_record: packRecord })
}
