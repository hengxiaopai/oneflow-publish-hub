export function createPublisherRouterService(
  prisma,
  { mockPublisher, haloPublisherWorker },
) {
  async function runTask(taskId) {
    const task = await prisma.publishTask.findUnique({
      where: { id: taskId },
      include: { channelConfig: true },
    });
    if (!task) throw new Error("Publish task not found");
    const useHalo =
      task.channelConfig?.platformId === "halo" &&
      task.channelConfig?.publisherMode === "halo";
    return useHalo
      ? haloPublisherWorker.runTask(task.id)
      : mockPublisher.runTask(task.id);
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

  return { runBatch, runTask };
}

