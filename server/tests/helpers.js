import { buildApp } from "../src/index.js";

export async function createTestApp() {
  return buildApp({
    config: {
      databaseUrl: process.env.DATABASE_URL || "file:./test.db",
      encryptionKey:
        process.env.ENCRYPTION_KEY ||
        "oneflow-test-encryption-key-not-for-production",
      corsOrigin: "http://127.0.0.1:4173",
      isTest: true,
    },
    logger: false,
  });
}

export async function resetDatabase(app) {
  const prisma = app.prisma;
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
  app.sessionService.clear();
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
