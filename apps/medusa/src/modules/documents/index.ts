import { Module } from "@medusajs/framework/utils"
import DocumentsModuleService from "./service"

export const DOCUMENTS_MODULE = "documents"

export default Module(DOCUMENTS_MODULE, {
  service: DocumentsModuleService,
})
