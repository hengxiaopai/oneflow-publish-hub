import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export async function registerSecurity(app, config) {
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigin.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-oneflow-dev-session"],
    exposedHeaders: ["x-request-id"],
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder(_request, context) {
      return {
        statusCode: 429,
        code: "RATE_LIMITED",
        message: "请求过于频繁，请稍后重试。",
        details: { retryAfter: context.after },
      };
    },
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!BODY_METHODS.has(request.method)) return;
    const contentLength = Number(request.headers["content-length"] || 0);
    if (!contentLength) return;
    const contentType = String(request.headers["content-type"] || "");
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return reply.failure(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "API 请求正文必须使用 JSON。",
      );
    }
  });
}
