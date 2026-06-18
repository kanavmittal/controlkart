import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/quotes",
      method: "GET",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/quotes",
      method: "POST",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/store/orders/:id/invoice",
      method: "GET",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auth/send-verification",
      method: "POST",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
