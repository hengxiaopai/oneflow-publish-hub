import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".playwright-cli",
  "dist",
  "build",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function collectJavaScriptFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJavaScriptFiles(absolutePath, files);
    } else if ([".js", ".mjs"].includes(extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

const files = collectJavaScriptFiles(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
