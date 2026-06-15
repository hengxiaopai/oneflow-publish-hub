function authContext(context, sessionToken) {
  return {
    sessionToken,
    user: {
      id: context.user.id,
      displayName: context.user.displayName,
    },
    workspace: {
      id: context.workspace.id,
      name: context.workspace.name,
      slug: context.workspace.slug,
      role: context.membership.role,
    },
    subscription: {
      planId: context.subscription?.planId || "free",
      status: context.subscription?.status || "active",
    },
  };
}

export async function authRoutes(app) {
  app.post(
    "/dev/session",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            profileKey: { type: "string", minLength: 1, maxLength: 80 },
          },
        },
      },
      config: {
        rateLimit: {
          max: app.config.devSessionRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const context = await app.sessionService.start(
        request.body?.profileKey || "default",
      );
      return reply.code(201).success(authContext(context, context.token));
    },
  );

  app.get(
    "/auth/me",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const membership = await app.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: request.auth.workspaceId,
            userId: request.auth.userId,
          },
        },
        include: {
          user: true,
          workspace: {
            include: { subscription: true },
          },
        },
      });
      return reply.success(
        authContext(
          {
            user: membership.user,
            workspace: membership.workspace,
            membership,
            subscription: membership.workspace.subscription,
          },
          undefined,
        ),
      );
    },
  );

  app.post(
    "/auth/logout",
    { preHandler: app.authenticate },
    async (request, reply) => {
      app.sessionService.destroy(request.headers["x-oneflow-dev-session"]);
      return reply.success(null);
    },
  );
}
