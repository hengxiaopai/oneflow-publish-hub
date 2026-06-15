function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createMockPublisherService(prisma) {
  async function refreshBatch(batchId) {
    const tasks = await prisma.publishTask.findMany({
      where: { publishBatchId: batchId },
    });
    const hasFailure = tasks.some((task) => task.status === "failed");
    const allFinished = tasks.every((task) =>
      ["draft_created", "published", "failed"].includes(task.status),
    );
    return prisma.publishBatch.update({
      where: { id: batchId },
      data: {
        status: allFinished
          ? hasFailure
            ? "partial_failed"
            : "completed"
          : "running",
        completedAt: allFinished ? new Date() : null,
      },
    });
  }

  async function runTask(taskId) {
    const task = await prisma.publishTask.findUnique({
      where: { id: taskId },
      include: { channelConfig: true },
    });
    if (!task) throw new Error("Publish task not found");

    const startedAt = new Date();
    await prisma.publishTask.update({
      where: { id: task.id },
      data: { status: "validating", startedAt, errorMessage: null },
    });
    await prisma.publishTask.update({
      where: { id: task.id },
      data: { status: "queued" },
    });
    await prisma.publishTask.update({
      where: { id: task.id },
      data: { status: "running" },
    });

    const behavior = task.channelConfig?.mockBehavior || "success";
    const shouldFail =
      behavior === "failure" ||
      (behavior === "fail_once" && task.retryCount === 0);
    const completedAt = new Date();
    const durationMs = Math.max(1, completedAt.getTime() - startedAt.getTime());

    if (shouldFail) {
      const failed = await prisma.publishTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          errorMessage: "Mock Publisher 模拟发布失败。",
          result: JSON.stringify({
            provider: "mock",
            outcome: "failed",
          }),
          completedAt,
          durationMs,
        },
      });
      await refreshBatch(task.publishBatchId);
      return failed;
    }

    const configuration = parseJson(task.channelConfig?.configuration, {});
    const status =
      configuration.publishMode === "create_draft"
        ? "draft_created"
        : "published";
    const remoteUrl = `https://mock.oneflow.local/${task.workspaceId}/${task.id}`;
    const succeeded = await prisma.publishTask.update({
      where: { id: task.id },
      data: {
        status,
        remoteUrl,
        result: JSON.stringify({
          provider: "mock",
          outcome: status,
          remoteStatus: status,
        }),
        completedAt,
        durationMs,
        errorMessage: null,
      },
    });
    await refreshBatch(task.publishBatchId);
    return succeeded;
  }

  async function runBatch(batchId) {
    const tasks = await prisma.publishTask.findMany({
      where: { publishBatchId: batchId },
      orderBy: { createdAt: "asc" },
    });
    for (const task of tasks) {
      await runTask(task.id);
    }
    return prisma.publishBatch.findUnique({ where: { id: batchId } });
  }

  return { runTask, runBatch };
}
