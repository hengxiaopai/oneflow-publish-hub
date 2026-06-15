const DEFAULT_TTL_MS = 2 * 60_000;

export function createTaskLockService(
  prisma,
  { ttlMs = DEFAULT_TTL_MS } = {},
) {
  async function acquireTaskLock(taskId, owner, now = new Date()) {
    const expiresBefore = new Date(now.getTime() - ttlMs);
    const result = await prisma.publishTask.updateMany({
      where: {
        id: taskId,
        OR: [
          { lockedAt: null },
          { lockOwner: owner },
          { lockedAt: { lt: expiresBefore } },
        ],
      },
      data: {
        lockedAt: now,
        lockOwner: owner,
      },
    });
    return result.count === 1;
  }

  async function releaseTaskLock(taskId, owner) {
    const result = await prisma.publishTask.updateMany({
      where: { id: taskId, lockOwner: owner },
      data: { lockedAt: null, lockOwner: null },
    });
    return result.count === 1;
  }

  return { acquireTaskLock, releaseTaskLock };
}
