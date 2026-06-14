"use strict";

(function exposeStorage(globalScope) {
  const DEFAULT_KEY = "oneflow.workspace.v3";
  const LEGACY_KEYS = ["oneflow.workspace.v2", "oneflow.workspace.v1"];
  const CURRENT_SCHEMA_VERSION = 3;
  const DEFAULT_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeCover(article = {}) {
    const cover = article.cover || {};
    return {
      sourceType: cover.sourceType || "generated",
      url: cover.url || article.coverAsset || "assets/article-cover.png",
      alt: cover.alt || article.title || "文章封面",
      aspectRatio: cover.aspectRatio || "16:9",
      description:
        cover.description ||
        article.coverDescription ||
        "封面已生成多平台裁切版本",
      platformCrops: Array.isArray(cover.platformCrops)
        ? clone(cover.platformCrops)
        : [],
    };
  }

  function migrateV2State(state = {}, savedAt) {
    const currentArticle = clone(state.currentArticle || state.article || {});
    currentArticle.cover = normalizeCover(currentArticle);
    delete currentArticle.coverAsset;
    delete currentArticle.coverDescription;

    const articleSnapshots = clone(state.articleSnapshots || []);
    const channelVersionSnapshots = clone(
      state.channelVersionSnapshots || []
    );
    const publishBatches = clone(state.publishBatches || []);
    const publishTasks = clone(state.publishTasks || []);
    const channelVersions = clone(state.channelVersions || []);

    publishBatches.forEach((batch) => {
      if (!batch.articleSnapshotId) {
        const snapshotId = `${batch.id || "legacy-batch"}-article-snapshot`;
        if (!articleSnapshots.some((snapshot) => snapshot.id === snapshotId)) {
          articleSnapshots.push({
            id: snapshotId,
            sourceArticleId: currentArticle.id || batch.articleId || null,
            title: batch.articleTitle || currentArticle.title || "未命名文章",
            summary: currentArticle.summary || "",
            bodyHtml: currentArticle.bodyHtml || "",
            tags: clone(currentArticle.tags || []),
            cover: normalizeCover(currentArticle),
            wordCount: currentArticle.wordCount || 0,
            readingMinutes: currentArticle.readingMinutes || 0,
            createdAt: batch.createdAt || savedAt || null,
          });
        }
        batch.articleSnapshotId = snapshotId;
      }

      (batch.taskIds || []).forEach((taskId) => {
        const task = publishTasks.find((item) => item.id === taskId);
        if (!task || task.channelVersionSnapshotId) return;
        const version = channelVersions.find(
          (item) =>
            item.id === task.channelVersionId ||
            item.channelId === task.channelId
        );
        if (!version) return;
        const snapshotId = `${batch.id}-${task.channelId}-version-snapshot`;
        channelVersionSnapshots.push({
          ...clone(version),
          id: snapshotId,
          sourceChannelVersionId: version.id,
          createdAt: batch.createdAt || savedAt || null,
        });
        task.channelVersionSnapshotId = snapshotId;
      });
    });

    return {
      ...clone(state),
      currentArticle,
      channelVersions,
      publishTasks,
      publishBatches,
      articleSnapshots,
      channelVersionSnapshots,
    };
  }

  function migrateWorkspacePayload(payload) {
    if (!payload || typeof payload !== "object") {
      return { ok: false, reason: "invalid_payload" };
    }
    const sourceVersion = Number(payload.schemaVersion || 1);
    if (sourceVersion > CURRENT_SCHEMA_VERSION) {
      return { ok: false, reason: "unsupported_version" };
    }
    if (sourceVersion < 1) {
      return { ok: false, reason: "invalid_version" };
    }

    let state = clone(payload.state || {});
    if (sourceVersion <= 2) {
      state = migrateV2State(state, payload.savedAt);
    } else {
      state.currentArticle = clone(state.currentArticle || state.article || {});
      state.currentArticle.cover = normalizeCover(state.currentArticle);
      state.articleSnapshots = clone(state.articleSnapshots || []);
      state.channelVersionSnapshots = clone(
        state.channelVersionSnapshots || []
      );
    }
    delete state.article;

    return {
      ok: true,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      sourceVersion,
      migrated: sourceVersion !== CURRENT_SCHEMA_VERSION,
      savedAt: payload.savedAt || null,
      state,
    };
  }

  function formatExportTimestamp(isoValue) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(isoValue));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}`;
  }

  function exportWorkspaceData(state, options = {}) {
    const now = options.now || (() => new Date().toISOString());
    const exportedAt = now();
    const payload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt,
      savedAt: state.currentArticle?.savedAt || exportedAt,
      state: clone(state),
    };
    return {
      filename: `oneflow-workspace-${formatExportTimestamp(exportedAt)}.json`,
      json: JSON.stringify(payload, null, 2),
      payload,
    };
  }

  function importWorkspaceData(input, options = {}) {
    let payload;
    try {
      payload = typeof input === "string" ? JSON.parse(input) : clone(input);
    } catch (error) {
      return { ok: false, reason: "invalid_json", raw: input, error };
    }
    const result = migrateWorkspacePayload(payload);
    if (!result.ok) return { ...result, raw: input };
    const state = options.sanitizeState
      ? options.sanitizeState(result.state)
      : result.state;
    return { ...result, state };
  }

  function createLocalStateStore(storage, options = {}) {
    const key = options.key || DEFAULT_KEY;
    const schemaVersion = options.schemaVersion || CURRENT_SCHEMA_VERSION;
    const now = options.now || (() => new Date().toISOString());
    const legacyKeys = options.legacyKeys || (key === DEFAULT_KEY ? LEGACY_KEYS : []);

    return {
      load() {
        let sourceKey = key;
        let raw = storage.getItem(key);
        if (!raw) {
          sourceKey = legacyKeys.find((legacyKey) => storage.getItem(legacyKey));
          raw = sourceKey ? storage.getItem(sourceKey) : null;
        }
        if (!raw) {
          return {
            ok: true,
            schemaVersion: null,
            savedAt: null,
            state: null,
          };
        }
        try {
          const payload = JSON.parse(raw);
          const result = migrateWorkspacePayload(payload);
          if (!result.ok) return { ...result, state: null, raw, sourceKey };
          return { ...result, sourceKey, raw };
        } catch (error) {
          return {
            ok: false,
            reason: "corrupt",
            state: null,
            raw,
            sourceKey,
            error,
          };
        }
      },

      save(state) {
        const savedAt = now();
        try {
          storage.setItem(
            key,
            JSON.stringify({ schemaVersion, savedAt, state })
          );
          legacyKeys.forEach((legacyKey) => storage.removeItem(legacyKey));
          return { ok: true, savedAt };
        } catch (error) {
          return { ok: false, savedAt: null, error };
        }
      },

      reset() {
        try {
          storage.removeItem(key);
          legacyKeys.forEach((legacyKey) => storage.removeItem(legacyKey));
          return { ok: true };
        } catch (error) {
          return { ok: false, error };
        }
      },
    };
  }

  const api = {
    CURRENT_SCHEMA_VERSION,
    DEFAULT_KEY,
    DEFAULT_SCHEMA_VERSION,
    LEGACY_KEYS,
    createLocalStateStore,
    exportWorkspaceData,
    importWorkspaceData,
    migrateWorkspacePayload,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalScope.OneFlowStorage = api;
})(typeof window !== "undefined" ? window : globalThis);
