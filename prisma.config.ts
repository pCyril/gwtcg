import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

// SHADOW_DATABASE_URL is only used by `migrate dev`/`migrate diff` (local dev
// workflow) - `env()` throws if the var is missing, so it's read directly
// instead to stay optional for `migrate deploy`/`migrate status` in production,
// which never touch a shadow database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
