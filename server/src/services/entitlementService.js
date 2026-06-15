const PLAN_LIMITS = {
  free: {
    articles: 20,
    connectedChannels: 2,
    publishBatches: 10,
    aiAdaptations: 30,
    members: 1,
    imageHost: false,
    scheduledPublishing: false,
  },
  pro: {
    articles: 500,
    connectedChannels: 10,
    publishBatches: 200,
    aiAdaptations: 1000,
    members: 1,
    imageHost: true,
    scheduledPublishing: true,
  },
  studio: {
    articles: null,
    connectedChannels: 30,
    publishBatches: 1000,
    aiAdaptations: 5000,
    members: 10,
    imageHost: true,
    scheduledPublishing: true,
  },
};

const PLAN_RANK = { free: 0, pro: 1, studio: 2 };

function quotaDecision(planId, usage, field, reason) {
  const limits = PLAN_LIMITS[planId];
  if (!limits) {
    return { allowed: false, reason: "UNKNOWN_PLAN" };
  }
  const limit = limits[field];
  const used = Number(usage?.[field] || 0);
  if (limit === null) {
    return { allowed: true, reason: null, limit: null, used, remaining: null };
  }
  return {
    allowed: used < limit,
    reason: used < limit ? null : reason,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

export function canCreateArticle(context) {
  return quotaDecision(
    context.planId,
    context.usage,
    "articles",
    "ARTICLE_LIMIT_REACHED",
  );
}

export function canConnectChannel(context) {
  return quotaDecision(
    context.planId,
    context.usage,
    "connectedChannels",
    "CHANNEL_LIMIT_REACHED",
  );
}

export function canPublishBatch(context) {
  return quotaDecision(
    context.planId,
    context.usage,
    "publishBatches",
    "PUBLISH_BATCH_LIMIT_REACHED",
  );
}

export function canInviteMember(context) {
  return quotaDecision(
    context.planId,
    context.usage,
    "members",
    "TEAM_MEMBER_LIMIT_REACHED",
  );
}

export function canUseAICapability(context) {
  const requiredPlan = context.capability?.minimumPlan || "free";
  if (
    PLAN_RANK[context.planId] === undefined ||
    PLAN_RANK[context.planId] < PLAN_RANK[requiredPlan]
  ) {
    return { allowed: false, reason: "PLAN_UPGRADE_REQUIRED" };
  }
  return quotaDecision(
    context.planId,
    context.usage,
    "aiAdaptations",
    "AI_ADAPTATION_LIMIT_REACHED",
  );
}

export function canUseImageHost(context) {
  const allowed = Boolean(PLAN_LIMITS[context.planId]?.imageHost);
  return {
    allowed,
    reason: allowed ? null : "PLAN_UPGRADE_REQUIRED",
  };
}

export function canSchedulePublish(context) {
  const allowed = Boolean(
    PLAN_LIMITS[context.planId]?.scheduledPublishing,
  );
  return {
    allowed,
    reason: allowed ? null : "PLAN_UPGRADE_REQUIRED",
  };
}

export async function getWorkspaceEntitlementContext(prisma, workspaceId) {
  const period = new Date().toISOString().slice(0, 7);
  const [
    subscription,
    articles,
    connectedChannels,
    publishBatches,
    members,
    aiUsage,
  ] = await Promise.all([
    prisma.subscription.findUnique({ where: { workspaceId } }),
    prisma.article.count({ where: { workspaceId } }),
    prisma.channelConfig.count({
      where: {
        workspaceId,
        connectionStatus: { in: ["connected", "reauthorization_required"] },
      },
    }),
    prisma.publishBatch.count({
      where: {
        workspaceId,
        createdAt: {
          gte: new Date(`${period}-01T00:00:00.000Z`),
        },
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.usageRecord.aggregate({
      where: { workspaceId, period, type: "ai_adaptation" },
      _sum: { quantity: true },
    }),
  ]);

  return {
    planId: subscription?.planId || "free",
    period,
    usage: {
      articles,
      connectedChannels,
      publishBatches,
      members,
      aiAdaptations: aiUsage._sum.quantity || 0,
    },
  };
}

export { PLAN_LIMITS };
