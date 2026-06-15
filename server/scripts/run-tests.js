import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const baseEnv = {
  ...process.env,
  NODE_ENV: "test",
  ENCRYPTION_KEY: "oneflow-test-encryption-key-not-for-production",
  SESSION_SECRET: "oneflow-test-session-secret-not-for-production",
  CORS_ORIGIN: "http://127.0.0.1:4173",
};

const generate = spawnSync("npx", ["prisma", "generate"], {
  cwd,
  env: {
    ...baseEnv,
    DATABASE_URL: "file:./test-generate.db",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});
if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}

function run(command, env) {
  const result = spawnSync(command[0], command[1], {
    cwd,
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const testFiles = readdirSync(resolve(cwd, "tests"))
  .filter((file) => file.endsWith(".test.js"))
  .sort();

for (const testFile of testFiles) {
  const databaseName = `test-${testFile.replace(/\.test\.js$/, "")}.db`;
  const databasePath = resolve(cwd, databaseName);
  const env = {
    ...baseEnv,
    DATABASE_URL: `file:./${databaseName}`,
  };
  rmSync(databasePath, { force: true });
  run(
    ["npx", ["prisma", "db", "push", "--force-reset"]],
    env,
  );
  const result = spawnSync(
    process.execPath,
    ["--test", resolve(cwd, "tests", testFile)],
    {
      cwd,
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  rmSync(databasePath, { force: true });
}
