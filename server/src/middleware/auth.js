export function createAuthMiddleware(sessionService, config) {
  return async function authenticate(request, reply) {
    const cookieToken = request.cookies?.[config.sessionCookieName];
    const devToken =
      config.nodeEnv === "production"
        ? null
        : request.headers["x-oneflow-dev-session"];
    const session = await sessionService.resolve(devToken || cookieToken);

    if (session.status === "forbidden") {
      return reply.failure(
        403,
        "WORKSPACE_ACCESS_DENIED",
        "当前用户已不再属于这个工作区。",
      );
    }
    if (session.status !== "active") {
      return reply.failure(401, "UNAUTHENTICATED", "请先登录 OneFlow。");
    }
    request.auth = session;
  };
}
