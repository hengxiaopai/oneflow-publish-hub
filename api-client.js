"use strict";

(function exposeApiClient(globalScope) {
  const SESSION_KEY = "oneflow.dev.session";
  const DEFAULT_BASE_URL = "http://127.0.0.1:4174/api";
  const BACKEND_UNAVAILABLE_MESSAGE =
    "后端服务未启动，可切换到本地开发模式。";

  function createApiClient(options = {}) {
    const baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    const fetchImpl = options.fetchImpl || globalScope.fetch?.bind(globalScope);
    const storage = options.sessionStorage || globalScope.sessionStorage;

    async function request(path, requestOptions = {}) {
      if (typeof fetchImpl !== "function") {
        const error = new Error(BACKEND_UNAVAILABLE_MESSAGE);
        error.code = "BACKEND_UNAVAILABLE";
        error.backendUnavailable = true;
        throw error;
      }

      const headers = {
        ...(requestOptions.body ? { "content-type": "application/json" } : {}),
        ...(requestOptions.headers || {}),
      };
      const sessionToken = storage?.getItem(SESSION_KEY);
      if (sessionToken) {
        headers["x-oneflow-dev-session"] = sessionToken;
      }

      let response;
      try {
        response = await fetchImpl(`${baseUrl}${path}`, {
          ...requestOptions,
          headers,
          body:
            requestOptions.body &&
            typeof requestOptions.body !== "string"
              ? JSON.stringify(requestOptions.body)
              : requestOptions.body,
        });
      } catch (cause) {
        const error = new Error(BACKEND_UNAVAILABLE_MESSAGE, { cause });
        error.code = "BACKEND_UNAVAILABLE";
        error.backendUnavailable = true;
        throw error;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(
          payload?.error?.message || `API request failed (${response.status})`,
        );
        error.code = payload?.error?.code || "API_REQUEST_FAILED";
        error.status = response.status;
        error.details = payload?.error?.details;
        throw error;
      }
      return payload.data;
    }

    function mapArticle(article = {}) {
      return {
        title: article.title || "",
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
