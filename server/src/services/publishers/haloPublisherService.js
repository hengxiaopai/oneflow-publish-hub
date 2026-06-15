import { createRequire } from "node:module";

import { decryptCredential } from "../credentialService.js";
import { assertSafeRemoteUrl } from "../urlSafetyService.js";

const require = createRequire(import.meta.url);
const { sanitizeHtml } = require("../../../../sanitizer.js");

const DEFAULT_CONSOLE_ENDPOINT = "/apis/api.console.halo.run/v1alpha1";
const VALID_PUBLISH_MODES = new Set(["draft", "publish"]);

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function uniqueStrings(values) {
  return [...new Set(values.flat().filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function channelSettings(channelConfig) {
  return parseJson(channelConfig?.configuration, {});
}

function publicBaseUrl(channelConfig) {
  return String(channelSettings(channelConfig).baseUrl || "").replace(/\/+$/, "");
}

function absoluteRemoteUrl(baseUrl, value) {
  if (!value) return null;
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

function issue(code, field, message) {
  return { code, field, severity: "error", message };
}

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}._~-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._~]+|[-._~]+$/g, "");
  return slug || `oneflow-${Date.now().toString(36)}`;
}

function safeResponseSummary(response) {
  return {
    name: response?.metadata?.name || null,
    slug: response?.spec?.slug || null,
    phase: response?.status?.phase || null,
    permalink: response?.status?.permalink || null,
  };
}

export function normalizeHaloError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  if (status === 401 || status === 403) {
    return {
      code: "HALO_AUTH_FAILED",
      message: "Halo Token 无效或权限不足，请重新授权。",
      statusCode: status,
    };
  }
  if (status === 404) {
    return {
      code: "HALO_ENDPOINT_NOT_FOUND",
      message: "Halo Base URL 或 Console API Endpoint 不正确。",
      statusCode: 404,
    };
  }
  if (status === 409) {
    return {
      code: "HALO_SLUG_CONFLICT",
      message: "Halo 文章 slug 或资源名称冲突，请修改后重试。",
      statusCode: 409,
    };
  }
  if (status === 422 || status === 400) {
    return {
      code: "HALO_PAYLOAD_INVALID",
      message: "Halo 拒绝了文章载荷，请检查标题、slug、分类和标签映射。",
      statusCode: status || 422,
    };
  }
  if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") {
    return {
      code: "HALO_TIMEOUT",
      message: "连接 Halo 超时，请检查服务状态和网络。",
      statusCode: 504,
    };
  }
  if (error?.code === "ECONNREFUSED") {
    return {
      code: "HALO_UNREACHABLE",
      message: "Halo 服务不可达，请检查 Base URL 和服务状态。",
      statusCode: 502,
    };
  }
  if (error instanceof TypeError || error?.code === "NETWORK_ERROR") {
    return {
      code: "HALO_NETWORK_ERROR",
      message: "连接 Halo 时发生网络错误，请稍后重试。",
      statusCode: 502,
    };
  }
  if (status >= 500) {
    return {
      code: "HALO_UPSTREAM_ERROR",
      message: "Halo 服务暂时无法处理请求，请稍后重试。",
      statusCode: 502,
    };
  }
  return {
    code: "HALO_UNKNOWN_ERROR",
    message: "Halo 发布发生未知错误。",
    statusCode: 502,
  };
}

function toServiceError(error) {
  if (error?.code && error?.statusCode) return error;
  const normalized = normalizeHaloError(error);
  return Object.assign(new Error(normalized.message), normalized, {
    cause: error,
  });
}

