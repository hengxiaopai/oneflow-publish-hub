import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

import {
  createPublishTaskEventService,
  sanitizeEventMetadata,
} from "../src/services/publishTaskEventService.js";
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

test("event metadata removes credentials recursively", () => {
  const sanitized = sanitizeEventMetadata({
    endpoint: "https://blog.example.test",
    authorization: "Bearer pat-secret",
    nested: {
      token: "pat-secret",
      response: { status: 503 },
    },
  });

  assert.equal(sanitized.authorization, "[REDACTED]");
  assert.equal(sanitized.nested.token, "[REDACTED]");
  assert.equal(sanitized.nested.response.status, 503);
  assert.equal(JSON.stringify(sanitized).includes("pat-secret"), false);
});

test("task events are stored in chronological order without secrets", async () => {
  const session = await startSession(app, "event-test");
  const workspaceId = session.body.data.workspace.id;
  const article = await app.prisma.article.create({
    data: {
      workspaceId,
      title: "Event test",
      summary: "Events",
      contentHtml: "<p>Events</p>",
      contentMarkdown: "Events",
    },
  });
  const batch = await app.prisma.publishBatch.create({
    data: {
      workspaceId,
      articleId: article.id,
      articleSnapshot: JSON.stringify({ title: article.title }),
    },
  });
  const task = await app.prisma.publishTask.create({
    data: {
      workspaceId,
      publishBatchId: batch.id,
      status: "pending",
      channelVersionSnapshot: JSON.stringify({ title: article.title }),
    },
  });
  const events = createPublishTaskEventService(app.prisma);

  await events.record(task, "task_created", "Task created", {
    credential: "pat-secret",
  });
  await events.record(task, "validation_started", "Validation started", {
    status: "validating",
  });

  const stored = await events.list(task.id);
  assert.deepEqual(
    stored.map((event) => event.type),
    ["task_created", "validation_started"],
  );
  assert.equal(JSON.stringify(stored).includes("pat-secret"), false);
  assert.equal(stored[0].metadata.credential, "[REDACTED]");
});
