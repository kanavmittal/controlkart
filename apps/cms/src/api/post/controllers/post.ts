/**
 * post controller — default Strapi core controller (REST CRUD at /api/posts).
 */
import { factories } from "@strapi/strapi"

export default factories.createCoreController("api::post.post")
