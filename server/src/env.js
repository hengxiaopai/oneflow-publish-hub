const NODE_ENV_VALUES = new Set(["development", "test", "production"]);
const MIN_SECRET_LENGTH = 32;

export class EnvironmentValidationError extends Error {
  constructor(issues) {
    super(`Invalid server environment:\n- ${issues.join("\n- ")}`);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

function requiredString(source, key, issues) {
  const value = String(source[key] || "").trim();
  if (!value) issues.push(`${key} is required.`);
  return value;
}

function positiveInteger(value, key, issues, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1 || number > 65535) {
    issues.push(`${key} must be an integer between 1 and 65535.`);
  }
  return number;
}

function secret(value, key, issues) {
  const normalized = requiredString({ [key]: value }, key, issues);
  if (normalized && normalized.length < MIN_SECRET_LENGTH) {
    issues.push(`${key} must contain at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return normalized;
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim().toLowerCase() === "true";
}

function integerRange(value, key, issues, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) {
    issues.push(`${key} must be an integer between ${min} and ${max}.`);
  }
  return number;
}

export function parseEnvironment(source = process.env) {
  const issues = [];
  const nodeEnv = String(source.NODE_ENV || "development").trim();
  if (!NODE_ENV_VALUES.has(nodeEnv)) {
    issues.push("NODE_ENV must be development, test, or production.");
  }

  const port = positiveInteger(source.PORT, "PORT", issues, 4174);
  const databaseUrl = requiredString(source, "DATABASE_URL", issues);
  const encryptionKey = secret(source.ENCRYPTION_KEY, "ENCRYPTION_KEY", issues);
  const sessionSecret = secret(source.SESSION_SECRET, "SESSION_SECRET", issues);
  const sessionCookieName =
    String(source.SESSION_COOKIE_NAME || "oneflow_session").trim() ||
    "oneflow_session";
  const sessionTtlHours = positiveInteger(
    source.SESSION_TTL_HOURS,
    "SESSION_TTL_HOURS",
    issues,
    168,
  );
  const corsValue = requiredString(source, "CORS_ORIGIN", issues);
  const corsOrigin = corsValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (nodeEnv === "production" && corsOrigin.includes("*")) {
    issues.push("CORS_ORIGIN cannot contain * in production.");
  }
  const allowPrivateHaloUrls = booleanValue(
    source.ALLOW_PRIVATE_HALO_URLS,
    false,
  );
  const haloRequestTimeoutMs = integerRange(
    source.HALO_REQUEST_TIMEOUT_MS,
    "HALO_REQUEST_TIMEOUT_MS",
    issues,
    15000,
    1000,
    120000,
  );
  if (issues.length) throw new EnvironmentValidationError(issues);

  return {
    nodeEnv,
    port,
    databaseUrl,
    encryptionKey,
    sessionSecret,
    sessionCookieName,
    sessionTtlHours,
    corsOrigin,
    allowPrivateHaloUrls,
    haloRequestTimeoutMs,
    isTest: nodeEnv === "test",
  };
}
