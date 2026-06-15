function authContext(context, sessionToken) {
  return {
    ...(sessionToken ? { sessionToken } : {}),
    user: {
      id: context.user.id,
      email: context.user.email || null,
      name: context.user.name,
      displayName: context.user.name,
      avatarUrl: context.user.avatarUrl || null,
    },
    workspace: {
      id: context.workspace.id,
      name: context.workspace.name,
      slug: context.workspace.slug,
      role: context.membership.role,
      plan: context.workspace.plan || "free",
    },
    subscription: {
      planId: context.workspace.plan || context.subscription?.planId || "free",
      status: context.subscription?.status || "active",
    },
  };
}

function requestMetadata(request) {
  return {
    userAgent: request.headers["user-agent"],
    ipAddress: request.ip,
  };
}

function cookieOptions(app) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: app.config.nodeEnv === "production",
    maxAge: app.config.sessionTtlHours * 60 * 60,
  };
}

const authBody = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", maxLength: 320 },
    password: { type: "string", minLength: 10, maxLength: 256 },
    name: { type: "string", minLength: 1, maxLength: 100 },
  },
};

export async function authRoutes(app) {
  app.post(
    "/auth/register",
    {
      schema: {
        body: {
          ...authBody,
          required: ["email", "password", "name"],
        },
      },
      config: {
        rateLimit: {
          max: app.config.authRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const result = await app.authService.register(
        request.body,
        requestMetadata(request),
      );
      if (!result.ok) {
        return reply.failure(
          409,
          result.code,
          "该邮箱已经注册，请直接登录。",
        );
      }
      reply.setCookie(
        app.config.sessionCookieName,
        result.context.token,
        cookieOptions(app),
      );
      return reply.code(201).success(authContext(result.context));
    },
  );

  app.post(
    "/auth/login",
    {
      schema: { body: authBody },
      config: {
        rateLimit: {
          max: app.config.authRateLimitMax,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const result = await app.authService.login(
        request.body,
        requestMetadata(request),
      );
      if (!result.ok) {
        const status = result.code === "WORKSPACE_ACCESS_DENIED" ? 403 : 401;
        return reply.failure(
          status,
          result.code,
          result.code === "INVALID_CREDENTIALS"
            ? "邮箱或密码不正确。"
            : "当前账号没有可访问的工作区。",
        );
      }
      reply.setCookie(
        app.config.sessionCookieName,
        result.context.token,
        cookieOptions(app),
      );
      return reply.success(authContext(result.context));
    },
  );

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
      if (app.config.nodeEnv === "production") {
        return reply.failure(
          404,
          "DEV_ONLY_DISABLED",
          "生产环境未启用本地开发会话。",
        );
      }
      const context = await app.sessionService.start(
        request.body?.profileKey || "default",
        requestMetadata(request),
      );
      return reply
        .code(201)
        .success(authContext(context, context.token));
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
        authContext({
          user: membership.user,
          workspace: membership.workspace,
          membership,
          subscription: membership.workspace.subscription,
        }),
      );
    },
  );

  app.post(
    "/auth/logout",
    { preHandler: app.authenticate },
    async (request, reply) => {
      await app.sessionService.destroyById(request.auth.sessionId);
      reply.clearCookie(app.config.sessionCookieName, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: app.config.nodeEnv === "production",
      });
      return reply.success(null);
    },
  );
}