export function createHaloPublisherService({
  encryptionKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
  nodeEnv = "development",
  allowPrivateHaloUrls = false,
  resolveHost,
} = {}) {
  function validateConfig(channelConfig) {
    const settings = channelSettings(channelConfig);
    const issues = [];
    if (!settings.baseUrl) {
      issues.push(issue("HALO_BASE_URL_REQUIRED", "baseUrl", "请配置 Halo Base URL。"));
    } else {
      try {
        const url = new URL(settings.baseUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
      } catch {
        issues.push(issue("HALO_BASE_URL_INVALID", "baseUrl", "Halo Base URL 必须是有效的 HTTP(S) 地址。"));
      }
    }
    if (!settings.consoleApiEndpoint) {
      issues.push(issue("HALO_ENDPOINT_REQUIRED", "consoleApiEndpoint", "请配置 Halo Console API Endpoint。"));
    }
    if (
      channelConfig?.credentialStatus !== "stored" ||
      !channelConfig?.encryptedCredential
    ) {
      issues.push(issue("HALO_TOKEN_REQUIRED", "credential", "请保存可用的 Halo PAT Token。"));
    }
    if (!VALID_PUBLISH_MODES.has(settings.publishMode)) {
      issues.push(issue("HALO_PUBLISH_MODE_INVALID", "publishMode", "发布模式必须为创建草稿或创建并发布。"));
    }
    return { ok: issues.length === 0, issues };
  }

  function validatePayload(articleSnapshot, channelVersionSnapshot) {
    const article = parseJson(articleSnapshot, {});
    const version = parseJson(channelVersionSnapshot, {});
    const title = version.platformTitle || version.title || article.title;
    const contentHtml =
      version.platformContentHtml || version.contentHtml || article.contentHtml || "";
    const contentMarkdown =
      version.platformContentMarkdown ||
      version.contentMarkdown ||
      article.contentMarkdown ||
      "";
    const slug = version.slug || article.slug || slugify(title);
    const issues = [];
    if (!String(title || "").trim()) {
      issues.push(issue("ARTICLE_TITLE_REQUIRED", "title", "文章标题不能为空。"));
    }
    if (!String(contentHtml || contentMarkdown).trim()) {
      issues.push(issue("ARTICLE_CONTENT_REQUIRED", "content", "文章正文不能为空。"));
    }
    if (contentHtml && sanitizeHtml(contentHtml) !== contentHtml) {
      issues.push(issue("ARTICLE_HTML_UNSAFE", "contentHtml", "正文 HTML 未通过安全过滤。"));
    }
    if (["stale", "needs_adaptation"].includes(version.versionStatus || version.status)) {
      issues.push(issue("CHANNEL_VERSION_STALE", "versionStatus", "平台版本已过期，请重新适配后再发布。"));
    }
    if (!/^[\p{Letter}\p{Number}][\p{Letter}\p{Number}._~-]*$/u.test(slug)) {
      issues.push(issue("HALO_SLUG_INVALID", "slug", "slug 只能包含字母、数字、点、下划线、波浪线和连字符。"));
    }
    return { ok: issues.length === 0, issues, slug };
  }

  function buildConsoleApiUrl(channelConfig, path = "") {
    const settings = channelSettings(channelConfig);
    const baseUrl = String(settings.baseUrl || "").replace(/\/+$/, "");
    const endpoint = String(
      settings.consoleApiEndpoint || DEFAULT_CONSOLE_ENDPOINT,
    )
      .replace(/^\/?/, "/")
      .replace(/\/+$/, "");
    const suffix = String(path || "").replace(/^\/?/, "/");
    return `${baseUrl}${endpoint}${suffix === "/" ? "" : suffix}`;
  }

  function mapArticleToHaloPayload(
    articleSnapshot,
    channelVersionSnapshot,
    channelConfig,
    options = {},
  ) {
    const article = parseJson(articleSnapshot, {});
    const version = parseJson(channelVersionSnapshot, {});
    const settings = channelSettings(channelConfig);
    const title =
      version.platformTitle || version.title || article.title || "Untitled";
    const summary =
      version.platformSummary ||
      version.summary ||
      version.seoDescription ||
      article.summary ||
      "";
    const contentHtml =
      version.platformContentHtml || version.contentHtml || article.contentHtml || "";
    const contentMarkdown =
      version.platformContentMarkdown ||
      version.contentMarkdown ||
      article.contentMarkdown ||
      "";
    const articleTags = Array.isArray(version.tags)
      ? version.tags
      : Array.isArray(article.tags)
        ? article.tags
        : [];
    const categories = Array.isArray(settings.defaultCategory)
      ? settings.defaultCategory
      : [settings.defaultCategory];
    const cover =
      settings.defaultCoverStrategy === "none"
        ? ""
        : version.cover?.url || article.cover?.url || "";
    const slug =
      options.slugOverride || version.slug || article.slug || slugify(title);
    const spec = {
      title: String(title).trim(),
      slug,
      template: "",
      cover,
      deleted: false,
      publish: false,
      pinned: false,
      allowComment: true,
      visible: "PUBLIC",
      priority: 0,
      excerpt: {
        autoGenerate: !summary,
        raw: summary,
      },
      categories: uniqueStrings(categories),
      tags: uniqueStrings([articleTags, settings.defaultTags || []]),
      htmlMetas: [],
    };
    if (settings.defaultOwner) spec.owner = settings.defaultOwner;
    return {
      post: {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Post",
        metadata: {
          name: "",
          generateName: "post-",
          annotations: {},
        },
        spec,
      },
      content: {
        raw: contentMarkdown || contentHtml,
        content: contentHtml || contentMarkdown,
        rawType: contentMarkdown ? "MARKDOWN" : "HTML",
      },
    };
  }

  function credential(channelConfig) {
    try {
      return decryptCredential(channelConfig.encryptedCredential, encryptionKey);
    } catch (cause) {
      throw Object.assign(new Error("Halo Token 无法解密，请重新授权。"), {
        code: "HALO_CREDENTIAL_INVALID",
        statusCode: 401,
        cause,
      });
    }
  }

  async function request(channelConfig, path, options = {}) {
    await validateRemoteUrl(channelConfig);
    const token = credential(channelConfig);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(buildConsoleApiUrl(channelConfig, path), {
        ...options,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error("Halo request failed"), {
          status: response.status,
          responseBody: payload,
        });
      }
      return payload;
    } catch (error) {
      throw toServiceError(error);
    } finally {
      clearTimeout(timer);
    }
  }

  async function validateRemoteUrl(channelConfig) {
    const baseUrl = publicBaseUrl(channelConfig);
    return assertSafeRemoteUrl(baseUrl, {
      nodeEnv,
      allowPrivateHaloUrls,
      ...(resolveHost ? { resolveHost } : {}),
    });
  }

  function remoteResult(response, channelConfig, status) {
    const baseUrl = publicBaseUrl(channelConfig);
    const name = response?.metadata?.name || null;
    const permalink = absoluteRemoteUrl(baseUrl, response?.status?.permalink);
    return {
      remotePostId: name,
      remotePostName: name,
      remoteEditUrl: name
        ? `${baseUrl}/console/posts/editor?name=${encodeURIComponent(name)}`
        : null,
      remotePreviewUrl: permalink,
      remotePublicUrl: status === "published" ? permalink : null,
      remoteStatus: response?.status?.phase || status,
      rawResponseSummary: safeResponseSummary(response),
    };
  }

  async function createDraft(task, channelConfig, options = {}) {
    const configValidation = validateConfig(channelConfig);
    if (!configValidation.ok) {
      const error = Object.assign(new Error(configValidation.issues[0].message), {
        code: configValidation.issues[0].code,
        statusCode: 422,
        validationIssues: configValidation.issues,
      });
      throw error;
    }
    const article = parseJson(task.publishBatch?.articleSnapshot, {});
    const version = parseJson(task.channelVersionSnapshot, {});
    const payloadValidation = validatePayload(article, version);
    if (!payloadValidation.ok) {
      const error = Object.assign(new Error(payloadValidation.issues[0].message), {
        code: payloadValidation.issues[0].code,
        statusCode: 422,
        validationIssues: payloadValidation.issues,
      });
      throw error;
    }
    const payload = mapArticleToHaloPayload(
      article,
      version,
      channelConfig,
      options,
    );
    const response = await request(channelConfig, "/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response?.metadata?.name) {
      throw Object.assign(new Error("Halo 创建草稿成功，但响应中缺少 Post Name。"), {
        code: "HALO_RESPONSE_INVALID",
        statusCode: 502,
      });
    }
    return remoteResult(response, channelConfig, "draft_created");
  }

  async function publishDraft(remotePostName, channelConfig) {
    const response = await request(
      channelConfig,
      `/posts/${encodeURIComponent(remotePostName)}/publish`,
      { method: "PUT" },
    );
    return remoteResult(response, channelConfig, "published");
  }

  async function testConnection(channelConfig) {
    await request(channelConfig, "/posts?page=0&size=1", { method: "GET" });
    return { ok: true };
  }

  return {
    buildConsoleApiUrl,
    createDraft,
    mapArticleToHaloPayload,
    normalizeHaloError,
    publishDraft,
    testConnection,
    validateConfig,
    validatePayload,
    validateRemoteUrl,
  };
}
