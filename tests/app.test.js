const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  CHANNEL_GROUPS,
  PUBLISH_STATUS,
  applyChannelTransition,
  calculateArticleMetrics,
  confirmChannelVersion,
  createPreviewDecision,
  createProductState,
  createPublishBatch,
  createChannelData,
  estimatePublishMinutes,
  formatPublishSummary,
  getChannelViews,
  getContentLibraryRows,
  groupChannels,
  getReadyChannels,
  getPublishHistoryRows,
  getPublishBatchDetail,
  getVisibleDeliverables,
  mergePersistedState,
  readaptChannelVersion,
  reusePublishBatch,
  transitionChannel,
  summarizeSelection,
  updateArticleContent,
} = require("../app.js");

test("publish summary uses selected, ready, and pending counts", () => {
  assert.equal(
    formatPublishSummary({ selected: 4, ready: 1, attention: 3 }),
    "已选 4 个渠道 · 1 个就绪 · 3 个待确认"
  );
});

test("product state normalizes the article, channels, versions, tasks, and capabilities", () => {
  const state = createProductState();
  const channelIds = new Set(state.channels.map((channel) => channel.id));
  const versionIds = new Set(
    state.channelVersions.map((version) => version.id)
  );

  assert.equal(state.currentArticle.id, "article-agent-workflow");
  assert.equal(state.channels.length, 14);
  assert.equal(state.platformCapabilities.length, 14);
  assert.equal(state.channelVersions.length, 14);
  assert.equal(state.publishTasks.length, 14);
  assert.ok(
    state.channelVersions.every(
      (version) =>
        version.articleId === state.currentArticle.id &&
        channelIds.has(version.channelId)
    )
  );
  assert.ok(
    state.publishTasks.every((task) =>
      versionIds.has(task.channelVersionId)
    )
  );
});

test("channel views are derived from normalized product records", () => {
  const state = createProductState();
  const views = getChannelViews(state);
  const blog = views.find((channel) => channel.id === "blog");
  const csdn = views.find((channel) => channel.id === "csdn");

  assert.equal(blog.statusCode, PUBLISH_STATUS.READY);
  assert.equal(blog.capability.supportsAutomaticPublish, true);
  assert.equal(csdn.account.authorizationStatus, "expired");
  assert.equal(csdn.validationIssues.length, 1);
});

test("publish batches only execute selected ready tasks", () => {
  const state = createProductState();
  const result = createPublishBatch(state, {
    schedule: "now",
    strategy: "automatic-first",
    postActions: ["write-back", "notify"],
  });

  assert.equal(result.batch.taskIds.length, 1);
  assert.equal(result.batch.status, PUBLISH_STATUS.PUBLISHED);
  assert.equal(result.readyChannels[0].id, "blog");
  assert.equal(
    result.state.publishTasks.find((task) => task.channelId === "blog").status,
    PUBLISH_STATUS.PUBLISHED
  );
});

test("queued tasks are not counted as waiting for confirmation", () => {
  const result = createPublishBatch(createProductState(), {
    schedule: "now",
  });

  assert.deepEqual(summarizeSelection(getChannelViews(result.state)), {
    selected: 4,
    ready: 0,
    attention: 3,
  });
});

test("preview decisions expose missing items and risks for manual channels", () => {
  const decision = createPreviewDecision(
    createProductState(),
    "xiaohongshu"
  );

  assert.equal(decision.platform, "小红书");
  assert.equal(decision.type, "图文");
  assert.equal(decision.method, "复制发布");
  assert.ok(decision.missingItems.includes("封面终审"));
  assert.ok(decision.riskNotes.length > 0);
});

test("deliverable display is capped at four items with an overflow count", () => {
  assert.deepEqual(
    getVisibleDeliverables(["标题", "封面", "脚本", "话题", "视频描述"]),
    {
      visible: ["标题", "封面", "脚本", "话题"],
      overflow: 1,
    }
  );
});

test("canonical authorization and retry transitions preserve history", () => {
  const state = createProductState();
  const authorized = applyChannelTransition(state, "csdn", "authorize");
  const retried = applyChannelTransition(state, "itpub", "retry");

  assert.equal(
    authorized.channels.find((channel) => channel.id === "csdn").account
      .authorizationStatus,
    "authorized"
  );
  assert.equal(
    authorized.channelVersions.find(
      (version) => version.channelId === "csdn"
    ).status,
    PUBLISH_STATUS.NEEDS_REVIEW
  );
  assert.equal(
    retried.publishTasks.find((task) => task.channelId === "itpub")
      .retryCount,
    1
  );
  assert.equal(
    retried.publishTasks.find((task) => task.channelId === "itpub")
      .lastError,
    null
  );
});

