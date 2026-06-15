import {
  channelView,
  createChannelData,
  updateChannelData,
  validateStoredCredential,
} from "../services/channelService.js";
import {
  canConnectChannel,
  entitlementErrorDetails,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

const channelProperties = {
  platformId: { type: "string", minLength: 1, maxLength: 80 },
  displayName: { type: "string", minLength: 1, maxLength: 120 },
  channelType: {
    type: "string",
    enum: ["article", "image_text", "short_video"],
  },
  configuration: { type: "object", additionalProperties: true },
  credential: { type: "string", minLength: 1, maxLength: 10000 },
  mockBehavior: {
    type: "string",
    enum: ["success", "failure", "fail_once"],
  },
};

function notFound(request, reply) {
  return reply.failure(404, "NOT_FOUND", "渠道连接不存在。");
}

export async function channelRoutes(app) {
  app.get(
    "/channels",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const channels = await app.prisma.channelConfig.findMany({
        where: { workspaceId: request.auth.workspaceId },
        orderBy: { createdAt: "asc" },
      });
      return reply.success(channels.map(channelView));
    },
  );

  app.post(
    "/channels",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["platformId", "displayName"],
          properties: channelProperties,
        },
      },
    },
    async (request, reply) => {
      const context = await getWorkspaceEntitlementContext(
        app.prisma,
        request.auth.workspaceId,
      );
      const decision = canConnectChannel(context);
      if (!decision.allowed) {
        return reply.failure(
          403,
          "ENTITLEMENT_LIMIT_EXCEEDED",
          "当前套餐的渠道连接额度已用完。",
          entitlementErrorDetails(decision, "canConnectChannel"),
        );
      }
      const channel = await app.prisma.channelConfig.create({
        data: {
          workspaceId: request.auth.workspaceId,
          ...createChannelData(request.body, app.config.encryptionKey),
        },
      });
      return reply.code(201).success(channelView(channel));
    },
  );

  app.put(
    "/channels/:id",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: channelProperties,
        },
      },
    },
    async (request, reply) => {
      const existing = await app.prisma.channelConfig.findFirst({
        where: {
          id: request.params.id,
          workspaceId: request.auth.workspaceId,
        },
      });
      if (!existing) return notFound(request, reply);
      const channel = await app.prisma.channelConfig.update({
        where: { id: existing.id },
        data: updateChannelData(request.body, app.config.encryptionKey),
      });
      return reply.success(channelView(channel));
    },
  );

  app.post(
    "/channels/:id/test",
    { preHandler: [app.authenticate, app.requireAdmin] },
    async (request, reply) => {
      const existing = await app.prisma.channelConfig.findFirst({
        where: {
          id: request.params.id,
          workspaceId: request.auth.workspaceId,
        },
      });
      if (!existing) return notFound(request, reply);
      const validation = validateStoredCredential(
        existing,
        app.config.encryptionKey,
      );
      const channel = await app.prisma.channelConfig.update({
        where: { id: existing.id },
        data: {
          credentialStatus: validation.status,
          connectionStatus: validation.ok ? "connected" : "invalid",
          lastVerifiedAt: new Date(),
        },
      });
      return reply.success(channelView(channel));
    },
  );
}
