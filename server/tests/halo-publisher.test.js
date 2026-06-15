import assert from "node:assert/strict";
import { test } from "node:test";

import { encryptCredential } from "../src/services/credentialService.js";
import {
  createHaloPublisherService,
  normalizeHaloError,
} from "../src/services/publishers/haloPublisherService.js";

const encryptionKey = "oneflow-test-encryption-key-not-for-production";

function channel(overrides = {}) {
  return {
    platformId: "halo",
    publisherMode: "halo",
    credentialStatus: "stored",
    encryptedCredential: encryptCredential("pat_test_secret", encryptionKey),
    configuration: JSON.stringify({
      baseUrl: "https://blog.example.test",
      consoleApiEndpoint: "/apis/api.console.halo.run/v1alpha1",
      publishMode: "draft",
      defaultCategory: "engineering",
      defaultTags: ["oneflow"],
      defaultOwner: "admin",
      defaultCoverStrategy: "article_cover",
    }),
    ...overrides,
  };
}

function snapshots() {
  return {
    article: {
      title: "Server-side Halo publishing",
      summary: "A safe publishing path.",
      contentHtml: "<h2>Architecture</h2><p>Worker owned.</p>",
      contentMarkdown: "## Architecture\n\nWorker owned.",
      tags: ["SaaS", "Halo"],
      cover: { url: "https://cdn.example.test/cover.png" },
      slug: "server-side-halo-publishing",
    },
    version: {
      platformTitle: "OneFlow server-side Halo publishing",
      platformSummary: "Drafted by the backend worker.",
      platformContentHtml: "<h2>Architecture</h2><p>Worker owned.</p>",
      platformContentMarkdown: "## Architecture\n\nWorker owned.",
      seoTitle: "OneFlow Halo Publisher",
      seoDescription: "Backend-owned Halo publishing.",
      canonicalUrl: "https://oneflow.example.test/articles/halo",
      versionStatus: "ready",
    },
  };
}

test("Halo config validation and URL building use configurable endpoints", () => {
  const service = createHaloPublisherService({
    encryptionKey,
    fetchImpl: async () => new Response(),
  });
  assert.deepEqual(service.validateConfig(channel()), { ok: true, issues: [] });
  assert.equal(
    service.buildConsoleApiUrl(channel(), "/posts"),
    "https://blog.example.test/apis/api.console.halo.run/v1alpha1/posts",
  );
  const invalid = service.validateConfig(
    channel({
      encryptedCredential: null,
      credentialStatus: "none",
      configuration: JSON.stringify({
        baseUrl: "",
        consoleApiEndpoint: "",
        publishMode: "unknown",
      }),
    }),
  );
  assert.equal(invalid.ok, false);
  assert.deepEqual(
    invalid.issues.map((issue) => issue.code),
    ["HALO_BASE_URL_REQUIRED", "HALO_ENDPOINT_REQUIRED", "HALO_TOKEN_REQUIRED", "HALO_PUBLISH_MODE_INVALID"],
  );
});

test("Halo payload mapping follows PostRequest and keeps Markdown source", () => {
  const service = createHaloPublisherService({
    encryptionKey,
    fetchImpl: async () => new Response(),
  });
  const { article, version } = snapshots();
  const payload = service.mapArticleToHaloPayload(article, version, channel());

  assert.equal(payload.post.apiVersion, "content.halo.run/v1alpha1");
  assert.equal(payload.post.kind, "Post");
  assert.equal(payload.post.metadata.generateName, "post-");
  assert.equal(payload.post.spec.title, version.platformTitle);
  assert.equal(payload.post.spec.slug, article.slug);
  assert.equal(payload.post.spec.publish, false);
  assert.equal(payload.post.spec.excerpt.raw, version.platformSummary);
  assert.deepEqual(payload.post.spec.tags, ["SaaS", "Halo", "oneflow"]);
  assert.deepEqual(payload.post.spec.categories, ["engineering"]);
  assert.equal(payload.content.content, version.platformContentHtml);
  assert.equal(payload.content.raw, version.platformContentMarkdown);
  assert.equal(payload.content.rawType, "MARKDOWN");
});

test("Halo fake HTTP creates a draft then publishes it without exposing PAT", async () => {
  const calls = [];
  const service = createHaloPublisherService({
    encryptionKey,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "POST") {
        return Response.json({
          metadata: { name: "post-abc123" },
          spec: { slug: "server-side-halo-publishing" },
          status: {
            phase: "DRAFT",
            permalink: "/archives/server-side-halo-publishing",
          },
        });
      }
      return Response.json({
        metadata: { name: "post-abc123" },
        spec: { slug: "server-side-halo-publishing" },
        status: {
          phase: "PUBLISHED",
          permalink: "/archives/server-side-halo-publishing",
        },
      });
    },
  });
  const { article, version } = snapshots();
  const draft = await service.createDraft(
    {
      publishBatch: { articleSnapshot: JSON.stringify(article) },
      channelVersionSnapshot: JSON.stringify(version),
    },
    channel(),
  );
  const published = await service.publishDraft("post-abc123", channel());

  assert.equal(draft.remotePostName, "post-abc123");
  assert.equal(draft.remoteStatus, "DRAFT");
  assert.match(draft.remoteEditUrl, /console\/posts\/editor\?name=post-abc123$/);
  assert.match(draft.remotePreviewUrl, /archives\/server-side-halo-publishing$/);
  assert.equal(published.remoteStatus, "PUBLISHED");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.authorization, "Bearer pat_test_secret");
  assert.equal(JSON.stringify(draft).includes("pat_test_secret"), false);
  assert.equal(JSON.stringify(published).includes("pat_test_secret"), false);
});

test("Halo draft creation rejects responses without a Post Name", async () => {
  const service = createHaloPublisherService({
    encryptionKey,
    fetchImpl: async () =>
      Response.json({
        status: { phase: "DRAFT" },
      }),
  });
  const { article, version } = snapshots();

  await assert.rejects(
    service.createDraft(
      {
        publishBatch: { articleSnapshot: JSON.stringify(article) },
        channelVersionSnapshot: JSON.stringify(version),
      },
      channel(),
    ),
    (error) => error.code === "HALO_RESPONSE_INVALID",
  );
});

test("Halo errors normalize status and network failures", () => {
  const cases = [
    [401, "HALO_AUTH_FAILED"],
    [403, "HALO_AUTH_FAILED"],
    [404, "HALO_ENDPOINT_NOT_FOUND"],
    [409, "HALO_SLUG_CONFLICT"],
    [422, "HALO_PAYLOAD_INVALID"],
  ];
  for (const [status, code] of cases) {
    assert.equal(normalizeHaloError({ status }).code, code);
  }
  assert.equal(normalizeHaloError({ code: "ETIMEDOUT" }).code, "HALO_TIMEOUT");
  assert.equal(normalizeHaloError({ code: "ECONNREFUSED" }).code, "HALO_UNREACHABLE");
  assert.equal(normalizeHaloError(new TypeError("fetch failed")).code, "HALO_NETWORK_ERROR");
});
