import {
  channelView,
  createChannelData,
  updateChannelData,
} from "../services/channelService.js";
import {
  canConnectChannel,
  entitlementErrorDetails,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

const DEFAULT_ENDPOINT = "/apis/api.console.halo.run/v1alpha1";

const haloBody = {
  type: "object",
  additionalProperties: false,
  required: ["baseUrl", "consoleApiEndpoint", "publishMode"],
  properties: {
    displayName: { type: "string", minLength: 1, maxLength: 120 },
    baseUrl: { type: "string", minLength: 1, maxLength: 2000 },
    consoleApiEndpoint: { type: "string", minLength: 1, maxLength: 500 },
    credential: { type: "string", minLength: 1, maxLength: 10000 },
    publishMode: { type: "string", enum: ["draft", "publish"] },
    defaultCategory: {
      anyOf: [
        { type: "string", maxLength: 120 },
        {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1, maxLength: 120 },
        },
      ],
    },
    defaultTags: {
      type: "array",
      maxItems: 30,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    defaultOwner: { type: "string", maxLength: 120 },
    defaultCoverStrategy: {
      type: "string",
      enum: ["article_cover", "none"],
    },
  },
};

function haloConfiguration(input) {
  return {
    baseUrl: String(input.baseUrl || "").replace(/\/+$/, ""),
    consoleApiEndpoint:
      String(input.consoleApiEndpoint || DEFAULT_ENDPOINT).trim() ||
      DEFAULT_ENDPOINT,
    publishMode: input.publishMode,
    defaultCategory: input.defaultCategory || "",
    defaultTags: input.defaultTags || [],
    defaultOwner: input.defaultOwner || "",
    defaultCoverStrategy: input.defaultCoverStrategy || "article_cover",
  };
}

function emptyStatus() {
  return {
    platformId: "halo",
    displayName: "自建 Blog / Halo",
    channelType: "article",
    publisherMode: "halo",
    configuration: {
      consoleApiEndpoint: DEFAULT_ENDPOINT,
      publishMode: "draft",
      defaultTags: [],
      defaultCoverStrategy: "article_cover",
    },
    credentialStatus: "none",
    connectionStatus: "not_connected",
    lastTestedAt: null,
    lastTestStatus: null,
    lastTestMessage: null,
    credentialStorage: "server_managed",
  };
}

async function findHaloChannel(app, workspaceId) {
  return app.prisma.channelConfig.findFirst({
    where: { workspaceId, platformId: "halo" },
    orderBy: { createdAt: "asc" },
  });
}

export async function haloChannelRoutes(app) {
  app.get(
    "/channels/halo/status",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const channel = await findHaloChannel(app, request.auth.workspaceId);
      return reply.success(channel ? channelView(channel) : emptyStatus());
    },
  );

  app.post(
    "/channels/halo/connect",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: { body: haloBody },
      config: {
        rateLimit: {
          max: app.config.publishRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const existing = await findHaloChannel(app, request.auth.workspaceId);
      if (!existing) {
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
        if (!request.body.credential) {
          return reply.failure(
            400,
            "HALO_TOKEN_REQUIRED",
            "首次连接 Halo 时必须提供 PAT Token。",
          );
        }
      }

      const input = {
        platformId: "halo",
        displayName: request.body.displayName || existing?.displayName || "自建 Blog / Halo",
        channelType: "article",
        publisherMode: "halo",
        configuration: haloConfiguration(request.body),
        ...("credential" in request.body
          ? { credential: request.body.credential }
          : {}),
      };
      const data = existing
        ? {
            ...updateChannelData(input, app.config.encryptionKey),
            publisherMode: "halo",
            connectionStatus: "not_connected",
            lastTestStatus: null,
            lastTestMessage: null,
          }
        : {
            ...createChannelData(input, app.config.encryptionKey),
            publisherMode: "halo",
            connectionStatus: "not_connected",
          };
      const channel = existing
        ? await app.prisma.channelConfig.update({
            where: { id: existing.id },
            data,
          })
        : await app.prisma.channelConfig.create({
            data: {
              workspaceId: request.auth.workspaceId,
              ...data,
            },
          });
      return reply
        .code(existing ? 200 : 201)
        .success(channelView(channel));
    },
  );

  app.post(
    "/channels/halo/test",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      config: {
        rateLimit: {
          max: app.config.publishRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const channel = await findHaloChannel(app, request.auth.workspaceId);
      if (!channel) {
        return reply.failure(404, "NOT_FOUND", "Halo 渠道尚未配置。");
      }
      const testedAt = new Date();
      try {
        await app.haloPublisher.testConnection(channel);
        const updated = await app.prisma.channelConfig.update({
          where: { id: channel.id },
          data: {
            credentialStatus: "stored",
            connectionStatus: "connected",
            lastVerifiedAt: testedAt,
            lastTestedAt: testedAt,
            lastTestStatus: "success",
            lastTestMessage: "Halo Console API 连接成功。",
          },
        });
        return reply.success(channelView(updated));
      } catch (error) {
        const invalidCredential = [
          "HALO_AUTH_FAILED",
          "HALO_CREDENTIAL_INVALID",
        ].includes(error.code);
        await app.prisma.channelConfig.update({
          where: { id: channel.id },
          data: {
            credentialStatus: invalidCredential ? "invalid" : channel.credentialStatus,
            connectionStatus: invalidCredential ? "invalid" : "error",
            lastVerifiedAt: testedAt,
            lastTestedAt: testedAt,
            lastTestStatus: "failed",
            lastTestMessage: error.message,
          },
        });
        return reply.failure(
          error.statusCode || 502,
          error.code || "HALO_CONNECTION_FAILED",
          error.message || "Halo 连接测试失败。",
        );
      }
    },
  );

  app.post(
    "/channels/halo/clear-credential",
    { preHandler: [app.authenticate, app.requireAdmin] },
    async (request, reply) => {
      const channel = await findHaloChannel(app, request.auth.workspaceId);
      if (!channel) {
        return reply.failure(404, "NOT_FOUND", "Halo 渠道尚未配置。");
      }
      const updated = await app.prisma.channelConfig.update({
        where: { id: channel.id },
        data: {
          encryptedCredential: null,
          credentialStatus: "none",
          connectionStatus: "not_connected",
          lastTestStatus: null,
          lastTestMessage: "凭据已清除。",
        },
      });
      return reply.success(channelView(updated));
    },
  );
}