test("groups every channel into the four publishing stages", () => {
  const channels = createChannelData();
  const grouped = groupChannels(channels);

  assert.deepEqual(Object.keys(grouped), Object.keys(CHANNEL_GROUPS));
  assert.equal(Object.values(grouped).flat().length, 14);
  assert.equal(grouped.repurpose.length, 3);
  assert.ok(grouped.exceptions.some((channel) => channel.platform === "CSDN"));
});

test("only the self-hosted blog is initially marked for automatic publishing", () => {
  const automatic = createChannelData().filter(
    (channel) => channel.group === "automatic"
  );

  assert.deepEqual(
    automatic.map((channel) => channel.id),
    ["blog"]
  );
  assert.equal(automatic[0].method, "自动发布");
});

test("third-party article platforms use conservative assisted workflows", () => {
  const thirdPartyArticles = createChannelData().filter(
    (channel) => channel.type === "文章" && channel.id !== "blog"
  );

  assert.ok(
    thirdPartyArticles.every(
      (channel) =>
        channel.group !== "automatic" &&
        ["生成草稿", "复制发布"].includes(channel.method)
    )
  );
});

test("repurposed channels expose channel-specific generation deliverables", () => {
  const channels = createChannelData();
  const douyin = channels.find((channel) => channel.id === "douyin");
  const xiaohongshu = channels.find(
    (channel) => channel.id === "xiaohongshu"
  );
  const bilibili = channels.find((channel) => channel.id === "bilibili");

  assert.deepEqual(douyin.deliverables, ["标题", "封面", "脚本", "话题", "视频描述"]);
  assert.deepEqual(xiaohongshu.deliverables, ["标题", "封面", "话题", "摘要"]);
  assert.deepEqual(bilibili.deliverables, ["标题", "封面", "脚本", "简介"]);
});

test("ready channels only include selected publishable destinations", () => {
  const channels = createChannelData().map((channel) => ({
    ...channel,
    selected: channel.id === "blog" || channel.id === "juejin" || channel.id === "csdn",
  }));

  assert.deepEqual(
    getReadyChannels(channels).map((channel) => channel.id),
    ["blog"]
  );
});

test("selection summary separates selected, ready, and attention counts", () => {
  const channels = createChannelData().map((channel) => ({
    ...channel,
    selected: ["blog", "juejin", "xiaohongshu", "csdn"].includes(channel.id),
  }));

  assert.deepEqual(summarizeSelection(channels), {
    selected: 4,
    ready: 1,
    attention: 3,
  });
});

test("confirming a third-party draft does not pretend it became automatic", () => {
  const channel = createChannelData().find((item) => item.id === "juejin");
  const confirmed = transitionChannel(channel, "confirm");

  assert.equal(confirmed.group, "drafts");
  assert.equal(confirmed.status, "待处理");
  assert.equal(confirmed.progress, 100);
  assert.equal(confirmed.action, "查看预览");
});

test("authorization resumes adaptation without pretending publication is ready", () => {
  const channel = createChannelData().find((item) => item.id === "csdn");
  const authorized = transitionChannel(channel, "authorize");

  assert.equal(authorized.auth, "已授权");
  assert.equal(authorized.group, "drafts");
  assert.equal(authorized.status, "待确认");
  assert.equal(authorized.progress, 86);
});

test("publish estimate scales with ready channels and scheduled overhead", () => {
  assert.equal(estimatePublishMinutes(0, false), 0);
  assert.equal(estimatePublishMinutes(3, false), 3);
  assert.equal(estimatePublishMinutes(3, true), 4);
});

test("compact drawers can rise above the global panel scrim", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "styles.css"),
    "utf8"
  );
  const workspaceBlock = css.match(/\.workspace\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.doesNotMatch(workspaceBlock, /z-index/);
  assert.match(css, /\.panel-scrim\s*\{[^}]*z-index:\s*34/s);
  assert.match(css, /\.publish-queue\s*\{[^}]*z-index:\s*40/s);
  assert.match(css, /\.workspace-sidebar\.is-open\s*\{[^}]*z-index:\s*40/s);
});

test("hidden application views cannot be overridden by layout display rules", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "styles.css"),
    "utf8"
  );

  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});

test("article metrics update from editable title, summary, and body text", () => {
  assert.deepEqual(
    calculateArticleMetrics({
      title: "一文多发",
      summary: "本地工作台",
      bodyText: "正文内容".repeat(100),
    }),
    {
      wordCount: 409,
      readingMinutes: 2,
      seoSummaryLength: 5,
    }
  );
});

test("editing the source article marks every channel version for adaptation", () => {
  const state = updateArticleContent(
    createProductState(),
    { title: "更新后的文章标题" },
    "2026-06-13T16:00:00.000Z"
  );

  assert.equal(state.currentArticle.title, "更新后的文章标题");
  assert.equal(state.currentArticle.updatedAt, "2026-06-13T16:00:00.000Z");
  assert.ok(
    state.channelVersions.every(
      (version) => version.versionStatus === "needs_adaptation"
    )
  );
  assert.equal(
    getChannelViews(state).find((channel) => channel.id === "blog").action,
    "重新适配"
  );
});

