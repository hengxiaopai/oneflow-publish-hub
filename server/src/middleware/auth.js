export function createAuthMiddleware(sessionService) {
  return async function authenticate(request, reply) {
    const token = request.headers["x-oneflow-dev-session"];
    const session = sessionService.get(token);
    if (!session) {
      return reply.failure(
        401,
        "UNAUTHENTICATED",
        "请先创建本地开发会话。",
      );
    }
    request.auth = session;
  };
}
