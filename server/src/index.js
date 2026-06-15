import cors from "@fastify/cors";
import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { createPrismaClient } from "./db.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { articleRoutes } from "./routes/articles.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { channelRoutes } from "./routes/channels.js";
import { publishRoutes } from "./routes/publish.js";
import { usageRoutes } from "./routes/usage.js";
import { createSessionService } from "./services/sessionService.js";
import { createMockPublisherService } from "./services/mockPublisherService.js";
import { createPublishService } from "./services/publishService.js";

export async function buildApp(options = {}) {
  const config = loadConfig(options.config);
  const app = Fastify({
    logger: options.logger ?? !config.isTest,
  });
  const prisma = options.prisma || createPrismaClient(config.databaseUrl);
  const sessionService = createSessionService(prisma);
  const mockPublisher = createMockPublisherService(prisma);
  const publishService = createPublishService(prisma, mockPublisher);

  app.decorate("config", config);
  app.decorate("prisma", prisma);
  app.decorate("sessionService", sessionService);
  app.decorate("mockPublisher", mockPublisher);
  app.decorate("publishService", publishService);
  app.decorate("authenticate", createAuthMiddleware(sessionService));
  app.decorateRequest("auth", null);

  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-oneflow-dev-session"],
  });

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(workspaceRoutes);
      await api.register(articleRoutes);
      await api.register(channelRoutes);
      await api.register(publishRoutes);
      await api.register(usageRoutes);
    },
    { prefix: "/api" },
  );

  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_FAILED",
          message: "请求字段不符合接口要求。",
          details: error.validation,
          requestId: request.id,
        },
      });
    }
    request.log.error({ err: error }, "request failed");
    return reply.code(error.statusCode || 500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "服务暂时无法处理该请求。",
        requestId: request.id,
      },
    });
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  await app.ready();
  return app;
}

async function start() {
  const app = await buildApp();
  await app.listen({
    port: app.config.port,
    host: app.config.host,
  });
}

const isEntryPoint =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntryPoint) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
