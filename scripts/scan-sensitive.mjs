import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fileList = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);

const forbiddenPaths = [
  /(^|\/)\.env($|\.)/i,
  /(^|\/)(node_modules|dist|build|coverage|chrome-profile|browser-profile)\//i,
  /(^|\/)(cookies?|secrets?|tokens?)(\.|\/|$)/i,
];
const allowedEnvironmentExamples = new Set([".env.example", "server/.env.example"]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bsk-[A-Za-z0-9]{32,}\b/,
  /Authorization\s*:\s*Bearer\s+(?!<|replace|test|example)[A-Za-z0-9._~+/=-]{20,}/i,
];

const findings = [];
for (const file of fileList) {
  const normalized = file.replaceAll("\\", "/");
  if (
    !allowedEnvironmentExamples.has(normalized) &&
    forbiddenPaths.some((pattern) => pattern.test(normalized))
  ) {
    findings.push(`${normalized}: forbidden tracked path`);
    continue;
  }

  const absolutePath = resolve(root, file);
  const size = statSync(absolutePath).size;
  if (size > 5 * 1024 * 1024) {
    findings.push(`${normalized}: file exceeds 5 MiB`);
    continue;
  }
  if (size === 0 || /\.(png|jpe?g|gif|webp|ico|db)$/i.test(normalized)) continue;

  const content = readFileSync(absolutePath, "utf8");
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    findings.push(`${normalized}: possible credential material`);
  }
}

if (findings.length) {
  console.error("Sensitive information scan failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Sensitive information scan passed for ${fileList.length} files.`);