test("re-adaptation restores an authorized stale version to review", () => {
  const stale = updateArticleContent(createProductState(), {
    summary: "摘要已经变化",
  });
  const adapted = readaptChannelVersion(
    stale,
    "juejin",
    "2026-06-13T16:10:00.000Z"
  );
  const version = adapted.channelVersions.find(
    (item) => item.channelId === "juejin"
  );

  assert.equal(version.versionStatus, "current");
  assert.equal(version.status, PUBLISH_STATUS.NEEDS_REVIEW);
  assert.equal(
    adapted.publishTasks.find((task) => task.channelId === "juejin").action,
    "确认"
  );
});

test("confirming a current version makes it ready without changing delivery method", () => {
  const state = createProductState();
  const confirmed = confirmChannelVersion(state, "juejin");
  const view = getChannelViews(confirmed).find(
    (channel) => channel.id === "juejin"
  );

  assert.equal(view.statusCode, PUBLISH_STATUS.READY);
  assert.equal(view.method, "生成草稿");
  assert.equal(view.selected, true);
});

test("publish history derives counts and can be reused as a new selection", () => {
  let state = confirmChannelVersion(createProductState(), "juejin");
  const result = createPublishBatch(state, {
    schedule: "now",
    strategy: "自动优先，失败重试",
  });
  state = result.state;
  const rows = getPublishHistoryRows(state);
  const reused = reusePublishBatch(state, result.batch.id);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].articleTitle, state.currentArticle.title);
  assert.equal(rows[0].channelCount, 2);
  assert.equal(rows[0].successCount, 1);
  assert.equal(rows[0].pendingCount, 1);
  assert.deepEqual(
    reused.channels
      .filter((channel) => channel.selected)
      .map((channel) => channel.id)
      .sort(),
    ["blog", "juejin"]
  );
});

test("persisted state merges workspace settings with current schema defaults", () => {
  const restored = mergePersistedState(createProductState(), {
    currentArticle: { title: "本地保存的标题" },
    workspaceSettings: { queueDensity: "compact" },
  });

  assert.equal(restored.currentArticle.title, "本地保存的标题");
  assert.equal(restored.currentArticle.id, "article-agent-workflow");
  assert.equal(restored.workspaceSettings.queueDensity, "compact");
  assert.equal(restored.channels.length, 14);
});

test("publish batches preserve immutable article and channel version snapshots", () => {
  const confirmed = confirmChannelVersion(createProductState(), "juejin");
  const published = createPublishBatch(confirmed, {
    now: "2026-06-14T08:00:00.000Z",
  });
  const before = getPublishBatchDetail(published.state, published.batch.id);
  const edited = updateArticleContent(
    published.state,
    {
      title: "发布后继续编辑的新标题",
      bodyHtml: "<p>新的正文</p>",
    },
    "2026-06-14T09:00:00.000Z"
  );
  const after = getPublishBatchDetail(edited, published.batch.id);
  const reused = reusePublishBatch(edited, published.batch.id);
  const afterReuse = getPublishBatchDetail(reused, published.batch.id);

  assert.equal(before.articleTitle, confirmed.currentArticle.title);
  assert.equal(after.articleTitle, confirmed.currentArticle.title);
  assert.notEqual(after.articleTitle, edited.currentArticle.title);
  assert.deepEqual(after.tasks, before.tasks);
  assert.deepEqual(afterReuse.tasks, before.tasks);
  assert.equal(edited.articleSnapshots.length, 1);
  assert.equal(edited.channelVersionSnapshots.length, 2);
});

test("article cover model includes platform crop foundations", () => {
  const cover = createProductState().currentArticle.cover;

  assert.equal(cover.sourceType, "generated");
  assert.deepEqual(Object.keys(cover).sort(), [
    "alt",
    "aspectRatio",
    "description",
    "platformCrops",
    "sourceType",
    "url",
  ]);
  assert.ok(cover.platformCrops.length >= 3);
});

test("content library derives draft and published entries from local state", () => {
  const published = createPublishBatch(createProductState(), {
    now: "2026-06-14T08:00:00.000Z",
  }).state;
  const rows = getContentLibraryRows(published);

  assert.ok(rows.some((row) => row.status === "草稿"));
  assert.ok(rows.some((row) => row.status === "已发布"));
  assert.ok(rows.every((row) => Number.isInteger(row.batchCount)));
});

test("browser app exposes a narrow bridge for the SaaS product shell", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "app.js"),
    "utf8"
  );

  assert.match(source, /window\.OneFlowApp\s*=/);
  assert.match(source, /getState\(\)/);
  assert.match(source, /openLegacyView\(view\)/);
  assert.match(source, /subscribe\(listener\)/);
  assert.match(source, /createNewArticle\(\)/);
  assert.match(source, /openImport\(\)/);
});
