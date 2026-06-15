import { pathToFileURL } from "node:url";

import { assertSafeRemoteUrl } from "../src/services/urlSafetyService.js";

const DEFAULT_ENDPOINT = "/apis/api.console.halo.run/v1alpha1";

function consoleApiUrl(baseUrl, endpoint, path) {
  return `${String(baseUrl).replace(/\/+$/, "")}/${String(
    endpoint || DEFAULT_ENDPOINT,
  )
    .replace(/^\/+|\/+$/g, "")}/${String(path).replace(/^\/+/, "")}`;
}

export async function runHaloSmokeTest({
  env = process.env,
  fetchImpl = globalThis.fetch,
  log = console.log,
  now = () => new Date(),
  assertSafeUrl = assertSafeRemoteUrl,
} = {}) {
  const required = [
    "HALO_TEST_BASE_URL",
    "HALO_TEST_ENDPOINT",
    "HALO_TEST_PAT",
  ];
  const missing = required.filter((key) => !String(env[key] || "").trim());
  if (missing.length) {
    log(`Halo smoke test skipped: missing ${missing.join(", ")}.`);
    return { skipped: true, missing };
  }

  const baseUrl = String(env.HALO_TEST_BASE_URL).trim();
  const endpoint = String(env.HALO_TEST_ENDPOINT || DEFAULT_ENDPOINT).trim();
  const token = String(env.HALO_TEST_PAT);
  const mode = String(env.HALO_TEST_MODE || "draft").toLowerCase();
  const timestamp = now().toISOString();
  await assertSafeUrl(baseUrl, {
    nodeEnv: env.NODE_ENV || "development",
    allowPrivateHaloUrls:
      String(env.ALLOW_PRIVATE_HALO_URLS || "").toLowerCase() === "true",
  });

  const title = `OneFlow Smoke Test ${timestamp}`;
  const slug = `oneflow-smoke-test-${timestamp
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase()}`;
  const response = await fetchImpl(consoleApiUrl(baseUrl, endpoint, "posts"), {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      post: {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Post",
        metadata: { name: "", generateName: "post-", annotations: {} },
        spec: {
          title,
          slug,
          template: "",
          cover: "",
          deleted: false,
          publish: false,
          pinned: false,
          allowComment: false,
          visible: "PRIVATE",
          priority: 0,
          excerpt: {
            autoGenerate: false,
            raw: "OneFlow Halo publisher smoke test draft.",
          },
          categories: [],
          tags: [],
          htmlMetas: [],
        },
      },
      content: {
        raw: `# ${title}\n\nCreated by the OneFlow Halo smoke test.`,
        content: `<h1>${title}</h1><p>Created by the OneFlow Halo smoke test.</p>`,
        rawType: "MARKDOWN",
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.metadata?.name) {
    throw new Error(
      `Halo smoke test failed with status ${response.status || "unknown"}.`,
    );
  }

  const remotePostName = payload.metadata.name;
  const editUrl = `${baseUrl.replace(/\/+$/, "")}/console/posts/editor?name=${encodeURIComponent(remotePostName)}`;
  const previewUrl = payload?.status?.permalink
    ? new URL(payload.status.permalink, `${baseUrl.replace(/\/+$/, "")}/`).toString()
    : null;
  log(`Halo smoke draft created: ${remotePostName}`);
  log(`Edit URL: ${editUrl}`);
  if (previewUrl) log(`Preview URL: ${previewUrl}`);
  if (mode !== "draft") {
    log("HALO_TEST_MODE currently supports draft only; the draft was not published.");
  }
  return {
    skipped: false,
    remotePostName,
    editUrl,
    previewUrl,
  };
}

const isEntryPoint =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntryPoint) {
  runHaloSmokeTest().catch((error) => {
    console.error(`Halo smoke test failed: ${error.message}`);
    process.exitCode = 1;
  });
}
