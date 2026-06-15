const TERMINAL_STATUSES = new Set(["draft_created", "published", "failed"]);

export async function refreshPublishBatch(prisma, batchId) {
  const tasks = await prisma.publishTask.findMany({
    where: { publishBatchId: batchId },
  });
  const hasFailure = tasks.some((task) => task.status === "failed");
  const allFinished =
    tasks.length > 0 && tasks.every((task) => TERMINAL_STATUSES.has(task.status));
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

