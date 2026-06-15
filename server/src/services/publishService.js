import { articleView } from "./articleService.js";
import { channelView } from "./channelService.js";
import { buildPublishIdempotencyKey } from "./publishIdempotencyService.js";
import {
  createPublishTaskEventService,
  eventView,
} from "./publishTaskEventService.js";

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function versionSnapshot(article, channel, existingVersion = null) {
  const metadata = parseJson(existingVersion?.metadata, {});
  return {
    id: existingVersion?.id || null,
    articleId: article.id,
    channelId: channel.id,
    platformId: channel.platformId,
    platformName: channel.displayName,
    channelType: channel.channelType,
    title: existingVersion?.title || article.title,
    platformTitle: existingVersion?.title || article.title,
    summary: existingVersion?.summary || article.summary,
    platformSummary: existingVersion?.summary || article.summary,
    contentHtml: existingVersion?.contentHtml || article.contentHtml,
    platformContentHtml:
      existingVersion?.contentHtml || article.contentHtml,
    contentMarkdown:
      existingVersion?.contentMarkdown || article.contentMarkdown,
    platformContentMarkdown:
      existingVersion?.contentMarkdown || article.contentMarkdown,
    tags: existingVersion
      ? parseJson(existingVersion.tags, [])
      : parseJson(article.tags, []),
    cover: metadata.cover || parseJson(article.cover, {}),
    slug: article.slug,
    seoTitle: metadata.seoTitle || "",
    seoDescription: metadata.seoDescription || "",
    canonicalUrl: metadata.canonicalUrl || "",
    versionStatus: existingVersion?.status || "ready",
    publishMethod:
      parseJson(channel.configuration, {}).publishMode || "create_draft",
    sourceArticleUpdatedAt: article.updatedAt,
    createdAt:
      existingVersion?.createdAt?.toISOString?.() ||
      article.updatedAt?.toISOString?.() ||
      article.updatedAt,
  };
}

export function taskView(task) {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    publishBatchId: task.publishBatchId,
    channelConfigId: task.channelConfigId,
    channelVersionId: task.channelVersionId,
    status: task.status,
    channelVersionSnapshot: parseJson(task.channelVersionSnapshot, {}),
    result: parseJson(task.result, null),
    remoteUrl: task.remoteUrl,
    remotePostId: task.remotePostId,
    remotePostName: task.remotePostName,
    remoteEditUrl: task.remoteEditUrl,
    remotePreviewUrl: task.remotePreviewUrl,
    remotePublicUrl: task.remotePublicUrl,
    remoteStatus: task.remoteStatus,
    draftCreatedAt: task.draftCreatedAt,
    publishedAt: task.publishedAt,
    lastSyncAt: task.lastSyncAt,
    rawResponseSummary: parseJson(task.rawResponseSummary, null),
    errorMessage: task.errorMessage,
    lastErrorCode: task.lastErrorCode,
    lastErrorMessage: task.lastErrorMessage,
    retryable: task.retryable,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
    nextRetryAt: task.nextRetryAt,
    idempotencyKey: task.idempotencyKey
      ? `${task.idempotencyKey.slice(0, 16)}...`
      : null,
    lockedAt: task.lockedAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    durationMs: task.durationMs,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    events: (task.events || []).map(eventView),
  };
}

export function batchView(batch) {
  return {
    id: batch.id,
    workspaceId: batch.workspaceId,
    articleId: batch.articleId,
    strategy: batch.strategy,
    status: batch.status,
    scheduleAt: batch.scheduleAt,
    postActions: parseJson(batch.postActions, []),
    articleSnapshot: parseJson(batch.articleSnapshot, {}),
    createdAt: batch.createdAt,
    completedAt: batch.completedAt,
    tasks: (batch.tasks || []).map(taskView),
  };
}

