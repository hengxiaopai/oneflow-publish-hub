"use strict";

(function exposeEntitlements(globalScope) {
  const PLAN_IDS = Object.freeze(["free", "pro", "studio"]);
  const PLAN_RANK = Object.freeze({ free: 0, pro: 1, studio: 2 });

  const PLANS = Object.freeze({
    free: {
      id: "free",
      name: "Free",
      description: "适合验证一文多发工作流的个人创作者。",
      limits: {
        articles: 20,
        publishBatches: 10,
        aiAdaptations: 30,
        connectedChannels: 2,
        teamMembers: 1,
        channelsPerBatch: 1,
      },
      features: {
        imageHost: false,
        dataFeedback: false,
        scheduledPublishing: false,
        batchPublishing: "limited",
      },
    },
    pro: {
      id: "pro",
      name: "Pro",
      description: "适合持续创作并需要自动化发布的独立创作者。",
      limits: {
        articles: 500,
        publishBatches: 200,
        aiAdaptations: 1000,
        connectedChannels: 10,
        teamMembers: 1,
        channelsPerBatch: 10,
      },
      features: {
        imageHost: true,
        dataFeedback: true,
        scheduledPublishing: true,
        batchPublishing: true,
      },
    },
    studio: {
      id: "studio",
      name: "Studio / Team",
      description: "适合内容团队、工作室和多成员协作。",
      limits: {
        articles: null,
        publishBatches: 1000,
        aiAdaptations: 5000,
        connectedChannels: 30,
        teamMembers: 10,
        channelsPerBatch: 30,
      },
      features: {
        imageHost: true,
        dataFeedback: true,
        scheduledPublishing: true,
        batchPublishing: true,
      },
    },
  });

  const AI_CAPABILITY_MINIMUM_PLANS = Object.freeze({
    title_generation: "free",
    summary_generation: "free",
    seo_description: "free",
    tag_recommendation: "free",
    publish_risk_check: "free",
    platform_style_rewrite: "pro",
    xiaohongshu_copy: "pro",
    douyin_script: "pro",
    bilibili_package: "pro",
    wechat_formatting: "pro",
  });

  function unknownPlanDecision() {
    return {
      allowed: false,
      reason: "unknown_plan",
      limit: 0,
      used: 0,
      remaining: 0,
    };
  }

  function featureDecision(allowed, reason = null) {
    return {
      allowed,
      reason: allowed ? null : reason,
      limit: allowed ? null : 0,
      used: 0,
      remaining: allowed ? null : 0,
    };
  }

  function quotaDecision(plan, limitKey, used, reason) {
    const limit = plan.limits[limitKey];
    const normalizedUsed = Math.max(0, Number(used) || 0);
    if (limit === null) {
      return {
        allowed: true,
        reason: null,
        limit: null,
        used: normalizedUsed,
        remaining: null,
      };
    }
    const remaining = Math.max(0, limit - normalizedUsed);
    return {
      allowed: remaining > 0,
      reason: remaining > 0 ? null : reason,
      limit,
      used: normalizedUsed,
      remaining,
    };
  }

  function getPlan(context = {}) {
    return PLANS[context.planId] || null;
  }

  function canCreateArticle(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    return quotaDecision(
      plan,
      "articles",
      context.usage?.articles,
      "article_limit_reached"
    );
  }

  function canConnectChannel(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    return quotaDecision(
      plan,
      "connectedChannels",
      context.usage?.connectedChannels,
      "channel_limit_reached"
    );
  }

  function canPublishBatch(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    const channelCount = Math.max(1, Number(context.batchChannelCount) || 1);
    if (channelCount > plan.limits.channelsPerBatch) {
      return {
        allowed: false,
        reason: "batch_channel_limit_reached",
        limit: plan.limits.channelsPerBatch,
        used: channelCount,
        remaining: 0,
      };
    }
    return quotaDecision(
      plan,
      "publishBatches",
      context.usage?.publishBatches,
      "publish_batch_limit_reached"
    );
  }

  function canUseAICapability(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    const minimumPlan =
      AI_CAPABILITY_MINIMUM_PLANS[context.capabilityId] || "studio";
    if (PLAN_RANK[plan.id] < PLAN_RANK[minimumPlan]) {
      return {
        allowed: false,
        reason: "plan_upgrade_required",
        limit: plan.limits.aiAdaptations,
        used: Math.max(0, Number(context.usage?.aiAdaptations) || 0),
        remaining: Math.max(
          0,
          plan.limits.aiAdaptations -
            (Number(context.usage?.aiAdaptations) || 0)
        ),
      };
    }
    return quotaDecision(
      plan,
      "aiAdaptations",
      context.usage?.aiAdaptations,
      "ai_adaptation_limit_reached"
    );
  }

  function canInviteMember(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    return quotaDecision(
      plan,
      "teamMembers",
      context.usage?.members,
      "team_member_limit_reached"
    );
  }

  function canUseImageHost(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    return featureDecision(
      plan.features.imageHost,
      "plan_upgrade_required"
    );
  }

  function canSchedulePublish(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    return featureDecision(
      plan.features.scheduledPublishing,
      "plan_upgrade_required"
    );
  }

  function canUseDataFeedback(context = {}) {
    const plan = getPlan(context);
    if (!plan) return unknownPlanDecision();
    return featureDecision(
      plan.features.dataFeedback,
      "plan_upgrade_required"
    );
  }

  const api = {
    AI_CAPABILITY_MINIMUM_PLANS,
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
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalScope.OneFlowEntitlements = api;
})(typeof window !== "undefined" ? window : globalThis);
