"use strict";

(function exposeStorage(globalScope) {
  const DEFAULT_KEY = "oneflow.workspace.v2";
  const DEFAULT_SCHEMA_VERSION = 2;

  function createLocalStateStore(storage, options = {}) {
    const key = options.key || DEFAULT_KEY;
    const schemaVersion =
      options.schemaVersion || DEFAULT_SCHEMA_VERSION;
    const now = options.now || (() => new Date().toISOString());

    return {
      load() {
        try {
          const raw = storage.getItem(key);
          if (!raw) {
            return {
              ok: true,
              schemaVersion: null,
              savedAt: null,
              state: null,
            };
          }
          const payload = JSON.parse(raw);
          return {
            ok: true,
            schemaVersion: payload.schemaVersion ?? null,
            savedAt: payload.savedAt ?? null,
            state: payload.state ?? null,
          };
        } catch (error) {
          return { ok: false, state: null, error };
        }
      },

      save(state) {
        const savedAt = now();
        try {
          storage.setItem(
            key,
            JSON.stringify({
              schemaVersion,
              savedAt,
              state,
            })
          );
          return { ok: true, savedAt };
        } catch (error) {
          return { ok: false, savedAt: null, error };
        }
      },

      reset() {
        try {
          storage.removeItem(key);
          return { ok: true };
        } catch (error) {
          return { ok: false, error };
        }
      },
    };
  }

  const api = {
    DEFAULT_KEY,
    DEFAULT_SCHEMA_VERSION,
    createLocalStateStore,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.OneFlowStorage = api;
})(typeof window !== "undefined" ? window : globalThis);
