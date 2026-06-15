import { buildApp } from "../src/index.js";

export async function createTestApp(config = {}) {
  return buildApp({
    config: {
      nodeEnv: "test",
      port: 4174,
      databaseUrl: process.env.DATABASE_URL || "file:./test.db",
      encryptionKey:
        process.env.ENCRYPTION_KEY ||
        "oneflow-test-encryption-key-not-for-production",
      sessionSecret: "oneflow-test-session-secret-not-for-production",
      corsOrigin: ["http://127.0.0.1:4173"],
      bodyLimit: 3 * 1024 * 1024,
      devSessionRateLimitMax: 20,
      publishRateLimitMax: 30,
      isTest: true,
      ...config,
    },
    logger: false,
  });
}

export async function resetDatabase(app) {
  const prisma = app.prisma;
  await prisma.session.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.publishTask.deleteMany();
  await prisma.publishBatch.deleteMany();
  await prisma.channelVersion.deleteMany();
  await prisma.channelConfig.deleteMany();
  await prisma.article.deleteMany();
  await prisma.aICapability.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  await app.sessionService.clear();
}

export async function startSession(app, profileKey = "default") {
  const response = await app.inject({
    method: "POST",
    url: "/api/dev/session",
    payload: { profileKey },
  });
  return {
    response,
    body: response.json(),
    headers: {
      "x-oneflow-dev-session": response.json().data.sessionToken,
    },
  };
}
