import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { seedDatabase } from "../prisma/seed.js";
import { createTestApp, resetDatabase } from "./helpers.js";

let app;

before(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase(app);
});

after(async () => {
  await app.close();
});

async function seededCounts() {
  const prisma = app.prisma;
  return {
    users: await prisma.user.count(),
    workspaces: await prisma.workspace.count(),
    memberships: await prisma.workspaceMember.count(),
    subscriptions: await prisma.subscription.count(),
    articles: await prisma.article.count(),
    channels: await prisma.channelConfig.count(),
    capabilities: await prisma.aICapability.count(),
  };
}

test("development seed is repeatable without duplicate records", async () => {
  await seedDatabase(app.prisma);
  const first = await seededCounts();
  await seedDatabase(app.prisma);
  const second = await seededCounts();

  assert.deepEqual(second, first);
  assert.deepEqual(first, {
    users: 1,
    workspaces: 1,
    memberships: 1,
    subscriptions: 1,
    articles: 1,
    channels: 3,
    capabilities: 10,
  });
  const channels = await app.prisma.channelConfig.findMany();
  assert.ok(channels.every((channel) => channel.encryptedCredential === null));
});
