import "dotenv/config";

export function loadConfig(overrides = {}) {
  return {
    port: Number(overrides.port ?? process.env.PORT ?? 4174),
    host: overrides.host ?? process.env.HOST ?? "127.0.0.1",
    databaseUrl:
      overrides.databaseUrl ?? process.env.DATABASE_URL ?? "file:./dev.db",
    encryptionKey:
      overrides.encryptionKey ??
      process.env.ENCRYPTION_KEY ??
      "oneflow-local-development-only-change-me",
    corsOrigin:
      overrides.corsOrigin ??
      process.env.CORS_ORIGIN ??
      "http://127.0.0.1:4173",
    isTest: overrides.isTest ?? process.env.NODE_ENV === "test",
  };
}
