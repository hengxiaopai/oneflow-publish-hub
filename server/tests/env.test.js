import assert from "node:assert/strict";
import test from "node:test";
import {
  EnvironmentValidationError,
  parseEnvironment,
} from "../src/env.js";

const validEnvironment = {
  NODE_ENV: "test",
  PORT: "4174",
  DATABASE_URL: "file:./test.db",
  ENCRYPTION_KEY: "12345678901234567890123456789012",
  CORS_ORIGIN: "http://127.0.0.1:4173,http://localhost:4173",
  SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
};

test("environment parser accepts a complete configuration", () => {
  const config = parseEnvironment(validEnvironment);

  assert.equal(config.nodeEnv, "test");
  assert.equal(config.port, 4174);
  assert.deepEqual(config.corsOrigin, [
    "http://127.0.0.1:4173",
    "http://localhost:4173",
  ]);
});

test("environment parser reports missing critical values", () => {
  assert.throws(
    () => parseEnvironment({ NODE_ENV: "development", PORT: "4174" }),
    (error) =>
      error instanceof EnvironmentValidationError &&
      error.issues.some((issue) => issue.includes("DATABASE_URL")) &&
      error.issues.some((issue) => issue.includes("SESSION_SECRET")),
  );
});

test("environment parser rejects short secrets and invalid ports", () => {
  assert.throws(
    () =>
      parseEnvironment({
        ...validEnvironment,
        PORT: "70000",
        ENCRYPTION_KEY: "too-short",
        SESSION_SECRET: "also-short",
      }),
    (error) =>
      error.issues.some((issue) => issue.includes("ENCRYPTION_KEY")) &&
      error.issues.some((issue) => issue.includes("SESSION_SECRET")) &&
      error.issues.some((issue) => issue.includes("PORT")),
  );
});

test("production environment rejects wildcard CORS", () => {
  assert.throws(
    () =>
      parseEnvironment({
        ...validEnvironment,
        NODE_ENV: "production",
        CORS_ORIGIN: "*",
      }),
    /CORS_ORIGIN/,
  );
});
