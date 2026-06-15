import { randomUUID } from "node:crypto";

import { refreshPublishBatch } from "./publishBatchStatusService.js";
import { createPublishTaskEventService } from "./publishTaskEventService.js";
import { getRetryDecision } from "./retryPolicyService.js";
import { resolveSlugConflict } from "./slugService.js";
import { createTaskLockService } from "./taskLockService.js";

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function settings(channelConfig) {
  return parseJson(channelConfig?.configuration, {});
}

function taskResult(remote, outcome) {
  return JSON.stringify({
    provider: "halo",
    outcome,
    remoteStatus: remote.remoteStatus,
    remotePostName: remote.remotePostName,
  });
}

function taskRemoteData(remote, timestamps = {}) {
  return {
    remoteUrl: remote.remotePublicUrl || remote.remotePreviewUrl,
    remotePostId: remote.remotePostId,
    remotePostName: remote.remotePostName,
    remoteEditUrl: remote.remoteEditUrl,
    remotePreviewUrl: remote.remotePreviewUrl,
    remotePublicUrl: remote.remotePublicUrl,
    remoteStatus: remote.remoteStatus,
    lastSyncAt: timestamps.lastSyncAt || new Date(),
    rawResponseSummary: JSON.stringify(remote.rawResponseSummary || {}),
  };
}

function snapshotSlug(task) {
  const version = parseJson(task.channelVersionSnapshot, {});
  const article = parseJson(task.publishBatch?.articleSnapshot, {});
  return version.slug || article.slug || version.title || article.title;
}

