import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);

test("Prisma schema defines the Phase 4 SaaS models and tenant snapshots", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  const models = [
    "User",
    "Workspace",
    "WorkspaceMember",
    "Article",
    "ChannelConfig",
    "ChannelVersion",
    "PublishBatch",
    "PublishTask",
    "AICapability",
    "UsageRecord",
    "Subscription",
  ];

  for (const model of models) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }

  for (const model of models.slice(2)) {
    const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(block, `missing ${model}`);
    assert.match(block[1], /\bworkspaceId\s+String\b/);
  }

  assert.match(schema, /articleSnapshot\s+String/);
  assert.match(schema, /channelVersionSnapshot\s+String/);
  assert.match(schema, /encryptedCredential\s+String\?/);
  assert.match(schema, /credentialStatus\s+String/);
});
