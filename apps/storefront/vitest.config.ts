import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Minimal vitest setup for unit-testing pure modules (no Next runtime).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
