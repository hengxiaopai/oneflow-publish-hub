export function createAuthMiddleware(sessionService) {
  return async function authenticate(request, reply) {
    const token = request.headers["x-oneflow-dev-session"];
    const session = sessionService.get(token);
    if (!session) {
      return reply.code(401).send({
        error: {
          code: "UNAUTHENTICATED",
          message: "请先创建本地开发会话。",
          requestId: request.id,
        },
      });
    }
    request.auth = session;
  };
}
