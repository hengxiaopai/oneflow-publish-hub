import "dotenv/config";
import { parseEnvironment } from "./env.js";

export function loadConfig(overrides = {}) {
  const parsed = parseEnvironment({
    NODE_ENV: overrides.nodeEnv ?? process.env.NODE_ENV ?? "development",
    PORT: overrides.port ?? process.env.PORT ?? 4174,
    DATABASE_URL: overrides.databaseUrl ?? process.env.DATABASE_URL,
    ENCRYPTION_KEY: overrides.encryptionKey ?? process.env.ENCRYPTION_KEY,
    CORS_ORIGIN: Array.isArray(overrides.corsOrigin)
      ? overrides.corsOrigin.join(",")
      : overrides.corsOrigin ?? process.env.CORS_ORIGIN,
    SESSION_SECRET: overrides.sessionSecret ?? process.env.SESSION_SECRET,
    SESSION_COOKIE_NAME:
      overrides.sessionCookieName ?? process.env.SESSION_COOKIE_NAME,
    SESSION_TTL_HOURS:
      overrides.sessionTtlHours ?? process.env.SESSION_TTL_HOURS,
  });

  return {
    ...parsed,
    host: overrides.host ?? process.env.HOST ?? "127.0.0.1",
    bodyLimit: Number(overrides.bodyLimit ?? process.env.BODY_LIMIT ?? 3145728),
    devSessionRateLimitMax: Number(
      overrides.devSessionRateLimitMax ??
        process.env.DEV_SESSION_RATE_LIMIT_MAX ??
        20,
    ),
    publishRateLimitMax: Number(
      overrides.publishRateLimitMax ??
        process.env.PUBLISH_RATE_LIMIT_MAX ??
        30,
    ),
    authRateLimitMax: Number(
      overrides.authRateLimitMax ?? process.env.AUTH_RATE_LIMIT_MAX ?? 12,
    ),
    isTest: overrides.isTest ?? parsed.isTest,
  };
}
