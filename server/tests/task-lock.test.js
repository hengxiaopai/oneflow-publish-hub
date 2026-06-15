import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

import { createTaskLockService } from "../src/services/taskLockService.js";
import { createTestApp, resetDatabase, startSession } from "./helpers.js";

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

async function createTask() {
  const session = await startSession(app, "lock-test");
  const workspaceId = session.body.data.workspace.id;
  const article = await app.prisma.article.create({
    data: {
      workspaceId,
      title: "Lock test",
      summary: "Lock",
      contentHtml: "<p>Lock</p>",
      contentMarkdown: "Lock",
    },
  });
  const batch = await app.prisma.publishBatch.create({
    data: {
      workspaceId,
      articleId: article.id,
      articleSnapshot: JSON.stringify({ title: article.title }),
    },
  });
  return app.prisma.publishTask.create({
    data: {
      workspaceId,
      publishBatchId: batch.id,
      status: "pending",
      channelVersionSnapshot: JSON.stringify({ title: article.title }),
    },
  });
}

test("only one worker acquires an active task lock", async () => {
  const task = await createTask();
  const locks = createTaskLockService(app.prisma, { ttlMs: 30_000 });
  const now = new Date("2026-06-15T10:00:00.000Z");

  assert.equal(
    await locks.acquireTaskLock(task.id, "worker-a", now),
    true,
  );
  assert.equal(
    await locks.acquireTaskLock(task.id, "worker-b", now),
    false,
  );

  await locks.releaseTaskLock(task.id, "worker-a");
  assert.equal(
    await locks.acquireTaskLock(task.id, "worker-b", now),
    true,
  );
});

test("an expired task lock can be recovered", async () => {
  const task = await createTask();
  const locks = createTaskLockService(app.prisma, { ttlMs: 10_000 });
  await app.prisma.publishTask.update({
    where: { id: task.id },
    data: {
      lockOwner: "dead-worker",
      lockedAt: new Date("2026-06-15T09:59:00.000Z"),
    },
  });

  const acquired = await locks.acquireTaskLock(
    task.id,
    "worker-recovery",
    new Date("2026-06-15T10:00:00.000Z"),
  );
  assert.equal(acquired, true);
});
