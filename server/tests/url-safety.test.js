import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeRemoteUrl,
  isPrivateAddress,
} from "../src/services/urlSafetyService.js";

const publicResolver = async () => [{ address: "203.0.113.10", family: 4 }];

test("private and metadata Halo URLs are rejected by default", async () => {
  const unsafe = [
    "http://localhost:8090",
    "http://127.0.0.1:8090",
    "http://0.0.0.0:8090",
    "http://10.0.0.4",
    "http://172.16.2.4",
    "http://192.168.1.9",
    "http://169.254.169.254/latest/meta-data",
    "http://metadata.google.internal",
    "http://[::1]:8090",
  ];

  for (const value of unsafe) {
    await assert.rejects(
      assertSafeRemoteUrl(value, {
        nodeEnv: "development",
        allowPrivateHaloUrls: false,
        resolveHost: publicResolver,
      }),
      (error) => error.code === "UNSAFE_REMOTE_URL",
      value,
    );
  }
});

test("development override allows private Halo URLs but production stays strict", async () => {
  const local = await assertSafeRemoteUrl("http://127.0.0.1:8090", {
    nodeEnv: "development",
    allowPrivateHaloUrls: true,
  });
  assert.equal(local.hostname, "127.0.0.1");

  await assert.rejects(
    assertSafeRemoteUrl("http://127.0.0.1:8090", {
      nodeEnv: "production",
      allowPrivateHaloUrls: true,
    }),
    (error) => error.code === "UNSAFE_REMOTE_URL",
  );
});

test("production requires HTTPS and unsafe schemes are always rejected", async () => {
  await assert.rejects(
    assertSafeRemoteUrl("http://blog.example.test", {
      nodeEnv: "production",
      resolveHost: publicResolver,
    }),
    (error) => error.code === "UNSAFE_REMOTE_URL",
  );

  for (const value of [
    "file:///etc/passwd",
    "gopher://example.test",
    "ftp://example.test",
  ]) {
    await assert.rejects(
      assertSafeRemoteUrl(value, {
        nodeEnv: "development",
        resolveHost: publicResolver,
      }),
      (error) => error.code === "UNSAFE_REMOTE_URL",
    );
  }
});

test("resolved private addresses are rejected to reduce DNS rebinding risk", async () => {
  await assert.rejects(
    assertSafeRemoteUrl("https://blog.example.test", {
      nodeEnv: "production",
      resolveHost: async () => [{ address: "10.1.2.3", family: 4 }],
    }),
    (error) => error.code === "UNSAFE_REMOTE_URL",
  );
  assert.equal(isPrivateAddress("192.168.1.4"), true);
  assert.equal(isPrivateAddress("203.0.113.4"), false);
});
