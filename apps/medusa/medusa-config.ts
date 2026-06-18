import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isS3Configured = !!process.env.S3_BUCKET

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Managed Postgres (PlanetScale) requires TLS. The pg driver doesn't honor
    // the URL's sslmode/sslrootcert params, so enable SSL explicitly here.
    // rejectUnauthorized: true verifies the cert chain against Node's trust
    // store (PlanetScale uses a publicly-trusted CA) — i.e. full verification.
    // Set DATABASE_SSL=false to disable (e.g. a plain local Postgres).
    ...(process.env.DATABASE_SSL === "false"
      ? {}
      : { databaseDriverOptions: { connection: { ssl: { rejectUnauthorized: true } } } }),
    redisUrl: process.env.REDIS_URL,
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  modules: [
    // Production Redis infrastructure (cache, event bus, workflow engine, locking).
    // Enabled whenever REDIS_URL is set — leave it UNSET in local dev to use the
    // in-memory defaults (avoids BullMQ polling a managed Redis during development).
    ...(process.env.REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/cache-redis",
            options: { redisUrl: process.env.REDIS_URL },
          },
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: { redisUrl: process.env.REDIS_URL },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            // NOTE: 2.15.3 requires the nested `redis: { url }` form (its loader
            // destructures redis.url). It logs a "use redisUrl" deprecation
            // warning — harmless; the flat form throws on this version.
            options: { redis: { url: process.env.REDIS_URL } },
          },
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "locking-redis",
                  isDefault: true,
                  options: { redisUrl: process.env.REDIS_URL },
                },
              ],
            },
          },
        ]
      : []),
    // Custom industrial-commerce modules
    { resolve: "./src/modules/specs" },
    { resolve: "./src/modules/documents" },
    { resolve: "./src/modules/quotes" },
    { resolve: "./src/modules/content" },
    // S3-compatible file storage (Cloudflare R2 etc.) when configured; local storage otherwise
    ...(isS3Configured
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: process.env.S3_FILE_URL,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION,
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT,
                    additional_client_config: { forcePathStyle: true },
                  },
                },
              ],
            },
          },
        ]
      : []),
    // Razorpay payments (UPI, cards, net banking) when keys are configured
    ...(process.env.RAZORPAY_ID
      ? [
          {
            resolve: "@medusajs/medusa/payment",
            options: {
              providers: [
                {
                  resolve:
                    "medusa-plugin-razorpay-v2/providers/payment-razorpay/src",
                  id: "razorpay",
                  options: {
                    key_id: process.env.RAZORPAY_ID,
                    key_secret: process.env.RAZORPAY_SECRET,
                    razorpay_account: process.env.RAZORPAY_ACCOUNT,
                    automatic_expiry_period: 30,
                    manual_expiry_period: 20,
                    refund_speed: "normal",
                    webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
                  },
                },
              ],
            },
          },
        ]
      : []),
    // Shiprocket fulfillment when credentials are configured (manual otherwise)
    ...(process.env.SHIPROCKET_EMAIL
      ? [
          {
            resolve: "@medusajs/medusa/fulfillment",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/fulfillment-manual",
                  id: "manual",
                },
                {
                  resolve: "./src/modules/shiprocket-fulfillment",
                  id: "shiprocket",
                  options: {
                    email: process.env.SHIPROCKET_EMAIL,
                    password: process.env.SHIPROCKET_PASSWORD,
                    pickup_location:
                      process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
                  },
                },
              ],
            },
          },
        ]
      : []),
    // Google sign-in for customers (alongside default emailpass)
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          {
            resolve: "@medusajs/medusa/auth",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/auth-emailpass",
                  id: "emailpass",
                },
                {
                  resolve: "@medusajs/medusa/auth-google",
                  id: "google",
                  options: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
