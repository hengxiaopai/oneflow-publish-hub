import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const databasePath = resolve(cwd, "prisma", "test.db");
const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: "file:./test.db",
  ENCRYPTION_KEY: "oneflow-test-encryption-key-not-for-production",
};

rmSync(databasePath, { force: true });

const setupCommands = [
  ["npx", ["prisma", "generate"]],
  ["npx", ["prisma", "db", "push", "--force-reset"]],
];

for (const command of setupCommands) {
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
}
