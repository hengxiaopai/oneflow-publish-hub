const test = require("node:test");
const assert = require("node:assert/strict");

function loadStorageModule() {
  let storageModule;
  assert.doesNotThrow(() => {
    storageModule = require("../storage.js");
  });
  return storageModule;
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("versioned local repository saves and restores a workspace snapshot", () => {
  const { createLocalStateStore } = loadStorageModule();
  const store = createLocalStateStore(createMemoryStorage(), {
    key: "oneflow-test",
    schemaVersion: 2,
    now: () => "2026-06-13T16:00:00.000Z",
  });
  const state = { article: { title: "持久化标题" } };

  assert.deepEqual(store.save(state), {
    ok: true,
    savedAt: "2026-06-13T16:00:00.000Z",
  });
  assert.deepEqual(store.load(), {
    ok: true,
    schemaVersion: 2,
    savedAt: "2026-06-13T16:00:00.000Z",
    state,
  });
});

test("local repository reports corrupt snapshots without throwing", () => {
  const { createLocalStateStore } = loadStorageModule();
  const storage = createMemoryStorage();
  storage.setItem("oneflow-test", "{broken");
  const store = createLocalStateStore(storage, { key: "oneflow-test" });

  const result = store.load();

  assert.equal(result.ok, false);
  assert.equal(result.state, null);
  assert.match(result.error.message, /JSON/);
});

test("local repository reset removes the saved workspace", () => {
  const { createLocalStateStore } = loadStorageModule();
  const store = createLocalStateStore(createMemoryStorage(), {
    key: "oneflow-test",
  });
  store.save({ article: { title: "稍后重置" } });

  assert.deepEqual(store.reset(), { ok: true });
  assert.deepEqual(store.load(), {
    ok: true,
    schemaVersion: null,
    savedAt: null,
    state: null,
  });
});
