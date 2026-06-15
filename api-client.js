"use strict";

(function exposeApiClient(globalScope) {
  const SESSION_KEY = "oneflow.dev.session";
  const DEFAULT_BASE_URL = "http://127.0.0.1:4174/api";
  const DEFAULT_TIMEOUT_MS = 10000;
  const BACKEND_UNAVAILABLE_MESSAGE =
    "后端服务未启动，可切换到本地开发模式。";
  const REQUEST_TIMEOUT_MESSAGE = "后端请求超时，请检查服务状态后重试。";

  function createApiClient(options = {}) {
    const baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    const fetchImpl = options.fetchImpl || globalScope.fetch?.bind(globalScope);
    const storage = options.sessionStorage || globalScope.sessionStorage;
    const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
    const connectionSubscribers = new Set();
    let connectionState = {
      status: "idle",
      checkedAt: null,
      error: null,
    };

    function updateConnection(status, error = null) {
      connectionState = {
        status,
        checkedAt: new Date().toISOString(),
        error,
      };
      connectionSubscribers.forEach((listener) =>
        listener({ ...connectionState })
      );
    }

    async function request(path, requestOptions = {}) {
      if (typeof fetchImpl !== "function") {
        const error = new Error(BACKEND_UNAVAILABLE_MESSAGE);
        error.code = "BACKEND_UNAVAILABLE";
        error.backendUnavailable = true;
        updateConnection("unavailable", error.message);
        throw error;
      }

      const { useDevSession = true, ...fetchOptions } = requestOptions;
      const headers = {
        ...(fetchOptions.body ? { "content-type": "application/json" } : {}),
        ...(fetchOptions.headers || {}),
      };
      const sessionToken = storage?.getItem(SESSION_KEY);
      if (useDevSession && sessionToken) {
        headers["x-oneflow-dev-session"] = sessionToken;
      }

      const controller = new AbortController();
      const timeout = globalScope.setTimeout(
        () => controller.abort(),
        timeoutMs
      );
      let response;
      updateConnection("connecting");
      try {
        response = await fetchImpl(`${baseUrl}${path}`, {
          ...fetchOptions,
          headers,
          credentials: "include",
          body:
            fetchOptions.body &&
            typeof fetchOptions.body !== "string"
              ? JSON.stringify(fetchOptions.body)
              : fetchOptions.body,
          signal: controller.signal,
        });
      } catch (cause) {
        globalScope.clearTimeout(timeout);
        if (cause?.name === "AbortError") {
          const error = new Error(REQUEST_TIMEOUT_MESSAGE, { cause });
          error.code = "REQUEST_TIMEOUT";
          error.backendUnavailable = false;
          updateConnection("unavailable", error.message);
          throw error;
        }
        const error = new Error(BACKEND_UNAVAILABLE_MESSAGE, { cause });
        error.code = "BACKEND_UNAVAILABLE";
        error.backendUnavailable = true;
        updateConnection("unavailable", error.message);
        throw error;
      }
      globalScope.clearTimeout(timeout);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        const error = new Error(
          payload?.error?.message || `API request failed (${response.status})`,
        );
        error.code = payload?.error?.code || "API_REQUEST_FAILED";
        error.status = response.status;
        error.details = payload?.error?.details;
        updateConnection("connected");
        throw error;
      }
      if (payload?.ok !== true || !Object.hasOwn(payload, "data")) {
        const error = new Error("后端响应格式无效。");
        error.code = "API_PROTOCOL_ERROR";
        error.status = response.status;
        error.backendUnavailable = false;
        updateConnection("connected");
        throw error;
      }
      updateConnection("connected");
      return payload.data;
    }

    function mapArticle(article = {}) {
      return {
        title: article.title || "",
        slug: article.slug || "",
        summary: article.summary || "",
        contentHtml: article.bodyHtml || article.contentHtml || "",
        contentMarkdown:
          article.bodyMarkdown || article.contentMarkdown || "",
        tags: Array.isArray(article.tags) ? article.tags : [],
        cover: article.cover || null,
        status: article.status || "draft",
      };
    }

    return {
      getConnectionState() {
        return { ...connectionState };
      },
      subscribeConnection(listener) {
        if (typeof listener !== "function") return () => {};
        connectionSubscribers.add(listener);
        return () => connectionSubscribers.delete(listener);
      },
      async startDevSession(profileKey = "default") {
        const data = await request("/dev/session", {
          method: "POST",
          body: { profileKey },
        });
        if (data?.sessionToken) {
          storage?.setItem(SESSION_KEY, data.sessionToken);
        }
        return data;
      },
      async register(credentials) {
        storage?.removeItem(SESSION_KEY);
        return request("/auth/register", {
          method: "POST",
          body: credentials,
          useDevSession: false,
        });
      },
      async login(credentials) {
        storage?.removeItem(SESSION_KEY);
        return request("/auth/login", {
          method: "POST",
          body: credentials,
          useDevSession: false,
        });
      },
      async getCurrentUser() {
        return request("/auth/me", { method: "GET" });
      },
      async logout() {
        try {
          return await request("/auth/logout", { method: "POST" });
        } finally {
          storage?.removeItem(SESSION_KEY);
        }
      },
      async listArticles() {
        return request("/articles", { method: "GET" });
      },
      async saveArticle(article, remoteId) {
        return request(remoteId ? `/articles/${remoteId}` : "/articles", {
          method: remoteId ? "PUT" : "POST",
          body: mapArticle(article),
        });
      },
      async listChannels() {
        return request("/channels", { method: "GET" });
      },
      async saveChannel(channel, remoteId) {
        return request(remoteId ? `/channels/${remoteId}` : "/channels", {
          method: remoteId ? "PUT" : "POST",
          body: channel,
        });
      },
      async getHaloStatus() {
        return request("/channels/halo/status", { method: "GET" });
      },
      async connectHaloChannel(configuration) {
        return request("/channels/halo/connect", {
          method: "POST",
          body: configuration,
        });
      },
      async testHaloConnection() {
        return request("/channels/halo/test", { method: "POST" });
      },
      async clearHaloCredential() {
        return request("/channels/halo/clear-credential", { method: "POST" });
      },
      async createPublishBatch(batch) {
        return request("/publish-batches", {
          method: "POST",
          body: batch,
        });
      },
      async listPublishBatches() {
        return request("/publish-batches", { method: "GET" });
      },
      async getPublishBatch(batchId) {
        return request(`/publish-batches/${batchId}`, { method: "GET" });
      },
      async retryPublishTask(taskId) {
        return request(`/publish-tasks/${taskId}/retry`, { method: "POST" });
      },
      async getUsage() {
        return request("/usage", { method: "GET" });
      },
    };
  }

  const api = {
    BACKEND_UNAVAILABLE_MESSAGE,
    DEFAULT_BASE_URL,
    DEFAULT_TIMEOUT_MS,
    REQUEST_TIMEOUT_MESSAGE,
    SESSION_KEY,
    createApiClient,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalScope.OneFlowApi = api;
  if (typeof document !== "undefined") {
    globalScope.OneFlowApiClient = createApiClient();
  }
})(typeof window !== "undefined" ? window : globalThis);
