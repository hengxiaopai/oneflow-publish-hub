import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function unsafe(message) {
  return Object.assign(new Error(message), {
    code: "UNSAFE_REMOTE_URL",
    statusCode: 422,
  });
}

function ipv4Number(value) {
  const parts = value.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return (
    ((parts[0] << 24) >>> 0) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  ) >>> 0;
}

function inIpv4Range(value, start, prefix) {
  const address = ipv4Number(value);
  const base = ipv4Number(start);
  if (address === null || base === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (base & mask);
}

export function isPrivateAddress(value) {
  const address = String(value || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  const family = isIP(address);
  if (family === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.168.0.0", 16],
      ["224.0.0.0", 4],
    ].some(([start, prefix]) => inIpv4Range(address, start, prefix));
  }
  if (family === 6) {
    return (
      address === "::" ||
      address === "::1" ||
      address.startsWith("fc") ||
      address.startsWith("fd") ||
      /^fe[89ab]/.test(address)
    );
  }
  return false;
}

async function defaultResolveHost(hostname) {
  return lookup(hostname, { all: true, verbatim: true });
}

export async function assertSafeRemoteUrl(
  value,
  {
    nodeEnv = "development",
    allowPrivateHaloUrls = false,
    resolveHost = defaultResolveHost,
  } = {},
) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw unsafe("Halo Base URL 不是有效地址。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw unsafe("Halo Base URL 只允许 HTTP 或 HTTPS。");
  }
  if (url.username || url.password) {
    throw unsafe("Halo Base URL 不允许包含用户名或密码。");
  }
  if (nodeEnv === "production" && url.protocol !== "https:") {
    throw unsafe("生产环境的 Halo Base URL 必须使用 HTTPS。");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const privateOverride =
    nodeEnv !== "production" && Boolean(allowPrivateHaloUrls);
  if (BLOCKED_HOSTNAMES.has(hostname) && !privateOverride) {
    throw unsafe("Halo Base URL 不允许指向本机或云元数据服务。");
  }
  if (isPrivateAddress(hostname) && !privateOverride) {
    throw unsafe("Halo Base URL 不允许指向回环、私网或链路本地地址。");
  }

  if (!isIP(hostname) && !BLOCKED_HOSTNAMES.has(hostname)) {
    let addresses;
    try {
      addresses = await resolveHost(hostname);
    } catch {
      throw unsafe("Halo Base URL 的主机名无法解析。");
    }
    const normalized = Array.isArray(addresses) ? addresses : [addresses];
    if (
      !privateOverride &&
      normalized.some((entry) => isPrivateAddress(entry?.address || entry))
    ) {
      throw unsafe("Halo Base URL 解析到了私网或本机地址。");
    }
  }

  return url;
}
