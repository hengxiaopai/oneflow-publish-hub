import assert from "node:assert/strict";
import test from "node:test";
import {
  canConnectChannel,
  canCreateArticle,
  canInviteMember,
  canPublishBatch,
  canSchedulePublish,
  canUseAICapability,
  canUseImageHost,
} from "../src/services/entitlementService.js";

test("Free, Pro, and Studio enforce different server-side limits", () => {
  assert.equal(
    canCreateArticle({ planId: "free", usage: { articles: 19 } }).allowed,
    true,
  );
  assert.equal(
    canCreateArticle({ planId: "free", usage: { articles: 20 } }).reason,
    "ARTICLE_LIMIT_REACHED",
  );
  assert.equal(
    canConnectChannel({
      planId: "free",
      usage: { connectedChannels: 2 },
    }).reason,
    "CHANNEL_LIMIT_REACHED",
  );
  assert.equal(
    canPublishBatch({
      planId: "pro",
      usage: { publishBatches: 199 },
    }).allowed,
    true,
  );
  assert.equal(
    canPublishBatch({
      planId: "studio",
      usage: { publishBatches: 1000 },
    }).reason,
    "PUBLISH_BATCH_LIMIT_REACHED",
  );
});

test("paid feature entitlements fail closed on Free", () => {
  assert.equal(
    canInviteMember({ planId: "free", usage: { members: 1 } }).allowed,
    false,
  );
  assert.equal(canUseImageHost({ planId: "free", usage: {} }).allowed, false);
  assert.equal(canSchedulePublish({ planId: "free", usage: {} }).allowed, false);
  assert.equal(
    canUseAICapability({
      planId: "free",
      capability: { minimumPlan: "pro" },
      usage: { aiAdaptations: 0 },
    }).reason,
    "PLAN_UPGRADE_REQUIRED",
  );
  assert.equal(
    canUseAICapability({
      planId: "pro",
      capability: { minimumPlan: "pro" },
      usage: { aiAdaptations: 1000 },
    }).reason,
    "AI_ADAPTATION_LIMIT_REACHED",
  );
});