export function createPublishService(prisma, publisherRouter) {
  async function findBatch(workspaceId, batchId) {
    return prisma.publishBatch.findFirst({
      where: { id: batchId, workspaceId },
      include: {
        tasks: {
          include: {
            events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async function createBatch(workspaceId, input) {
    const taskEvents = createPublishTaskEventService(prisma);
    const article = await prisma.article.findFirst({
      where: { id: input.articleId, workspaceId },
    });
    if (!article) return { error: "ARTICLE_NOT_FOUND" };

    const channelIds = [...new Set(input.channelIds || [])];
    const channels = await prisma.channelConfig.findMany({
      where: {
        workspaceId,
        id: { in: channelIds },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!channelIds.length || channels.length !== channelIds.length) {
      return { error: "CHANNEL_NOT_FOUND" };
    }

    const snapshot = articleView(article);
    const batch = await prisma.publishBatch.create({
      data: {
        workspaceId,
        articleId: article.id,
        strategy: input.strategy || "automatic_first",
        status: "pending",
        scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : null,
        postActions: JSON.stringify(input.postActions || []),
        articleSnapshot: JSON.stringify(snapshot),
      },
    });

    for (const channel of channels) {
      const existingVersion = await prisma.channelVersion.findUnique({
        where: {
          articleId_channelConfigId: {
            articleId: article.id,
            channelConfigId: channel.id,
          },
        },
      });
      const snapshotValue = versionSnapshot(article, channel, existingVersion);
      const preserveStale = ["stale", "needs_adaptation"].includes(
        existingVersion?.status,
      );
      const version = await prisma.channelVersion.upsert({
        where: {
          articleId_channelConfigId: {
            articleId: article.id,
            channelConfigId: channel.id,
          },
        },
        update: preserveStale ? {} : {
          title: snapshotValue.title,
          summary: snapshotValue.summary,
          contentHtml: snapshotValue.contentHtml,
          contentMarkdown: snapshotValue.contentMarkdown,
          tags: JSON.stringify(snapshotValue.tags),
          metadata: JSON.stringify({
            cover: snapshotValue.cover,
            publishMethod: snapshotValue.publishMethod,
          }),
          status: "ready",
        },
        create: {
          workspaceId,
          articleId: article.id,
          channelConfigId: channel.id,
          title: snapshotValue.title,
          summary: snapshotValue.summary,
          contentHtml: snapshotValue.contentHtml,
          contentMarkdown: snapshotValue.contentMarkdown,
          tags: JSON.stringify(snapshotValue.tags),
          metadata: JSON.stringify({
            cover: snapshotValue.cover,
            publishMethod: snapshotValue.publishMethod,
          }),
          status: "ready",
        },
      });
      snapshotValue.id = version.id;
      const idempotencyKey = buildPublishIdempotencyKey({
        workspaceId,
        channelConfigId: channel.id,
        platformId: channel.platformId,
        publishMode: snapshotValue.publishMethod,
        articleSnapshot: snapshot,
        channelVersionSnapshot: snapshotValue,
      });
      const previous = await prisma.publishTask.findFirst({
        where: {
          workspaceId,
          idempotencyKey,
          status: { in: ["draft_created", "published"] },
        },
        orderBy: { completedAt: "desc" },
      });
      const task = await prisma.publishTask.create({
        data: {
          workspaceId,
          publishBatchId: batch.id,
          channelConfigId: channel.id,
          channelVersionId: version.id,
          status: previous?.status || "pending",
          idempotencyKey,
          channelVersionSnapshot: JSON.stringify(snapshotValue),
          ...(previous
            ? {
                result: previous.result,
                remoteUrl: previous.remoteUrl,
                remotePostId: previous.remotePostId,
                remotePostName: previous.remotePostName,
                remoteEditUrl: previous.remoteEditUrl,
                remotePreviewUrl: previous.remotePreviewUrl,
                remotePublicUrl: previous.remotePublicUrl,
                remoteStatus: previous.remoteStatus,
                draftCreatedAt: previous.draftCreatedAt,
                publishedAt: previous.publishedAt,
                lastSyncAt: previous.lastSyncAt,
                rawResponseSummary: previous.rawResponseSummary,
                completedAt: new Date(),
                durationMs: 0,
              }
            : {}),
        },
      });
      await taskEvents.record(
        task,
        "task_created",
        "发布任务已创建",
        { channel: channel.displayName },
      );
      if (previous) {
        await taskEvents.record(
          task,
          "idempotency_reused",
          "检测到相同发布快照，已复用历史远程结果",
          { sourceTaskId: previous.id, remoteStatus: previous.remoteStatus },
          { safeRemoteStatus: previous.remoteStatus },
        );
      }
    }

    await prisma.usageRecord.create({
      data: {
        workspaceId,
        type: "publish_batch",
        period: new Date().toISOString().slice(0, 7),
        quantity: 1,
        metadata: JSON.stringify({ batchId: batch.id }),
      },
    });

    await publisherRouter.runBatch(batch.id);
    return { batch: await findBatch(workspaceId, batch.id) };
  }

  async function retryTask(workspaceId, taskId) {
    const task = await prisma.publishTask.findFirst({
      where: { id: taskId, workspaceId },
    });
    if (!task) return { error: "TASK_NOT_FOUND" };
    if (
      task.status !== "failed" ||
      !task.retryable ||
      task.retryCount >= task.maxRetries
    ) {
      return { error: "TASK_NOT_RETRYABLE" };
    }
    await prisma.publishTask.update({
      where: { id: task.id },
      data: {
        status: "retrying",
        retryCount: { increment: 1 },
        errorMessage: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        retryable: false,
        nextRetryAt: null,
      },
    });
    await publisherRouter.runTask(task.id);
    return {
      task: await prisma.publishTask.findUnique({
        where: { id: task.id },
        include: {
          events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        },
      }),
    };
  }

  return { createBatch, findBatch, retryTask };
}
