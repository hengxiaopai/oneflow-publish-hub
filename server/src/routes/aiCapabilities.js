import {
  canUseAICapability,
  entitlementErrorDetails,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

function capabilityView(capability) {
  return {
    id: capability.id,
    capabilityId: capability.capabilityId,
    name: capability.name,
    enabled: capability.enabled,
    automaticExecution: capability.automaticExecution,
    humanConfirmation: capability.humanConfirmation,
    minimumPlan: capability.minimumPlan,
    promptTemplate: capability.promptTemplate,
    inputFields: JSON.parse(capability.inputFields || "[]"),
    outputFields: JSON.parse(capability.outputFields || "[]"),
  };
}

export async function aiCapabilityRoutes(app) {
  app.get(
    "/ai-capabilities",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const capabilities = await app.prisma.aICapability.findMany({
        where: { workspaceId: request.auth.workspaceId },
        orderBy: { createdAt: "asc" },
      });
      return reply.success(capabilities.map(capabilityView));
    },
  );

  app.post(
    "/ai-capabilities/:id/run",
    { preHandler: [app.authenticate, app.requireEditor] },
    async (request, reply) => {
      const capability = await app.prisma.aICapability.findFirst({
        where: {
          workspaceId: request.auth.workspaceId,
          capabilityId: request.params.id,
        },
      });
      if (!capability) {
        return reply.failure(404, "NOT_FOUND", "AI 能力不存在。");
      }
      const context = await getWorkspaceEntitlementContext(
        app.prisma,
        request.auth.workspaceId,
      );
      const decision = canUseAICapability({ ...context, capability });
      if (!decision.allowed) {
        return reply.failure(
          403,
          "ENTITLEMENT_LIMIT_EXCEEDED",
          "当前套餐无法运行这项 AI 能力。",
          entitlementErrorDetails(decision, "canUseAICapability"),
        );
      }
      return reply.failure(
        501,
        "AI_PROVIDER_NOT_CONFIGURED",
        "Phase 5 尚未接入真实 AI Provider。",
      );
    },
  );
}
