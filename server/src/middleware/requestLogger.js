export const LOGGER_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-oneflow-dev-session"]',
  "request.headers.authorization",
  "request.headers.cookie",
  'request.headers["x-oneflow-dev-session"]',
  "body.credential",
  "body.password",
  "body.token",
  "body.secret",
  "encryptedCredential",
  "*.credential",
  "*.password",
  "*.passwordHash",
  "*.tokenHash",
  "*.token",
  "*.secret",
  "*.encryptedCredential",
];

export function registerRequestLogger(app) {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        workspaceId: request.auth?.workspaceId,
      },
      "request completed",
    );
  });
}
