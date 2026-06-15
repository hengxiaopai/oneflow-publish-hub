const NON_RETRYABLE = new Set([
  "HALO_AUTH_FAILED",
  "HALO_CREDENTIAL_INVALID",
  "HALO_ENDPOINT_NOT_FOUND",
  "HALO_PAYLOAD_INVALID",
  "ARTICLE_TITLE_REQUIRED",
  "ARTICLE_CONTENT_REQUIRED",
  "ARTICLE_HTML_UNSAFE",
  "CHANNEL_VERSION_STALE",
  "HALO_SLUG_INVALID",
  "UNSAFE_REMOTE_URL",
]);

const RETRYABLE = new Set([
  "HALO_TIMEOUT",
  "HALO_NETWORK_ERROR",
  "HALO_UNREACHABLE",
  "HALO_UPSTREAM_ERROR",
  "HALO_RESPONSE_INVALID",
]);

export function getRetryDecision(
  error,
  {
    retryCount = 0,
    maxRetries = 3,
    now = new Date(),
  } = {},
) {
  const code = error?.code || "HALO_UNKNOWN_ERROR";
  if (retryCount >= maxRetries || NON_RETRYABLE.has(code)) {
    return {
      retryable: false,
      strategy: "none",
      nextRetryAt: null,
      reason:
        retryCount >= maxRetries
          ? "已达到最大重试次数。"
          : "该错误需要人工修复后再发布。",
    };
  }
  if (code === "HALO_SLUG_CONFLICT") {
    return {
      retryable: retryCount === 0,
      strategy: retryCount === 0 ? "resolve_slug_once" : "none",
      nextRetryAt: null,
      reason:
        retryCount === 0
          ? "将生成带稳定后缀的新 slug 并重试一次。"
          : "slug 冲突自动恢复次数已用完。",
    };
  }
  if (RETRYABLE.has(code)) {
    const delayMs = Math.min(5 * 60_000, 15_000 * 2 ** retryCount);
    return {
      retryable: true,
      strategy: "scheduled_retry",
      nextRetryAt: new Date(now.getTime() + delayMs),
      reason: "网络或上游服务错误，可稍后重试。",
    };
  }
  return {
    retryable: false,
    strategy: "none",
    nextRetryAt: null,
    reason: "未知错误默认不自动重试。",
  };
}
