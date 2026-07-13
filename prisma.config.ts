import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // El CLI (prisma db push, migrate) necesita conexión directa, no la pooled.
    url: env("DIRECT_URL"),
  },
});