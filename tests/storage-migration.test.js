const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CURRENT_SCHEMA_VERSION,
  exportWorkspaceData,
  importWorkspaceData,
  migrateWorkspacePayload,
} = require("../storage.js");

test("v1 workspace data migrates through v2 to schema v3", () => {
  const result = migrateWorkspacePayload({
    schemaVersion: 1,
    savedAt: "2026-06-12T00:00:00.000Z",
    state: {
      article: {
        id: "article-1",
        title: "旧文章",
        coverAsset: "assets/old.png",
      },
      channelVersions: [],
      platformCapabilities: [],
      publishTasks: [],
      publishBatches: [],
      validationIssues: [],
      workspaceSettings: {},
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(result.state.currentArticle.title, "旧文章");
  assert.equal(result.state.currentArticle.cover.url, "assets/old.png");
  assert.deepEqual(result.state.articleSnapshots, []);
  assert.deepEqual(result.state.channelVersionSnapshots, []);
});

test("v2 workspace data migrates to v3 without losing publish records", () => {
  const result = migrateWorkspacePayload({
    schemaVersion: 2,
    savedAt: "2026-06-13T00:00:00.000Z",
    state: {
      article: { id: "article-2", title: "Phase 2" },
      publishBatches: [{ id: "batch-001", articleTitle: "Phase 2" }],
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.currentArticle.title, "Phase 2");
  assert.equal(result.state.publishBatches.length, 1);
  assert.ok(result.state.articleSnapshots.length >= 1);
});

test("future workspace schema is rejected without mutation", () => {
  const result = migrateWorkspacePayload({
    schemaVersion: 99,
    state: { currentArticle: { title: "未来数据" } },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported_version");
});

test("workspace export and import round trip schema v3 data", () => {
  const state = {
    currentArticle: { id: "article-3", title: "可导出文章" },
    channelVersions: [],
    platformCapabilities: [],
    publishTasks: [],
    publishBatches: [],
    validationIssues: [],
    workspaceSettings: { queueDensity: "compact" },
    articleSnapshots: [],
    channelVersionSnapshots: [],
  };
  const exported = exportWorkspaceData(state, {
    now: () => "2026-06-14T08:09:00.000Z",
  });
  const imported = importWorkspaceData(exported.json);

  assert.equal(exported.filename, "oneflow-workspace-20260614-1609.json");
  assert.equal(imported.ok, true);
  assert.equal(imported.state.currentArticle.title, "可导出文章");
  assert.equal(imported.state.workspaceSettings.queueDensity, "compact");
});

test("workspace import rejects corrupt JSON and preserves raw input", () => {
  const result = importWorkspaceData("{broken");

  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_json");
  assert.equal(result.raw, "{broken");
});
