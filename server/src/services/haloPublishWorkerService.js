import { refreshPublishBatch } from "./publishBatchStatusService.js";

function parseJson(value, fallback = {}) {
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

export function createHaloPublishWorkerService(prisma, haloPublisher) {
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

  async function runTask(taskId) {
    const task = await prisma.publishTask.findUnique({
      where: { id: taskId },
      include: { channelConfig: true, publishBatch: true },
    });
    if (!task) throw new Error("Publish task not found");

    const startedAt = new Date();
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
      },
    });

    try {
      await prisma.publishTask.update({
        where: { id: task.id },
        data: { status: "queued" },
      });
      await prisma.publishTask.update({
        where: { id: task.id },
        data: { status: "running" },
      });
      await prisma.publishTask.update({
        where: { id: task.id },
        data: { status: "creating_draft" },
      });

      const draft = await haloPublisher.createDraft(task, task.channelConfig);
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

      let finalRemote = draft;
      let finalStatus = "draft_created";
      let publishedAt = null;
      if (settings(task.channelConfig).publishMode === "publish") {
        await prisma.publishTask.update({
          where: { id: task.id },
          data: { status: "publishing" },
        });
        finalRemote = await haloPublisher.publishDraft(
          draft.remotePostName,
          task.channelConfig,
        );
        finalStatus = "published";
        publishedAt = new Date();
      }

      const completedAt = new Date();
      const succeeded = await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: finalStatus,
          ...taskRemoteData(finalRemote, { lastSyncAt: completedAt }),
          draftCreatedAt,
          publishedAt,
          result: taskResult(finalRemote, finalStatus),
          completedAt,
          durationMs: Math.max(1, completedAt.getTime() - startedAt.getTime()),
          errorMessage: null,
        },
      });
      await refreshPublishBatch(prisma, task.publishBatchId);
      return succeeded;
    } catch (error) {
      const completedAt = new Date();
      await saveValidationIssues(task, error);
      const failed = await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          errorMessage: error.message || "Halo 发布失败。",
          result: JSON.stringify({
            provider: "halo",
            outcome: "failed",
            code: error.code || "HALO_PUBLISH_FAILED",
          }),
          completedAt,
          durationMs: Math.max(1, completedAt.getTime() - startedAt.getTime()),
        },
      });
      await refreshPublishBatch(prisma, task.publishBatchId);
      return failed;
    }
  }

  return { runTask };
}

