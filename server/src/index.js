import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { createPrismaClient } from "./db.js";
import { registerResponseHelpers } from "./http/response.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createRoleGuard } from "./services/rbacService.js";
import { registerErrorHandler } from "./middleware/errorHandler.js";
import {
  LOGGER_REDACT_PATHS,
  registerRequestLogger,
} from "./middleware/requestLogger.js";
import { registerSecurity } from "./middleware/security.js";
import { openApiRoutes } from "./openapi.js";
import { authRoutes } from "./routes/auth.js";
import { articleRoutes } from "./routes/articles.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { channelRoutes } from "./routes/channels.js";
import { haloChannelRoutes } from "./routes/haloChannels.js";
import { publishRoutes } from "./routes/publish.js";
import { usageRoutes } from "./routes/usage.js";
import { aiCapabilityRoutes } from "./routes/aiCapabilities.js";
import { createSessionService } from "./services/sessionService.js";
import { createAuthService } from "./services/authService.js";
import { createMockPublisherService } from "./services/mockPublisherService.js";
import { createPublishService } from "./services/publishService.js";
import { createHaloPublisherService } from "./services/publishers/haloPublisherService.js";
import { createHaloPublishWorkerService } from "./services/haloPublishWorkerService.js";
import { createPublisherRouterService } from "./services/publisherRouterService.js";

export async function buildApp(options = {}) {
  const config = loadConfig(options.config);
  const app = Fastify({
    bodyLimit: config.bodyLimit,
    logger:
      options.logger ??
      (config.isTest
        ? false
        : {
            redact: {
              paths: LOGGER_REDACT_PATHS,
              censor: "[REDACTED]",
            },
          }),
  });
  const prisma = options.prisma || createPrismaClient(config.databaseUrl);
  const sessionService = createSessionService(prisma, {
    sessionSecret: config.sessionSecret,
    sessionTtlHours: config.sessionTtlHours,
  });
  const authService = createAuthService(prisma, sessionService);
  const mockPublisher = createMockPublisherService(prisma);
  const haloPublisher = createHaloPublisherService({
    encryptionKey: config.encryptionKey,
    fetchImpl: options.fetchImpl || globalThis.fetch,
    timeoutMs: options.haloTimeoutMs || config.haloRequestTimeoutMs,
    nodeEnv: config.nodeEnv,
    allowPrivateHaloUrls: config.allowPrivateHaloUrls,
    resolveHost: options.resolveHaloHost,
  });
  const haloPublisherWorker = createHaloPublishWorkerService(
    prisma,
    haloPublisher,
  );
  const publisherRouter = createPublisherRouterService(prisma, {
    mockPublisher,
    haloPublisherWorker,
  });
  const publishService = createPublishService(prisma, publisherRouter);

  app.decorate("config", config);
  app.decorate("prisma", prisma);
  app.decorate("sessionService", sessionService);
  app.decorate("authService", authService);
  app.decorate("mockPublisher", mockPublisher);
  app.decorate("haloPublisher", haloPublisher);
  app.decorate("publisherRouter", publisherRouter);
  app.decorate("publishService", publishService);
  app.decorate("authenticate", createAuthMiddleware(sessionService, config));
  app.decorate("requireEditor", createRoleGuard("editor"));
  app.decorate("requireAdmin", createRoleGuard("admin"));
  app.decorate("requireOwner", createRoleGuard("owner"));
  app.decorateRequest("auth", null);
  registerResponseHelpers(app);
  registerRequestLogger(app);
  registerErrorHandler(app);

  await app.register(cookie);
  await registerSecurity(app, config);

  await app.register(
    async (api) => {
      await api.register(openApiRoutes);
      await api.register(authRoutes);
      await api.register(workspaceRoutes);
      await api.register(articleRoutes);
      await api.register(channelRoutes);
      await api.register(haloChannelRoutes);
      await api.register(publishRoutes);
      await api.register(usageRoutes);
      await api.register(aiCapabilityRoutes);
    },
    { prefix: "/api" },
  );

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
