import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(process.execPath, ["scripts/static-server.mjs"], {
    stdio: "inherit",
    env: process.env,
  }),
  spawn(npmCommand, ["--prefix", "server", "run", "dev"], {
    stdio: "inherit",
    env: process.env,
  }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
  process.exitCode = exitCode;
}

children.forEach((child) => {
  child.on("exit", (code, signal) => {
    if (!stopping && code && code !== 0) {
      console.error(`OneFlow dev process exited (${signal || code}).`);
      stop(code);
    }
  });
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
