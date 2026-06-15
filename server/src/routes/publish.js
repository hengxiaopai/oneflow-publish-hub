import {
  batchView,
  taskView,
} from "../services/publishService.js";
import {
  canPublishBatch,
  canSchedulePublish,
  entitlementErrorDetails,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

function errorResponse(request, reply, statusCode, code, message, details) {
  return reply.failure(statusCode, code, message, details);
}

export async function publishRoutes(app) {
  app.post(
    "/publish-batches",
    {
      preHandler: [app.authenticate, app.requireEditor],
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["articleId", "channelIds"],
          properties: {
            articleId: { type: "string", minLength: 1 },
            channelIds: {
              type: "array",
              minItems: 1,
              maxItems: 30,
              items: { type: "string", minLength: 1 },
            },
            strategy: { type: "string", maxLength: 80 },
            scheduleAt: { type: ["string", "null"], format: "date-time" },
            postActions: {
              type: "array",
              items: { type: "string", maxLength: 80 },
            },
          },
        },
      },
      config: {
        rateLimit: {
          max: app.config.publishRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const context = await getWorkspaceEntitlementContext(
        app.prisma,
        request.auth.workspaceId,
      );
      const publishDecision = canPublishBatch(context);
      if (!publishDecision.allowed) {
        return errorResponse(
          request,
          reply,
          403,
          "ENTITLEMENT_LIMIT_EXCEEDED",
          "当前套餐的发布批次额度已用完。",
          entitlementErrorDetails(publishDecision, "canPublishBatch"),
        );
      }
      if (request.body.scheduleAt) {
        const scheduleDecision = canSchedulePublish(context);
        if (!scheduleDecision.allowed) {
          return errorResponse(
            request,
            reply,
            403,
            "ENTITLEMENT_LIMIT_EXCEEDED",
            "当前套餐不支持定时发布。",
            entitlementErrorDetails(scheduleDecision, "canSchedulePublish"),
          );
        }
      }
      const result = await app.publishService.createBatch(
        request.auth.workspaceId,
        request.body,
      );
      if (result.error) {
        return errorResponse(
          request,
          reply,
          404,
          result.error,
          "文章或渠道不存在。",
        );
      }
      return reply.code(202).success(batchView(result.batch));
    },
  );

  app.get(
    "/publish-batches",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const batches = await app.prisma.publishBatch.findMany({
        where: { workspaceId: request.auth.workspaceId },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
      return reply.success(batches.map(batchView));
    },
  );

  app.get(
    "/publish-batches/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const batch = await app.publishService.findBatch(
        request.auth.workspaceId,
        request.params.id,
      );
      return batch
        ? reply.success(batchView(batch))
        : errorResponse(
            request,
            reply,
            404,
            "NOT_FOUND",
            "发布批次不存在。",
          );
    },
  );

  app.post(
    "/publish-tasks/:id/retry",
    {
      preHandler: [app.authenticate, app.requireEditor],
      config: {
        rateLimit: {
          max: app.config.publishRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const result = await app.publishService.retryTask(
        request.auth.workspaceId,
        request.params.id,
      );
      if (result.error === "TASK_NOT_FOUND") {
        return errorResponse(
          request,
          reply,
          404,
          "NOT_FOUND",
          "发布任务不存在。",
        );
      }
      if (result.error) {
        return errorResponse(
          request,
          reply,
          409,
          result.error,
          "当前任务不可重试。",
        );
      }
      return reply.code(202).success(taskView(result.task));
    },
  );
}
