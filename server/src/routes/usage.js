import {
  PLAN_LIMITS,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

function quota(used, limit) {
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
  };
}

export async function usageRoutes(app) {
  app.get("/usage", { preHandler: app.authenticate }, async (request) => {
    const context = await getWorkspaceEntitlementContext(
      app.prisma,
      request.auth.workspaceId,
    );
    const limits = PLAN_LIMITS[context.planId];

    return {
      data: {
        planId: context.planId,
        period: context.period,
        articles: quota(context.usage.articles, limits.articles),
        connectedChannels: quota(
          context.usage.connectedChannels,
          limits.connectedChannels,
        ),
        publishBatches: quota(
          context.usage.publishBatches,
          limits.publishBatches,
        ),
        aiAdaptations: quota(
          context.usage.aiAdaptations,
          limits.aiAdaptations,
        ),
        members: quota(context.usage.members, limits.members),
        capabilities: {
          imageHost: limits.imageHost,
          scheduledPublishing: limits.scheduledPublishing,
        },
      },
    };
  });
}
