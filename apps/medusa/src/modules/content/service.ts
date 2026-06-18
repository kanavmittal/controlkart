import { MedusaService } from "@medusajs/framework/utils"
import ContentPost from "./models/content-post"

class ContentModuleService extends MedusaService({
  ContentPost,
}) {}

export default ContentModuleService
