const test = require("node:test");
const assert = require("node:assert/strict");

const { createApiClient } = require("../api-client.js");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("dev session token is stored in sessionStorage and sent as a header", async () => {
  const requests = [];
  const storage = createStorage();
  const client = createApiClient({
    baseUrl: "http://127.0.0.1:4174/api",
    sessionStorage: storage,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith("/dev/session")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: { sessionToken: "dev-session-token" },
            meta: {},
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({
        ok: true,
        data: { user: { id: "usr" } },
        meta: {},
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.startDevSession("creator-a");
  await client.getCurrentUser();

  assert.equal(
    requests[1].options.headers["x-oneflow-dev-session"],
    "dev-session-token"
  );
  assert.equal(storage.getItem("oneflow.dev.session"), "dev-session-token");
});

test("saveArticle maps the local article and chooses create or update", async () => {
  const requests = [];
  const client = createApiClient({
    sessionStorage: createStorage(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify({
        ok: true,
        data: { id: "article-remote" },
        meta: {},
      }), {
        status: options.method === "POST" ? 201 : 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const article = {
    title: "OneFlow 后端接入",
    summary: "摘要",
    bodyHtml: "<p>正文</p>",
    bodyMarkdown: "正文",
    tags: ["SaaS"],
    cover: { url: "/cover.png", alt: "封面" },
    status: "draft",
  };

  await client.saveArticle(article);
  await client.saveArticle(article, "article-remote");

  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[1].options.method, "PUT");
  assert.match(requests[1].url, /\/articles\/article-remote$/);
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(payload.contentHtml, "<p>正文</p>");
  assert.equal(payload.contentMarkdown, "正文");
  assert.deepEqual(payload.tags, ["SaaS"]);
});

test("API methods expose the Phase 4 endpoints", async () => {
  const calls = [];
  const client = createApiClient({
    sessionStorage: createStorage(),
    fetchImpl: async (url, options) => {
      calls.push([url, options.method]);
      return new Response(JSON.stringify({ ok: true, data: [], meta: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.listArticles();
  await client.listChannels();
  await client.saveChannel({ platformId: "mock", displayName: "Mock" });
  await client.createPublishBatch({ articleId: "a", channelIds: ["c"] });
  await client.listPublishBatches();
  await client.getUsage();

  assert.deepEqual(
    calls.map(([url, method]) => [new URL(url).pathname, method]),
    [
      ["/api/articles", "GET"],
      ["/api/channels", "GET"],
      ["/api/channels", "POST"],
      ["/api/publish-batches", "POST"],
      ["/api/publish-batches", "GET"],
      ["/api/usage", "GET"],
    ]
  );
});

test("API errors use the shared error envelope", async () => {
  const client = createApiClient({
    sessionStorage: createStorage(),
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "ARTICLE_LIMIT_REACHED",
            message: "文章额度已用完。",
            details: { limit: 20 },
          },
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      ),
  });

  await assert.rejects(
    () => client.listArticles(),
    (error) =>
      error.code === "ARTICLE_LIMIT_REACHED" &&
      error.status === 403 &&
      error.details.limit === 20
  );
});

test("request timeout is distinct from backend unavailability", async () => {
  const client = createApiClient({
    sessionStorage: createStorage(),
    timeoutMs: 10,
    fetchImpl: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  });

  await assert.rejects(
    () => client.getUsage(),
    (error) =>
      error.code === "REQUEST_TIMEOUT" &&
      error.backendUnavailable === false
  );
});

test("connection subscribers receive connecting and connected states", async () => {
  const states = [];
  const client = createApiClient({
    sessionStorage: createStorage(),
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true, data: {}, meta: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  const unsubscribe = client.subscribeConnection((state) => states.push(state));

  await client.getUsage();
  unsubscribe();

  assert.deepEqual(
    states.map((state) => state.status),
    ["connecting", "connected"]
  );
});

test("network failures return the explicit backend unavailable message", async () => {
  const client = createApiClient({
    sessionStorage: createStorage(),
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });

  await assert.rejects(
    () => client.getUsage(),
    (error) =>
      error.backendUnavailable === true &&
      error.message === "后端服务未启动，可切换到本地开发模式。"
  );
});

test("real auth uses cookie credentials without storing a session token", async () => {
  const requests = [];
  const storage = createStorage();
  const client = createApiClient({
    sessionStorage: storage,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response(
        JSON.stringify({
          ok: true,
          data: { user: { id: "user-1" }, workspace: { id: "workspace-1" } },
          meta: {},
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    },
  });

  await client.register({
    email: "creator@example.test",
    password: "correct-horse-battery-staple",
    name: "林墨",
  });
  await client.login({
    email: "creator@example.test",
    password: "correct-horse-battery-staple",
  });

  assert.equal(requests[0].options.credentials, "include");
  assert.equal(requests[1].options.credentials, "include");
  assert.equal(storage.getItem("oneflow.dev.session"), null);
  assert.equal(
    requests.some(({ options }) => "x-oneflow-dev-session" in options.headers),
    false
  );
});
