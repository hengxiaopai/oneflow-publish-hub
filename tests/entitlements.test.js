const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PLAN_IDS,
  PLANS,
  canConnectChannel,
  canCreateArticle,
  canInviteMember,
  canPublishBatch,
  canSchedulePublish,
  canUseAICapability,
  canUseDataFeedback,
  canUseImageHost,
} = require("../entitlements.js");

function context(planId, usage = {}, extra = {}) {
  return {
    planId,
    usage: {
      articles: 0,
      publishBatches: 0,
      aiAdaptations: 0,
      connectedChannels: 0,
      members: 1,
      ...usage,
    },
    ...extra,
  };
}

test("plans expose stable Free, Pro, and Studio quota definitions", () => {
  assert.deepEqual(PLAN_IDS, ["free", "pro", "studio"]);
  assert.equal(PLANS.free.limits.articles, 20);
  assert.equal(PLANS.pro.limits.connectedChannels, 10);
  assert.equal(PLANS.studio.limits.articles, null);
  assert.equal(PLANS.studio.limits.teamMembers, 10);
});

test("article creation returns usage-aware decisions", () => {
  assert.deepEqual(canCreateArticle(context("free", { articles: 19 })), {
    allowed: true,
    reason: null,
    limit: 20,
    used: 19,
    remaining: 1,
  });
  assert.equal(
    canCreateArticle(context("free", { articles: 20 })).reason,
    "article_limit_reached"
  );
  assert.equal(
    canCreateArticle(context("studio", { articles: 5000 })).remaining,
    null
  );
});

test("channel and publish permissions differ by plan and quota", () => {
  assert.equal(
    canConnectChannel(context("free", { connectedChannels: 2 })).allowed,
    false
  );
  assert.equal(
    canConnectChannel(context("pro", { connectedChannels: 2 })).allowed,
    true
  );
  assert.equal(
    canPublishBatch(context("free", {}, { batchChannelCount: 2 })).reason,
    "batch_channel_limit_reached"
  );
  assert.equal(
    canPublishBatch(context("pro", { publishBatches: 199 })).allowed,
    true
  );
  assert.equal(
    canPublishBatch(context("pro", { publishBatches: 200 })).reason,
    "publish_batch_limit_reached"
  );
});

test("AI capability access checks both plan requirement and monthly usage", () => {
  assert.equal(
    canUseAICapability(
      context("free", {}, { capabilityId: "title_generation" })
    ).allowed,
    true
  );
  assert.equal(
    canUseAICapability(
      context("free", {}, { capabilityId: "douyin_script" })
    ).reason,
    "plan_upgrade_required"
  );
  assert.equal(
    canUseAICapability(
      context(
        "pro",
        { aiAdaptations: 1000 },
        { capabilityId: "douyin_script" }
      )
    ).reason,
    "ai_adaptation_limit_reached"
  );
});

test("team, image host, scheduling, and feedback remain paid entitlements", () => {
  assert.equal(canInviteMember(context("free")).allowed, false);
  assert.equal(canInviteMember(context("pro")).allowed, false);
  assert.equal(canInviteMember(context("studio")).allowed, true);
  assert.equal(canUseImageHost(context("free")).allowed, false);
  assert.equal(canUseImageHost(context("pro")).allowed, true);
  assert.equal(canSchedulePublish(context("free")).allowed, false);
  assert.equal(canSchedulePublish(context("studio")).allowed, true);
  assert.equal(canUseDataFeedback(context("free")).allowed, false);
  assert.equal(canUseDataFeedback(context("pro")).allowed, true);
});

test("unknown plans fail closed", () => {
  assert.deepEqual(canCreateArticle(context("enterprise-preview")), {
    allowed: false,
    reason: "unknown_plan",
    limit: 0,
    used: 0,
    remaining: 0,
  });
});
