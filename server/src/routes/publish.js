import {
  batchView,
  taskView,
} from "../services/publishService.js";
import {
  canPublishBatch,
  canSchedulePublish,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

function errorResponse(request, reply, statusCode, code, message) {
  return reply.code(statusCode).send({
    error: { code, message, requestId: request.id },
  });
}

export async function publishRoutes(app) {
  app.post(
    "/publish-batches",
    {
      preHandler: app.authenticate,
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
          publishDecision.reason,
          "当前套餐的发布批次额度已用完。",
        );
      }
      if (request.body.scheduleAt) {
        const scheduleDecision = canSchedulePublish(context);
        if (!scheduleDecision.allowed) {
          return errorResponse(
            request,
            reply,
            403,
            scheduleDecision.reason,
            "当前套餐不支持定时发布。",
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
      return reply.code(202).send({ data: batchView(result.batch) });
    },
  );

  app.get(
    "/publish-batches",
    { preHandler: app.authenticate },
    async (request) => {
      const batches = await app.prisma.publishBatch.findMany({
        where: { workspaceId: request.auth.workspaceId },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
      return { data: batches.map(batchView) };
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
        ? { data: batchView(batch) }
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
    { preHandler: app.authenticate },
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
      return reply.code(202).send({ data: taskView(result.task) });
    },
  );
}
