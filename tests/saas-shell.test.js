const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  AI_CAPABILITIES,
  ROUTES,
  buildChannelConnectionViews,
  buildDashboardModel,
  createSaasState,
  enterCloudPlaceholder,
  enterLocalDevelopment,
  normalizeHash,
  toggleAICapability,
} = require("../saas-shell.js");
const { createProductState } = require("../app.js");

test("all confirmed SaaS hashes normalize and unknown routes fall back by mode", () => {
  assert.deepEqual(Object.values(ROUTES), [
    "#/login",
    "#/dashboard",
    "#/articles",
    "#/workbench",
    "#/publish-history",
    "#/channels",
    "#/media",
    "#/ai-capabilities",
    "#/billing",
    "#/team",
    "#/settings",
  ]);
  assert.equal(normalizeHash("#/billing", "local"), "#/billing");
  assert.equal(normalizeHash("#/unknown", "local"), "#/dashboard");
  assert.equal(normalizeHash("", null), "#/login");
});

test("local development entry is explicit and cloud mode remains a placeholder", () => {
  assert.deepEqual(enterLocalDevelopment(createSaasState()), {
    ...createSaasState(),
    sessionMode: "local",
    cloudAuthStatus: "not_connected",
    activeRoute: "#/workbench",
  });
  assert.deepEqual(enterCloudPlaceholder(createSaasState()), {
    ...createSaasState(),
    sessionMode: null,
    cloudAuthStatus: "placeholder",
    activeRoute: "#/login",
  });
});

test("dashboard task center derives operational counts from workspace state", () => {
  const workspace = createProductState();
  const dashboard = buildDashboardModel(workspace, createSaasState());

  assert.equal(dashboard.recentArticle.id, workspace.currentArticle.id);
  assert.equal(dashboard.awaitingReview, 7);
  assert.equal(dashboard.failedTasks, 1);
  assert.equal(dashboard.authorizationIssues, 2);
  assert.equal(dashboard.usage.publishBatches.limit, 10);
  assert.equal(dashboard.usage.aiAdaptations.limit, 30);
});

test("channel connection projections never expose credential fields", () => {
  const workspace = createProductState();
  workspace.channels[0].account.token = "must-not-render";
  workspace.channels[0].account.apiKey = "must-not-render";
  const views = buildChannelConnectionViews(workspace, "local");
  const serialized = JSON.stringify(views);

  assert.equal(views.length, 14);
  assert.doesNotMatch(serialized, /must-not-render|token|apiKey/i);
  assert.equal(views[0].credentialStorage, "服务端加密托管");
  assert.equal(views[0].localDebugAvailable, true);
});

test("AI capabilities define reusable inputs, outputs, prompts, confirmation, and plans", () => {
  assert.equal(AI_CAPABILITIES.length, 10);
  assert.ok(
    AI_CAPABILITIES.every(
      (capability) =>
        capability.id &&
        capability.name &&
        capability.inputFields.length &&
        capability.outputFields.length &&
        capability.promptTemplate &&
        typeof capability.requiresHumanConfirmation === "boolean" &&
        capability.minimumPlan
    )
  );
});

test("AI toggles persist enabled state and block automatic execution without entitlement", () => {
  const state = createSaasState();
  const enabled = toggleAICapability(
    state,
    "title_generation",
    "enabled",
    "free"
  );
  const blocked = toggleAICapability(
    enabled,
    "douyin_script",
    "automatic",
    "free"
  );
  const allowed = toggleAICapability(
    enabled,
    "title_generation",
    "automatic",
    "free"
  );

  assert.equal(enabled.aiPreferences.title_generation.enabled, false);
  assert.equal(blocked.lastDecision.reason, "plan_upgrade_required");
  assert.equal(allowed.aiPreferences.title_generation.automatic, true);
});

test("SaaS shell source contains no token input or credential value rendering", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "saas-shell.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /type=["']password["']/i);
  assert.doesNotMatch(source, /\.token\b|\.apiKey\b|authorizationHeader/i);
});

test("HTML declares every SaaS route surface and loads shell scripts after the workbench", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8"
  );
  const requiredIds = [
    "login-view",
    "dashboard-view",
    "workbench-view",
    "publish-history-view",
    "content-library-view",
    "channels-view",
    "media-view",
    "ai-capabilities-view",
    "billing-view",
    "team-view",
    "settings-view",
  ];

  requiredIds.forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /id="enter-local-mode"/);
  assert.match(html, /id="show-cloud-placeholder"/);
  assert.match(html, /id="product-menu"/);
  assert.match(html, /href="#\/dashboard"/);
  assert.match(html, /href="#\/workbench"/);
  assert.match(html, /src="entitlements\.js\?v=1"/);
  assert.match(html, /src="saas-shell\.js\?v=1"/);
  assert.ok(
    html.indexOf('src="app.js?v=') <
      html.indexOf('src="saas-shell.js?v=1"')
  );
});
