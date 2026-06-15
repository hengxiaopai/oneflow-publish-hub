import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.postgresql.prisma",
  migrations: {
    path: "prisma/migrations-postgresql",
  },
  datasource: {
    url:
      process.env.POSTGRES_DATABASE_URL ||
      "postgresql://oneflow:oneflow@127.0.0.1:5432/oneflow",
  },
});