export function createHaloPublishWorkerService(
  prisma,
  haloPublisher,
  { lockTtlMs = 2 * 60_000 } = {},
) {
  const locks = createTaskLockService(prisma, { ttlMs: lockTtlMs });
  const events = createPublishTaskEventService(prisma);

  async function saveValidationIssues(task, error) {
    const issues = error.validationIssues?.length
      ? error.validationIssues
      : [{
          code: error.code || "HALO_PUBLISH_FAILED",
          severity: "error",
          field: null,
          message: error.message || "Halo 发布失败。",
        }];
    await prisma.validationIssue.deleteMany({
      where: { publishTaskId: task.id },
    });
    await prisma.validationIssue.createMany({
      data: issues.map((item) => ({
        workspaceId: task.workspaceId,
        publishTaskId: task.id,
        code: item.code,
        severity: item.severity || "error",
        field: item.field || null,
        message: item.message,
      })),
    });
  }

  async function transition(task, status, type, message, metadata = {}) {
    await prisma.publishTask.update({
      where: { id: task.id },
      data: { status },
    });
    await events.record(task, type, message, metadata);
  }

  async function createDraftWithSlugRecovery(task) {
    try {
      return await haloPublisher.createDraft(task, task.channelConfig);
    } catch (error) {
      const decision = getRetryDecision(error, {
        retryCount: 0,
        maxRetries: task.maxRetries,
      });
      if (decision.strategy !== "resolve_slug_once") throw error;

      const slugOverride = resolveSlugConflict(
        snapshotSlug(task),
        task.idempotencyKey || task.id,
        0,
      );
      if (!slugOverride) throw error;
      await prisma.publishTask.update({
        where: { id: task.id },
        data: { retryCount: { increment: 1 } },
      });
      await events.record(
        task,
        "slug_conflict_resolved",
        "检测到 slug 冲突，已生成稳定后缀并自动重试一次",
        { strategy: decision.strategy, slug: slugOverride },
      );
      return haloPublisher.createDraft(task, task.channelConfig, {
        slugOverride,
      });
    }
  }

  async function runTask(taskId) {
    const task = await prisma.publishTask.findUnique({
      where: { id: taskId },
      include: { channelConfig: true, publishBatch: true },
    });
    if (!task) throw new Error("Publish task not found");
    if (["draft_created", "published"].includes(task.status)) return task;

    const lockOwner = `halo-worker:${randomUUID()}`;
    const acquired = await locks.acquireTaskLock(task.id, lockOwner);
    if (!acquired) {
      return prisma.publishTask.findUnique({ where: { id: task.id } });
    }

    const startedAt = new Date();
    try {
      await events.record(
        task,
        "lock_acquired",
        "Halo Worker 已取得任务执行锁",
        { lockOwner },
      );
      await prisma.validationIssue.deleteMany({
        where: { publishTaskId: task.id },
      });
      await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: "validating",
          startedAt,
          completedAt: null,
          durationMs: null,
          errorMessage: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          retryable: false,
          nextRetryAt: null,
        },
      });
      await events.record(
        task,
        "validation_started",
        "开始执行 Halo 发布前检查",
      );
      await transition(task, "queued", "task_queued", "任务已进入 Halo 发布队列");
      await transition(task, "running", "task_started", "Halo Worker 已开始执行");
      await transition(
        task,
        "creating_draft",
        "halo_request_started",
        "正在创建 Halo 草稿",
      );

      const draft = await createDraftWithSlugRecovery(task);
      const draftCreatedAt = new Date();
      await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: "draft_created",
          ...taskRemoteData(draft, { lastSyncAt: draftCreatedAt }),
          draftCreatedAt,
          result: taskResult(draft, "draft_created"),
        },
      });
      await events.record(
        task,
        "halo_draft_created",
        "Halo 草稿创建成功",
        { remotePostName: draft.remotePostName },
        { safeRemoteStatus: draft.remoteStatus },
      );

      let finalRemote = draft;
      let finalStatus = "draft_created";
      let publishedAt = null;
      if (settings(task.channelConfig).publishMode === "publish") {
        await transition(
          task,
          "publishing",
          "halo_publish_started",
          "正在发布 Halo 草稿",
        );
        finalRemote = await haloPublisher.publishDraft(
          draft.remotePostName,
          task.channelConfig,
        );
        finalStatus = "published";
        publishedAt = new Date();
      }

      const completedAt = new Date();
      const durationMs = Math.max(
        1,
        completedAt.getTime() - startedAt.getTime(),
      );
      const succeeded = await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: finalStatus,
          ...taskRemoteData(finalRemote, { lastSyncAt: completedAt }),
          draftCreatedAt,
          publishedAt,
          result: taskResult(finalRemote, finalStatus),
          completedAt,
          durationMs,
          errorMessage: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          retryable: false,
          nextRetryAt: null,
        },
      });
      await events.record(
        task,
        finalStatus === "published" ? "halo_published" : "task_completed",
        finalStatus === "published" ? "Halo 文章发布成功" : "Halo 草稿已就绪",
        { remotePostName: finalRemote.remotePostName },
        { safeRemoteStatus: finalRemote.remoteStatus, durationMs },
      );
      if (finalStatus === "published") {
        await events.record(
          task,
          "task_completed",
          "Halo 发布任务执行完成",
          {},
          { safeRemoteStatus: finalRemote.remoteStatus, durationMs },
        );
      }
      await refreshPublishBatch(prisma, task.publishBatchId);
      return succeeded;
    } catch (error) {
      const completedAt = new Date();
      const latest = await prisma.publishTask.findUnique({
        where: { id: task.id },
      });
      const decision = getRetryDecision(error, {
        retryCount: latest?.retryCount || 0,
        maxRetries: latest?.maxRetries || task.maxRetries,
        now: completedAt,
      });
      await saveValidationIssues(task, error);
      if (error.validationIssues?.length) {
        await events.record(
          task,
          "validation_failed",
          "Halo 发布前检查未通过",
          { issueCodes: error.validationIssues.map((issue) => issue.code) },
        );
      }
      if (["HALO_AUTH_FAILED", "HALO_CREDENTIAL_INVALID"].includes(error.code)) {
        await prisma.channelConfig.update({
          where: { id: task.channelConfigId },
          data: {
            credentialStatus: "invalid",
            connectionStatus: "invalid",
            lastTestStatus: "failed",
            lastTestMessage: error.message,
          },
        });
      }
      const durationMs = Math.max(
        1,
        completedAt.getTime() - startedAt.getTime(),
      );
      const failed = await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          errorMessage: error.message || "Halo 发布失败。",
          lastErrorCode: error.code || "HALO_PUBLISH_FAILED",
          lastErrorMessage: error.message || "Halo 发布失败。",
          retryable: decision.retryable,
          nextRetryAt: decision.nextRetryAt,
          result: JSON.stringify({
            provider: "halo",
            outcome: "failed",
            code: error.code || "HALO_PUBLISH_FAILED",
            retryStrategy: decision.strategy,
          }),
          completedAt,
          durationMs,
        },
      });
      await events.record(
        task,
        decision.retryable ? "retry_scheduled" : "task_failed",
        decision.retryable
          ? "发布失败，任务可重试"
          : "发布失败，需要人工修复后重新创建任务",
        {
          errorCode: error.code || "HALO_PUBLISH_FAILED",
          retryStrategy: decision.strategy,
          nextRetryAt: decision.nextRetryAt,
        },
        { durationMs },
      );
      await refreshPublishBatch(prisma, task.publishBatchId);
      return failed;
    } finally {
      await locks.releaseTaskLock(task.id, lockOwner);
    }
  }

  return { runTask };
}
