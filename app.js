"use strict";

const CHANNEL_GROUPS = {
  automatic: {
    title: "可自动发布",
    description: "仅包含已验证可直连的自有渠道。",
  },
  drafts: {
    title: "已生成草稿，待人工确认",
    description: "本地平台版本已准备好，仍需确认或复制到平台。",
  },
  repurpose: {
    title: "需要内容再加工",
    description: "生成封面、话题、脚本或视频简介后再交付。",
  },
  exceptions: {
    title: "授权或发布异常",
    description: "需要重新授权、检查失败原因或发起重试。",
  },
};

const PUBLISH_STATUS = Object.freeze({
  DRAFT: "draft",
  ADAPTING: "adapting",
  NEEDS_REVIEW: "needs_review",
  READY: "ready",
  MANUAL_DELIVERY: "manual_delivery",
  NEEDS_ADAPTATION: "needs_adaptation",
  NEEDS_AUTHORIZATION: "needs_authorization",
  NEEDS_REPURPOSE: "needs_repurpose",
  FAILED: "failed",
  QUEUED: "queued",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  PARTIAL: "partial",
});

const STATUS_PRESENTATION = {
  [PUBLISH_STATUS.DRAFT]: { label: "草稿", tone: "neutral" },
  [PUBLISH_STATUS.ADAPTING]: { label: "适配中", tone: "neutral" },
  [PUBLISH_STATUS.NEEDS_REVIEW]: { label: "待确认", tone: "warning" },
  [PUBLISH_STATUS.READY]: { label: "就绪", tone: "success" },
  [PUBLISH_STATUS.MANUAL_DELIVERY]: { label: "待处理", tone: "neutral" },
  [PUBLISH_STATUS.NEEDS_ADAPTATION]: {
    label: "需重新适配",
    tone: "warning",
  },
  [PUBLISH_STATUS.NEEDS_AUTHORIZATION]: {
    label: "未授权",
    tone: "danger",
  },
  [PUBLISH_STATUS.NEEDS_REPURPOSE]: {
    label: "待处理",
    tone: "neutral",
  },
  [PUBLISH_STATUS.FAILED]: { label: "失败", tone: "danger" },
  [PUBLISH_STATUS.QUEUED]: { label: "已入队", tone: "success" },
  [PUBLISH_STATUS.PUBLISHING]: { label: "发布中", tone: "success" },
  [PUBLISH_STATUS.PUBLISHED]: { label: "已发布", tone: "success" },
  [PUBLISH_STATUS.PARTIAL]: { label: "部分成功", tone: "warning" },
};

const INITIAL_ARTICLE = Object.freeze({
  id: "article-agent-workflow",
  title: "从单体应用到 AI Agent：一次内容工作流重构",
  slug: "monolith-to-ai-agent-content-workflow",
  status: "draft",
  contentFormat: "html",
  summary:
    "当内容生产从单一渠道走向多平台协作，真正需要重构的不是发布按钮，而是分析、适配、确认与回流之间的整条工作链路。",
  bodyHtml: `
    <h2>一、为什么发布流程需要被重新设计</h2>
    <p>过去几年，我们的内容生产仍沿用“写完、复制、粘贴、逐个平台检查”的方式。渠道数量增加后，标题长度、摘要结构、代码块、封面比例和话题规则开始彼此冲突。</p>
    <p>这次重构把一篇文章视作内容源，把每个平台版本视作独立交付物。AI Agent 负责识别结构和平台约束，人负责做关键判断。</p>
    <blockquote>自动化的目标不是跳过人工，而是把人工判断留给真正需要判断的地方。</blockquote>
    <h2>二、从单体脚本到六阶段发布链路</h2>
    <p>新链路由 Analyze、Adapt、Review、Authorize、Publish 与 Feedback 六个阶段组成。文章平台优先保持结构一致，图文与短视频平台则进入内容再加工流程。</p>
    <h3>文章渠道：保留结构，适配平台约束</h3>
    <ul>
      <li>保留标题层级、代码块和关键链接。</li>
      <li>根据平台规则调整摘要、标签与封面。</li>
      <li>无法自动发布的平台生成草稿或复制稿。</li>
    </ul>
  `.trim(),
  coverDescription: "封面已生成 16:9、4:3 与 3:4 三种裁切版本",
  wordCount: 3286,
  readingMinutes: 9,
  seoSummaryLength: 142,
  coverAsset: "assets/article-cover.png",
  tags: ["架构设计", "AI Agent", "内容工作流"],
  createdAt: "2026-06-12T14:20:00+08:00",
  updatedAt: "2026-06-13T00:00:00+08:00",
  savedAt: "2026-06-13T00:00:00+08:00",
});

const CHANNEL_MISSING_ITEMS = {
  segmentfault: ["账号级发布能力验证"],
  toutiao: ["文章投稿权限验证"],
  juejin: ["分类确认", "标签确认"],
  zhihu: ["开场终审"],
  "51cto": ["平台内发布确认"],
  itpub: ["连接稳定性检查"],
  cnblogs: ["平台内粘贴确认"],
  tencent: ["投稿方式验证"],
  oschina: ["开源协议标签"],
  douyin: ["应用授权", "封面终审", "脚本终审"],
  xiaohongshu: ["封面终审", "话题终审"],
  bilibili: ["封面终审", "视频文件"],
  csdn: ["重新授权"],
};

const CHANNEL_RISK_NOTES = {
  blog: [],
  segmentfault: ["公开投稿能力尚未完成真实账号验证。"],
  toutiao: ["当前仅确认视频开放能力，文章投稿方式仍待验证。"],
  juejin: ["生成的是本地平台版本，不代表已写入掘金草稿箱。"],
  zhihu: ["发布前需人工检查改写后的开场语气。"],
  "51cto": ["需要在平台编辑器中完成最终提交。"],
  itpub: ["最近一次连接超时，重试前需保留正文副本。"],
  cnblogs: ["复制后需检查代码块与目录锚点。"],
  tencent: ["投稿接入方式尚未完成账号级验证。"],
  oschina: ["开源协议标签会影响平台内容分类。"],
  douyin: ["发布需要应用权限、用户授权和明确的最终确认。"],
  xiaohongshu: ["通用笔记发布 API 未确认，默认按复制发布处理。"],
  bilibili: ["稿件能力可用，但视频素材和分区仍需人工终审。"],
  csdn: ["访问令牌已过期，当前无法提交平台版本。"],
};

function createChannelSeedData() {
  return [
    {
      id: "blog",
      platform: "自建 Blog",
      mark: "B",
      type: "文章",
      group: "automatic",
      auth: "已授权",
      authTone: "success",
      progress: 100,
      method: "自动发布",
      status: "就绪",
      statusTone: "success",
      action: "查看预览",
      selected: true,
      detail: "保留 Markdown 结构、代码高亮与 canonical URL。",
    },
    {
      id: "segmentfault",
      platform: "思否",
      mark: "S",
      type: "文章",
      group: "drafts",
      auth: "能力待验证",
      authTone: "warning",
      progress: 84,
      method: "复制发布",
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      selected: false,
      detail: "已生成本地发布稿，公开投稿接口尚未完成账号级验证。",
    },
    {
      id: "toutiao",
      platform: "今日头条",
      mark: "头",
      type: "文章",
      group: "drafts",
      auth: "能力待验证",
      authTone: "warning",
      progress: 82,
      method: "生成草稿",
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      selected: false,
      detail: "文章版本已适配；已核实视频接口，文章投稿能力仍待验证。",
    },
    {
      id: "juejin",
      platform: "掘金",
      mark: "掘",
      type: "文章",
      group: "drafts",
      auth: "账号已连接",
      authTone: "success",
      progress: 96,
      method: "生成草稿",
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      selected: true,
      detail: "已生成本地草稿，确认分类、标签与首图后进入人工发布。",
    },
    {
      id: "zhihu",
      platform: "知乎",
      mark: "知",
      type: "文章",
      group: "drafts",
      auth: "账号已连接",
      authTone: "success",
      progress: 88,
      method: "生成草稿",
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      selected: true,
      detail: "已生成本地草稿，并改写开场与小标题，等待人工确认。",
    },
    {
      id: "51cto",
      platform: "51CTO",
      mark: "51",
      type: "文章",
      group: "drafts",
      auth: "账号已连接",
      authTone: "success",
      progress: 84,
      method: "复制发布",
      status: "待确认",
      statusTone: "warning",
      action: "编辑",
      selected: false,
      detail: "已生成可复制正文，需要在平台编辑器中完成发布。",
    },
    {
      id: "itpub",
      platform: "ITPUB",
      mark: "IT",
      type: "文章",
      group: "exceptions",
      auth: "账号已连接",
      authTone: "success",
      progress: 71,
      method: "复制发布",
      status: "失败",
      statusTone: "danger",
      action: "重试",
      selected: false,
      detail: "平台编辑器连接超时，正文副本已保留，可安全重试。",
    },
    {
      id: "cnblogs",
      platform: "博客园",
      mark: "园",
      type: "文章",
      group: "drafts",
      auth: "账号已连接",
      authTone: "success",
      progress: 90,
      method: "复制发布",
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      selected: false,
      detail: "代码块与目录已适配，仍需复制到博客园编辑器。",
    },
    {
      id: "tencent",
      platform: "腾讯云开发者社区",
      mark: "云",
      type: "文章",
      group: "drafts",
      auth: "能力待验证",
      authTone: "warning",
      progress: 86,
      method: "生成草稿",
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      selected: false,
      detail: "云开发关键词与摘要已补充，投稿接入方式仍待验证。",
    },
    {
      id: "oschina",
      platform: "开源中国",
      mark: "O",
      type: "文章",
      group: "drafts",
      auth: "账号已连接",
      authTone: "success",
      progress: 78,
      method: "复制发布",
      status: "待处理",
      statusTone: "neutral",
      action: "编辑",
      selected: false,
      detail: "需要确认开源协议标签并复制到平台。",
    },
    {
      id: "douyin",
      platform: "抖音",
      mark: "抖",
      type: "短视频",
      group: "repurpose",
      auth: "未授权",
      authTone: "danger",
      progress: 62,
      method: "需人工确认",
      status: "未授权",
      statusTone: "danger",
      action: "去授权",
      selected: false,
      detail: "官方发布能力依赖应用权限与用户授权，发布前必须明确确认。",
      deliverables: ["标题", "封面", "脚本", "话题", "视频描述"],
    },
    {
      id: "xiaohongshu",
      platform: "小红书",
      mark: "红",
      type: "图文",
      group: "repurpose",
      auth: "能力待验证",
      authTone: "warning",
      progress: 74,
      method: "复制发布",
      status: "待处理",
      statusTone: "neutral",
      action: "编辑",
      selected: true,
      detail: "通用笔记发布 API 未确认，先生成图文素材并复制发布。",
      deliverables: ["标题", "封面", "话题", "摘要"],
    },
    {
      id: "bilibili",
      platform: "哔哩哔哩",
      mark: "B站",
      type: "短视频",
      group: "repurpose",
      auth: "已授权",
      authTone: "success",
      progress: 68,
      method: "需人工确认",
      status: "待处理",
      statusTone: "neutral",
      action: "编辑",
      selected: false,
      detail: "官方开放平台支持稿件能力，仍需授权、内容再加工与人工确认。",
      deliverables: ["标题", "封面", "脚本", "简介"],
    },
    {
      id: "csdn",
      platform: "CSDN",
      mark: "C",
      type: "文章",
      group: "exceptions",
      auth: "授权过期",
      authTone: "danger",
      progress: 48,
      method: "生成草稿",
      status: "未授权",
      statusTone: "danger",
      action: "去授权",
      selected: false,
      detail: "访问令牌已过期，重新授权后可继续适配。",
    },
  ];
}

function statusCodeFromSeed(channel) {
  if (channel.status === "就绪") return PUBLISH_STATUS.READY;
  if (channel.status === "失败") return PUBLISH_STATUS.FAILED;
  if (channel.status === "未授权") {
    return PUBLISH_STATUS.NEEDS_AUTHORIZATION;
  }
  if (channel.status === "待确认") return PUBLISH_STATUS.NEEDS_REVIEW;
  if (channel.type !== "文章") return PUBLISH_STATUS.NEEDS_REPURPOSE;
  return PUBLISH_STATUS.MANUAL_DELIVERY;
}

function authorizationStatusFromSeed(channel) {
  if (channel.auth === "已授权" || channel.auth === "账号已连接") {
    return "authorized";
  }
  if (channel.auth === "授权过期") return "expired";
  if (channel.auth === "未授权") return "missing";
  return "unverified";
}

function createValidationIssues(seed, versionId) {
  const issues = [];

  if (seed.authTone === "danger") {
    issues.push({
      id: `${versionId}-authorization`,
      channelVersionId: versionId,
      severity: "error",
      code: "authorization_required",
      field: "authorization",
      message:
        seed.auth === "授权过期"
          ? "平台授权已过期，需要重新授权。"
          : "平台尚未授权，无法进入发布流程。",
      resolved: false,
    });
  } else if (seed.auth === "能力待验证") {
    issues.push({
      id: `${versionId}-capability`,
      channelVersionId: versionId,
      severity: "warning",
      code: "capability_unverified",
      field: "platformCapability",
      message: "平台发布能力尚未完成真实账号验证。",
      resolved: false,
    });
  }

  if (seed.status === "失败") {
    issues.push({
      id: `${versionId}-last-publish`,
      channelVersionId: versionId,
      severity: "error",
      code: "publish_failed",
      field: "publishTask",
      message: seed.detail,
      resolved: false,
    });
  }

  return issues;
}

function createProductState() {
  const seeds = createChannelSeedData();
  const validationIssues = seeds.flatMap((seed) =>
    createValidationIssues(seed, `${seed.id}-version-001`)
  );

  return {
    article: { ...INITIAL_ARTICLE, tags: [...INITIAL_ARTICLE.tags] },
    channels: seeds.map((seed) => ({
      id: seed.id,
      platform: seed.platform,
      mark: seed.mark,
      type: seed.type,
      capabilityId: `${seed.id}-capability`,
      selected: seed.selected,
      account: {
        authorizationStatus: authorizationStatusFromSeed(seed),
        label: seed.auth,
        tone: seed.authTone,
        connectedAt:
          seed.authTone === "success"
            ? "2026-06-12T20:00:00+08:00"
            : null,
      },
    })),
    platformCapabilities: seeds.map((seed) => ({
      id: `${seed.id}-capability`,
      channelId: seed.id,
      contentTypes: [seed.type],
      supportsAutomaticPublish: seed.method === "自动发布",
      supportsDraft: ["生成草稿", "自动发布"].includes(seed.method),
      requiresCopyPublish: seed.method === "复制发布",
      requiresAuthorization: true,
      requiresHumanConfirmation: seed.method !== "自动发布",
      requiresRepurpose: seed.type !== "文章",
      generatedAssets: [...(seed.deliverables || [])],
      verificationStatus:
        seed.auth === "能力待验证" ? "unverified" : "prototype-verified",
    })),
    channelVersions: seeds.map((seed) => ({
      id: `${seed.id}-version-001`,
      articleId: INITIAL_ARTICLE.id,
      channelId: seed.id,
      title: `${seed.platform}｜从单体流程走向 AI Agent`,
      versionStatus: "current",
      sourceArticleUpdatedAt: INITIAL_ARTICLE.updatedAt,
      queueGroup: seed.group,
      adaptationProgress: seed.progress,
      deliveryMethod: seed.method,
      status: statusCodeFromSeed(seed),
      detail: seed.detail,
      generatedAssets: [...(seed.deliverables || [])],
      missingItems: [...(CHANNEL_MISSING_ITEMS[seed.id] || [])],
      riskNotes: [...(CHANNEL_RISK_NOTES[seed.id] || [])],
      updatedAt: "2026-06-13T00:00:00+08:00",
    })),
    publishTasks: seeds.map((seed) => ({
      id: `${seed.id}-task-001`,
      channelId: seed.id,
      channelVersionId: `${seed.id}-version-001`,
      batchId: null,
      status: statusCodeFromSeed(seed),
      action: seed.action,
      retryCount: 0,
      maxRetries: 2,
      lastError: seed.status === "失败" ? seed.detail : null,
      publishedUrl: null,
      feedback: null,
    })),
    publishBatches: [],
    validationIssues,
    workspaceSettings: {
      queueDensity: "comfortable",
      activeView: "workbench",
      publishTime: "now",
      publishStrategy: "自动优先，失败重试",
      postAction: "回写数据并通知",
    },
  };
}

function cloneProductState(state) {
  return JSON.parse(JSON.stringify(state));
}

function mergeRecordCollections(defaultItems, persistedItems) {
  if (!Array.isArray(persistedItems)) {
    return cloneProductState(defaultItems);
  }
  const persistedById = new Map(
    persistedItems
      .filter((item) => item && item.id)
      .map((item) => [item.id, item])
  );
  return defaultItems.map((defaultItem) => {
    const persisted = persistedById.get(defaultItem.id);
    if (!persisted) return cloneProductState(defaultItem);
    return {
      ...cloneProductState(defaultItem),
      ...cloneProductState(persisted),
      account: defaultItem.account
        ? {
            ...cloneProductState(defaultItem.account),
            ...(persisted.account || {}),
          }
        : persisted.account,
    };
  });
}

function mergePersistedState(defaultState, persistedState) {
  if (!persistedState || typeof persistedState !== "object") {
    return cloneProductState(defaultState);
  }

  return {
    ...cloneProductState(defaultState),
    article: {
      ...cloneProductState(defaultState.article),
      ...(persistedState.article || {}),
      tags: Array.isArray(persistedState.article?.tags)
        ? [...persistedState.article.tags]
        : [...defaultState.article.tags],
    },
    channels: mergeRecordCollections(
      defaultState.channels,
      persistedState.channels
    ),
    platformCapabilities: mergeRecordCollections(
      defaultState.platformCapabilities,
      persistedState.platformCapabilities
    ),
    channelVersions: mergeRecordCollections(
      defaultState.channelVersions,
      persistedState.channelVersions
    ),
    publishTasks: mergeRecordCollections(
      defaultState.publishTasks,
      persistedState.publishTasks
    ),
    publishBatches: Array.isArray(persistedState.publishBatches)
      ? cloneProductState(persistedState.publishBatches)
      : cloneProductState(defaultState.publishBatches),
    validationIssues: Array.isArray(persistedState.validationIssues)
      ? cloneProductState(persistedState.validationIssues)
      : cloneProductState(defaultState.validationIssues),
    workspaceSettings: {
      ...cloneProductState(defaultState.workspaceSettings),
      ...(persistedState.workspaceSettings || {}),
    },
  };
}

function countReadableCharacters(value) {
  return Array.from(String(value || "").replace(/\s+/g, "")).length;
}

function calculateArticleMetrics({ title, summary, bodyText }) {
  const wordCount =
    countReadableCharacters(title) +
    countReadableCharacters(summary) +
    countReadableCharacters(bodyText);
  return {
    wordCount,
    readingMinutes: wordCount ? Math.max(1, Math.ceil(wordCount / 350)) : 0,
    seoSummaryLength: Array.from(String(summary || "")).length,
  };
}

function updateArticleContent(state, patch, updatedAt = new Date().toISOString()) {
  const nextState = cloneProductState(state);
  const contentFields = new Set([
    "title",
    "summary",
    "bodyHtml",
    "tags",
    "coverDescription",
  ]);
  const hasContentChange = Object.keys(patch).some((key) =>
    contentFields.has(key)
  );

  nextState.article = {
    ...nextState.article,
    ...patch,
    tags: patch.tags ? [...patch.tags] : [...nextState.article.tags],
    updatedAt,
  };

  if (hasContentChange) {
    nextState.channelVersions = nextState.channelVersions.map((version) => ({
      ...version,
      versionStatus: "needs_adaptation",
    }));
    nextState.channelVersions.forEach((version) => {
      const existingIssue = nextState.validationIssues.find(
        (issue) =>
          issue.channelVersionId === version.id &&
          issue.code === "content_changed" &&
          !issue.resolved
      );
      if (!existingIssue) {
        nextState.validationIssues.push({
          id: `${version.id}-content-changed-${updatedAt}`,
          channelVersionId: version.id,
          severity: "warning",
          code: "content_changed",
          field: "article",
          message: "主文章内容已变化，需要重新生成平台版本。",
          resolved: false,
          createdAt: updatedAt,
          resolvedAt: null,
        });
      }
    });
  }

  return nextState;
}

function readaptChannelVersion(
  state,
  channelId,
  updatedAt = new Date().toISOString()
) {
  const nextState = cloneProductState(state);
  const channel = nextState.channels.find((item) => item.id === channelId);
  const version = nextState.channelVersions.find(
    (item) => item.channelId === channelId
  );
  const task = nextState.publishTasks.find(
    (item) => item.channelId === channelId
  );
  if (!channel || !version || !task) return nextState;

  const authorizationBlocked = ["missing", "expired"].includes(
    channel.account.authorizationStatus
  );
  const hasPublishFailure = nextState.validationIssues.some(
    (issue) =>
      issue.channelVersionId === version.id &&
      issue.code === "publish_failed" &&
      !issue.resolved
  );

  version.versionStatus = "current";
  version.sourceArticleUpdatedAt = nextState.article.updatedAt;
  version.updatedAt = updatedAt;
  version.adaptationProgress = 100;
  nextState.validationIssues = nextState.validationIssues.map((issue) =>
    issue.channelVersionId === version.id &&
    issue.code === "content_changed" &&
    !issue.resolved
      ? { ...issue, resolved: true, resolvedAt: updatedAt }
      : issue
  );

  if (authorizationBlocked) {
    version.status = PUBLISH_STATUS.NEEDS_AUTHORIZATION;
    task.status = PUBLISH_STATUS.NEEDS_AUTHORIZATION;
    task.action = "去授权";
  } else if (hasPublishFailure) {
    version.status = PUBLISH_STATUS.FAILED;
    task.status = PUBLISH_STATUS.FAILED;
    task.action = "重试";
  } else {
    version.status = PUBLISH_STATUS.NEEDS_REVIEW;
    task.status = PUBLISH_STATUS.NEEDS_REVIEW;
    task.action = "确认";
    version.detail =
      channel.type === "文章"
        ? "已根据最新正文重新生成平台版本，请检查标题、摘要与格式后确认。"
        : "标题、封面、脚本、话题和简介已按最新正文重新生成，请完成人工确认。";
  }

  return nextState;
}

function confirmChannelVersion(state, channelId) {
  const nextState = cloneProductState(state);
  const channel = nextState.channels.find((item) => item.id === channelId);
  const version = nextState.channelVersions.find(
    (item) => item.channelId === channelId
  );
  const task = nextState.publishTasks.find(
    (item) => item.channelId === channelId
  );
  if (!channel || !version || !task) return nextState;
  if (
    version.versionStatus !== "current" ||
    ["missing", "expired"].includes(channel.account.authorizationStatus)
  ) {
    return nextState;
  }

  channel.selected = true;
  version.status = PUBLISH_STATUS.READY;
  version.adaptationProgress = 100;
  version.missingItems = [];
  version.detail =
    version.deliveryMethod === "自动发布"
      ? "版本检查已通过，可进入自动发布批次。"
      : `版本检查已通过，可按“${version.deliveryMethod}”方式加入发布批次。`;
  task.status = PUBLISH_STATUS.READY;
  task.action = "查看预览";
  return nextState;
}

function getChannelViews(state) {
  return state.channels.map((channel) => {
    const capability = state.platformCapabilities.find(
      (item) => item.id === channel.capabilityId
    );
    const version = state.channelVersions.find(
      (item) => item.channelId === channel.id
    );
    const task = state.publishTasks.find(
      (item) => item.channelId === channel.id
    );
    const blockingTaskStatus = [
      PUBLISH_STATUS.NEEDS_AUTHORIZATION,
      PUBLISH_STATUS.FAILED,
    ].includes(task.status);
    const taskOwnsStatus = [
      PUBLISH_STATUS.QUEUED,
      PUBLISH_STATUS.PUBLISHING,
      PUBLISH_STATUS.PUBLISHED,
      PUBLISH_STATUS.PARTIAL,
    ].includes(task.status);
    const needsAdaptation = version.versionStatus !== "current";
    const effectiveStatus = blockingTaskStatus
      ? task.status
      : needsAdaptation
        ? PUBLISH_STATUS.NEEDS_ADAPTATION
        : taskOwnsStatus
          ? task.status
          : version.status;
    const statusPresentation = STATUS_PRESENTATION[effectiveStatus];
    const effectiveAction =
      needsAdaptation && !blockingTaskStatus ? "重新适配" : task.action;
    const effectiveDetail = needsAdaptation
      ? "内容已变化，当前平台版本已过期，需要重新生成后再确认发布。"
      : version.detail;

    return {
      id: channel.id,
      platform: channel.platform,
      mark: channel.mark,
      type: channel.type,
      group: version.queueGroup,
      auth: channel.account.label,
      authTone: channel.account.tone,
      progress: version.adaptationProgress,
      method: version.deliveryMethod,
      status: statusPresentation.label,
      statusCode: effectiveStatus,
      statusTone: statusPresentation.tone,
      action: effectiveAction,
      selected: channel.selected,
      detail: effectiveDetail,
      versionStatus: version.versionStatus,
      needsAdaptation,
      deliverables: [...version.generatedAssets],
      missingItems: [...version.missingItems],
      riskNotes: [...version.riskNotes],
      validationIssues: state.validationIssues.filter(
        (issue) => issue.channelVersionId === version.id && !issue.resolved
      ),
      account: { ...channel.account },
      capability: { ...capability },
      version: { ...version },
      publishTask: { ...task },
    };
  });
}

function createChannelData() {
  return getChannelViews(createProductState());
}

function getVisibleDeliverables(deliverables, limit = 4) {
  const items = deliverables || [];
  return {
    visible: items.slice(0, limit),
    overflow: Math.max(0, items.length - limit),
  };
}

function applyChannelTransition(state, channelId, transition) {
  const nextState = {
    ...state,
    channels: state.channels.map((channel) => ({
      ...channel,
      account: { ...channel.account },
    })),
    channelVersions: state.channelVersions.map((version) => ({
      ...version,
      generatedAssets: [...version.generatedAssets],
      missingItems: [...version.missingItems],
      riskNotes: [...version.riskNotes],
    })),
    publishTasks: state.publishTasks.map((task) => ({ ...task })),
    validationIssues: state.validationIssues.map((issue) => ({ ...issue })),
    publishBatches: state.publishBatches.map((batch) => ({
      ...batch,
      taskIds: [...batch.taskIds],
      postActions: [...batch.postActions],
    })),
  };
  const channel = nextState.channels.find((item) => item.id === channelId);
  const version = nextState.channelVersions.find(
    (item) => item.channelId === channelId
  );
  const task = nextState.publishTasks.find(
    (item) => item.channelId === channelId
  );

  if (!channel || !version || !task) return nextState;
  channel.selected = true;

  if (transition === "confirm") {
    version.adaptationProgress = 100;
    version.status = PUBLISH_STATUS.MANUAL_DELIVERY;
    version.detail =
      "本地检查已完成，仍需按该渠道的草稿或复制流程提交。";
    task.status = PUBLISH_STATUS.MANUAL_DELIVERY;
    task.action = "查看预览";
  }

  if (transition === "authorize") {
    channel.account = {
      authorizationStatus: "authorized",
      label: "已授权",
      tone: "success",
      connectedAt: "2026-06-13T00:00:00+08:00",
    };
    version.status =
      channel.type === "文章"
        ? PUBLISH_STATUS.NEEDS_REVIEW
        : PUBLISH_STATUS.NEEDS_REPURPOSE;
    version.queueGroup = channel.type === "文章" ? "drafts" : "repurpose";
    version.adaptationProgress = channel.type === "文章" ? 86 : 72;
    version.detail =
      channel.type === "文章"
        ? "授权已恢复，平台草稿已重新生成，请完成最终确认。"
        : "授权已恢复，可以继续生成平台所需的再加工素材。";
    version.missingItems = version.missingItems.filter(
      (item) => item !== "重新授权" && item !== "应用授权"
    );
    task.status = version.status;
    task.action = channel.type === "文章" ? "确认" : "编辑";
    nextState.validationIssues = nextState.validationIssues.map((issue) =>
      issue.channelVersionId === version.id &&
      issue.code === "authorization_required"
        ? { ...issue, resolved: true }
        : issue
    );
  }

  if (transition === "retry") {
    version.queueGroup = "drafts";
    version.status = PUBLISH_STATUS.NEEDS_REVIEW;
    version.adaptationProgress = 92;
    version.detail = "重试成功，草稿已恢复并等待人工确认。";
    task.status = PUBLISH_STATUS.NEEDS_REVIEW;
    task.action = "确认";
    task.retryCount += 1;
    task.lastError = null;
    nextState.validationIssues = nextState.validationIssues.map((issue) =>
      issue.channelVersionId === version.id &&
      issue.code === "publish_failed"
        ? { ...issue, resolved: true }
        : issue
    );
  }

  return nextState;
}

function createPreviewDecision(state, channelId) {
  const channel = getChannelViews(state).find((item) => item.id === channelId);
  if (!channel) return null;

  return {
    platform: channel.platform,
    type: channel.type,
    method: channel.method,
    authorization: channel.auth,
    adaptationProgress: channel.progress,
    versionStatus: channel.versionStatus,
    isStale: channel.needsAdaptation,
    needsAdaptation: channel.needsAdaptation,
    missingItems:
      channel.missingItems.length > 0
        ? [...channel.missingItems]
        : ["无阻塞项"],
    riskNotes:
      channel.riskNotes.length > 0
        ? [...channel.riskNotes]
        : ["当前未发现阻塞发布的风险。"],
    validationIssues: [...channel.validationIssues],
    preflightChecks: [
      {
        label: "版本时效",
        result: channel.needsAdaptation ? "block" : "pass",
        message: channel.needsAdaptation
          ? "主文章已更新，必须重新适配。"
          : "平台版本与主文章一致。",
      },
      {
        label: "账号授权",
        result: ["missing", "expired"].includes(
          channel.account.authorizationStatus
        )
          ? "block"
          : channel.account.authorizationStatus === "unverified"
            ? "warning"
            : "pass",
        message: channel.auth,
      },
      {
        label: "缺失项",
        result: channel.missingItems.length ? "warning" : "pass",
        message: channel.missingItems.length
          ? `仍有 ${channel.missingItems.length} 项需要确认。`
          : "未发现阻塞项。",
      },
    ],
  };
}

function createPublishBatch(state, options = {}) {
  const views = getChannelViews(state);
  const readyChannels = getReadyChannels(views);
  const batchId = `batch-${String(state.publishBatches.length + 1).padStart(
    3,
    "0"
  )}`;
  const taskIds = readyChannels.map(
    (channel) =>
      state.publishTasks.find((task) => task.channelId === channel.id).id
  );
  const createdAt = options.now || new Date().toISOString();
  const automaticChannelIds = readyChannels
    .filter((channel) => channel.capability.supportsAutomaticPublish)
    .map((channel) => channel.id);
  const successCount = automaticChannelIds.length;
  const pendingCount = readyChannels.length - successCount;
  const batchStatus =
    successCount === readyChannels.length
      ? PUBLISH_STATUS.PUBLISHED
      : successCount > 0
        ? PUBLISH_STATUS.PARTIAL
        : PUBLISH_STATUS.QUEUED;
  const batch = {
    id: batchId,
    articleId: state.article.id,
    articleTitle: state.article.title,
    taskIds,
    channelIds: readyChannels.map((channel) => channel.id),
    channelCount: readyChannels.length,
    successCount,
    pendingCount,
    failedCount: 0,
    status: batchStatus,
    schedule: options.schedule || "now",
    strategy: options.strategy || "automatic-first",
    postActions: [...(options.postActions || ["write-back", "notify"])],
    createdAt,
    completedAt:
      batchStatus === PUBLISH_STATUS.PUBLISHED ? createdAt : null,
  };
  const nextState = {
    ...state,
    publishTasks: state.publishTasks.map((task) =>
      taskIds.includes(task.id)
        ? {
            ...task,
            batchId,
            status: automaticChannelIds.includes(task.channelId)
              ? PUBLISH_STATUS.PUBLISHED
              : PUBLISH_STATUS.QUEUED,
            publishedUrl: automaticChannelIds.includes(task.channelId)
              ? `https://blog.example.com/${state.article.slug}`
              : null,
          }
        : { ...task }
    ),
    publishBatches: [...state.publishBatches, batch],
  };

  return { state: nextState, batch, readyChannels };
}

function getPublishHistoryRows(state) {
  return [...state.publishBatches]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((batch) => ({
      id: batch.id,
      publishedAt: batch.createdAt,
      articleTitle: batch.articleTitle || state.article.title,
      channelCount: batch.channelCount ?? batch.taskIds.length,
      successCount: batch.successCount ?? 0,
      pendingCount: batch.pendingCount ?? 0,
      failedCount: batch.failedCount ?? 0,
      strategy: batch.strategy,
      status: batch.status,
      channelIds: [...(batch.channelIds || [])],
    }));
}

function reusePublishBatch(state, batchId) {
  const nextState = cloneProductState(state);
  const batch = nextState.publishBatches.find((item) => item.id === batchId);
  if (!batch) return nextState;
  const selectedIds = new Set(batch.channelIds || []);

  nextState.channels = nextState.channels.map((channel) => ({
    ...channel,
    selected: selectedIds.has(channel.id),
  }));
  nextState.publishTasks = nextState.publishTasks.map((task) => {
    if (!selectedIds.has(task.channelId)) return task;
    const channel = nextState.channels.find(
      (item) => item.id === task.channelId
    );
    const version = nextState.channelVersions.find(
      (item) => item.channelId === task.channelId
    );
    if (version.versionStatus !== "current") {
      return {
        ...task,
        batchId: null,
        status: PUBLISH_STATUS.NEEDS_ADAPTATION,
        action: "重新适配",
        publishedUrl: null,
      };
    }
    if (
      ["missing", "expired"].includes(channel.account.authorizationStatus)
    ) {
      return {
        ...task,
        batchId: null,
        status: PUBLISH_STATUS.NEEDS_AUTHORIZATION,
        action: "去授权",
        publishedUrl: null,
      };
    }
    return {
      ...task,
      batchId: null,
      status: PUBLISH_STATUS.READY,
      action: "查看预览",
      publishedUrl: null,
    };
  });
  nextState.workspaceSettings.activeView = "workbench";
  return nextState;
}

function groupChannels(channels) {
  return Object.keys(CHANNEL_GROUPS).reduce((groups, key) => {
    groups[key] = channels.filter((channel) => channel.group === key);
    return groups;
  }, {});
}

function getReadyChannels(channels) {
  return channels.filter(
    (channel) => channel.selected && channel.status === "就绪"
  );
}

function summarizeSelection(channels) {
  const selectedChannels = channels.filter((channel) => channel.selected);
  const ready = getReadyChannels(channels).length;
  const nonAttentionStatuses = new Set([
    PUBLISH_STATUS.READY,
    PUBLISH_STATUS.QUEUED,
    PUBLISH_STATUS.PUBLISHING,
    PUBLISH_STATUS.PUBLISHED,
  ]);
  const attention = selectedChannels.filter(
    (channel) =>
      !nonAttentionStatuses.has(channel.statusCode) &&
      channel.status !== "就绪"
  ).length;

  return {
    selected: selectedChannels.length,
    ready,
    attention,
  };
}

function formatPublishSummary(summary) {
  return `已选 ${summary.selected} 个渠道 · ${summary.ready} 个就绪 · ${summary.attention} 个待确认`;
}

function transitionChannel(channel, transition) {
  if (transition === "confirm") {
    return {
      ...channel,
      group: "drafts",
      progress: 100,
      status: "待处理",
      statusTone: "neutral",
      action: "查看预览",
      detail: "本地检查已完成，仍需按该渠道的草稿或复制流程提交。",
    };
  }

  if (transition === "authorize") {
    const isRepurposeChannel = channel.type !== "文章";
    return {
      ...channel,
      auth: "已授权",
      authTone: "success",
      group: isRepurposeChannel ? "repurpose" : "drafts",
      progress: isRepurposeChannel ? 72 : 86,
      status: isRepurposeChannel ? "待处理" : "待确认",
      statusTone: isRepurposeChannel ? "neutral" : "warning",
      action: isRepurposeChannel ? "编辑" : "确认",
      detail: isRepurposeChannel
        ? "授权已恢复，可以继续生成平台所需的再加工素材。"
        : "授权已恢复，平台草稿已重新生成，请完成最终确认。",
    };
  }

  if (transition === "retry") {
    return {
      ...channel,
      group: "drafts",
      progress: 92,
      status: "待确认",
      statusTone: "warning",
      action: "确认",
      detail: "重试成功，草稿已恢复并等待人工确认。",
    };
  }

  return { ...channel };
}

function estimatePublishMinutes(readyCount, scheduled) {
  if (!readyCount) return 0;
  return Math.max(2, Math.ceil(readyCount * 0.75)) + (scheduled ? 1 : 0);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CHANNEL_GROUPS,
    PUBLISH_STATUS,
    applyChannelTransition,
    calculateArticleMetrics,
    confirmChannelVersion,
    createPreviewDecision,
    createProductState,
    createPublishBatch,
    createChannelData,
    estimatePublishMinutes,
    formatPublishSummary,
    getChannelViews,
    getPublishHistoryRows,
    groupChannels,
    getReadyChannels,
    getVisibleDeliverables,
    mergePersistedState,
    readaptChannelVersion,
    reusePublishBatch,
    summarizeSelection,
    transitionChannel,
    updateArticleContent,
  };
}

if (typeof document !== "undefined") {
  const stateStore = window.OneFlowStorage?.createLocalStateStore(
    window.localStorage
  );
  const defaultState = createProductState();
  const restoredSnapshot = stateStore?.load() || {
    ok: true,
    state: null,
    savedAt: null,
  };
  let productState =
    restoredSnapshot.ok && restoredSnapshot.state
      ? mergePersistedState(defaultState, restoredSnapshot.state)
      : defaultState;
  let channels = getChannelViews(productState);
  let activeFilter = "all";
  let currentPreviewId = null;
  let currentPreviewMode = "channel";
  let currentPreviewText = "";
  let toastTimer = null;
  let saveTimer = null;

  const queueGroups = document.querySelector("#queue-groups");
  const publishSummary = document.querySelector("#publish-summary");
  const readyCount = document.querySelector("#ready-count");
  const publishEstimate = document.querySelector("#publish-estimate");
  const publishTime = document.querySelector("#publish-time");
  const publishButton = document.querySelector("#publish-button");
  const queueReadyCount = document.querySelector("#queue-ready-count");
  const queueReviewCount = document.querySelector("#queue-review-count");
  const queueIssueCount = document.querySelector("#queue-issue-count");
  const previewDialog = document.querySelector("#preview-dialog");
  const previewTitle = document.querySelector("#preview-title");
  const previewMeta = document.querySelector("#preview-meta");
  const previewContent = document.querySelector("#preview-content");
  const previewConfirm = document.querySelector("#preview-confirm");
  const previewCopy = document.querySelector("#preview-copy");
  const toast = document.querySelector("#toast");
  const publishQueue = document.querySelector("#publish-queue");
  const workspaceSidebar = document.querySelector("#workspace-sidebar");
  const panelScrim = document.querySelector("#panel-scrim");
  const toggleQueue = document.querySelector("#toggle-queue");
  const toggleSidebar = document.querySelector("#toggle-sidebar");
  const toolbarMore = document.querySelector("#toolbar-more");
  const toolbarMoreMenu = document.querySelector("#toolbar-more-menu");
  const saveStatus = document.querySelector("#save-status");
  const editorTitle = document.querySelector("#editor-title");
  const articleSummary = document.querySelector("#article-summary");
  const articleBody = document.querySelector("#article-body");
  const coverDescription = document.querySelector("#cover-description");
  const articleTags = document.querySelector("#article-tags");
  const tagInput = document.querySelector("#tag-input");
  const tagAddButton = document.querySelector("#tag-add-button");
  const wordCount = document.querySelector("#word-count");
  const readingMinutes = document.querySelector("#reading-minutes");
  const seoCount = document.querySelector("#seo-count");
  const resetDemo = document.querySelector("#reset-demo");
  const workbenchView = document.querySelector("#workbench-view");
  const publishHistoryView = document.querySelector(
    "#publish-history-view"
  );
  const publishHistoryList = document.querySelector(
    "#publish-history-list"
  );
  const agentRail = document.querySelector("#agent-rail");
  const publishDock = document.querySelector("#publish-dock");
  const previewBack = document.querySelector("#preview-back");

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatLocalTime(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  function setSaveStatus(status, savedAt = null) {
    saveStatus.dataset.saveState = status;
    if (status === "saving") {
      saveStatus.textContent = "保存中";
      return;
    }
    if (status === "failed") {
      saveStatus.textContent = "保存失败";
      return;
    }
    saveStatus.textContent = savedAt
      ? `已保存 ${formatLocalTime(savedAt).slice(6)}`
      : "已保存";
  }

  function saveNow() {
    if (!stateStore) {
      setSaveStatus("failed");
      return false;
    }
    const savedAt = new Date().toISOString();
    productState.article.savedAt = savedAt;
    const result = stateStore.save(productState);
    if (!result.ok) {
      setSaveStatus("failed");
      return false;
    }
    setSaveStatus("saved", result.savedAt);
    return true;
  }

  function scheduleSave() {
    setSaveStatus("saving");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 500);
  }

  function renderTags() {
    articleTags.replaceChildren();
    productState.article.tags.forEach((tag) => {
      const item = document.createElement("span");
      item.className = "article-tag";
      const label = document.createElement("span");
      label.textContent = tag;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.removeTag = tag;
      remove.setAttribute("aria-label", `删除标签 ${tag}`);
      remove.textContent = "×";
      item.append(label, remove);
      articleTags.append(item);
    });
  }

  function updateEditorMetrics() {
    const metrics = calculateArticleMetrics({
      title: editorTitle.innerText,
      summary: articleSummary.innerText,
      bodyText: articleBody.innerText,
    });
    Object.assign(productState.article, metrics);
    wordCount.textContent = metrics.wordCount.toLocaleString("zh-CN");
    readingMinutes.textContent = metrics.readingMinutes;
    seoCount.textContent = metrics.seoSummaryLength;
    seoCount.parentElement.classList.toggle(
      "is-over-limit",
      metrics.seoSummaryLength > 160
    );
  }

  function hydrateEditor() {
    editorTitle.textContent = productState.article.title;
    articleSummary.textContent = productState.article.summary;
    articleBody.innerHTML = productState.article.bodyHtml;
    coverDescription.textContent = productState.article.coverDescription;
    renderTags();
    updateEditorMetrics();
    setSaveStatus(
      restoredSnapshot.ok ? "saved" : "failed",
      productState.article.savedAt || restoredSnapshot.savedAt
    );
  }

  function applyArticlePatch(patch) {
    productState = updateArticleContent(productState, patch);
    updateEditorMetrics();
    renderQueue();
    scheduleSave();
  }

  function addTag() {
    const tag = tagInput.value.trim();
    if (!tag || productState.article.tags.includes(tag)) return;
    applyArticlePatch({ tags: [...productState.article.tags, tag] });
    tagInput.value = "";
    renderTags();
  }

  function renderPublishHistory() {
    const rows = getPublishHistoryRows(productState);
    if (!rows.length) {
      publishHistoryList.innerHTML = `
        <div class="history-empty">
          <strong>还没有发布批次</strong>
          <p>确认平台版本并从工作台发布后，记录会保存在这里。</p>
        </div>
      `;
      return;
    }

    publishHistoryList.innerHTML = rows
      .map(
        (row) => `
          <article class="history-row" data-batch-id="${row.id}">
            <time datetime="${row.publishedAt}">${formatLocalTime(row.publishedAt)}</time>
            <div class="history-article">
              <strong>${escapeHtml(row.articleTitle)}</strong>
              <span>${row.channelCount} 个渠道</span>
            </div>
            <div class="history-results">
              <span class="is-success">${row.successCount} 成功</span>
              <span>${row.pendingCount} 待确认</span>
              <span class="${row.failedCount ? "is-danger" : ""}">${row.failedCount} 失败</span>
            </div>
            <span class="history-strategy">${escapeHtml(row.strategy)}</span>
            <div class="history-actions">
              <button type="button" data-batch-detail="${row.id}">查看详情</button>
              <button type="button" data-batch-reuse="${row.id}">复用为新批次</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function switchView(view, persist = true) {
    const isHistory = view === "history";
    workbenchView.hidden = isHistory;
    agentRail.hidden = isHistory;
    publishDock.hidden = isHistory;
    publishHistoryView.hidden = !isHistory;
    document.querySelectorAll(".top-nav [data-app-view]").forEach((button) => {
      const active = button.dataset.appView === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    productState.workspaceSettings.activeView = view;
    if (isHistory) renderPublishHistory();
    if (persist) saveNow();
  }

  function getFilteredChannels() {
    if (activeFilter === "selected") {
      return channels.filter((channel) => channel.selected);
    }

    if (activeFilter === "attention") {
      return channels.filter((channel) => channel.status !== "就绪");
    }

    return channels;
  }

  function channelItemTemplate(channel) {
    const deliverableDisplay = getVisibleDeliverables(channel.deliverables);
    const deliverables = deliverableDisplay.visible.length
      ? `<div class="channel-deliverables" aria-label="平台交付项">${deliverableDisplay.visible
          .map((item) => `<span>${item}</span>`)
          .join("")}${
            deliverableDisplay.overflow
              ? `<span aria-label="另有 ${deliverableDisplay.overflow} 个交付项">+${deliverableDisplay.overflow}</span>`
              : ""
          }</div>`
      : "";

    return `
      <article class="channel-item ${channel.selected ? "is-selected" : ""}"
        data-channel-id="${channel.id}" data-group="${channel.group}"
        data-status-tone="${channel.statusTone}"
        data-version-status="${channel.versionStatus}">
        <button class="channel-check" type="button"
          aria-label="${channel.selected ? "取消选择" : "选择"} ${channel.platform}"
          aria-pressed="${channel.selected}" data-channel-select="${channel.id}">
          ✓
        </button>
        <div class="channel-main">
          <div class="channel-title-row">
            <span class="channel-mark" aria-hidden="true">${channel.mark}</span>
            <strong>${channel.platform}</strong>
            <span class="channel-type">${channel.type}</span>
          </div>
          <div class="channel-status-row">
            <span class="status-dot tone-${channel.authTone}" aria-hidden="true"></span>
            <span>${channel.auth}</span>
            <span class="channel-method" data-method="${channel.method}">${channel.method}</span>
            <span class="channel-current-status tone-${channel.statusTone}">${channel.status}</span>
          </div>
          <div class="channel-progress-row" aria-label="适配进度 ${channel.progress}%">
            <span class="progress-track"><span class="progress-fill" style="width:${channel.progress}%"></span></span>
            <span>${channel.progress}%</span>
          </div>
          <p class="channel-detail">${channel.detail}</p>
          ${deliverables}
        </div>
        <button class="channel-action" type="button"
          data-channel-action="${channel.id}" title="${channel.action} ${channel.platform}">${channel.action}</button>
      </article>
    `;
  }

  function renderQueue() {
    channels = getChannelViews(productState);
    publishQueue.dataset.density =
      productState.workspaceSettings.queueDensity;
    document.querySelectorAll("[data-queue-density]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.queueDensity ===
          productState.workspaceSettings.queueDensity
      );
    });
    const filtered = getFilteredChannels();
    const grouped = groupChannels(filtered);

    queueGroups.innerHTML = Object.entries(CHANNEL_GROUPS)
      .map(([key, group]) => {
        const groupChannelsList = grouped[key];
        if (!groupChannelsList.length) return "";

        return `
          <section class="queue-group" data-queue-group="${key}">
            <header class="queue-group-heading">
              <div>
                <h3>${group.title}</h3>
                <p>${group.description}</p>
              </div>
              <span>${groupChannelsList.length}</span>
            </header>
            <div class="channel-list">
              ${groupChannelsList.map(channelItemTemplate).join("")}
            </div>
          </section>
        `;
      })
      .join("");

    if (!filtered.length) {
      queueGroups.innerHTML =
        '<p class="queue-empty">当前筛选下没有渠道，切换筛选条件继续检查。</p>';
    }

    updateSummary();
  }

  function updateSummary() {
    const summary = summarizeSelection(channels);
    const ready = getReadyChannels(channels);
    const scheduled = publishTime.value === "scheduled";
    const reviewTotal = channels.filter(
      (channel) => channel.status === "待确认"
    ).length;
    const issueTotal = channels.filter((channel) =>
      ["待处理", "未授权", "失败", "需重新适配"].includes(channel.status)
    ).length;

    publishSummary.textContent = formatPublishSummary(summary);
    readyCount.textContent = summary.ready;
    queueReadyCount.textContent = channels.filter(
      (channel) => channel.status === "就绪"
    ).length;
    queueReviewCount.textContent = reviewTotal;
    queueIssueCount.textContent = issueTotal;
    publishEstimate.textContent = estimatePublishMinutes(
      ready.length,
      scheduled
    );
    publishButton.disabled = ready.length === 0;
    publishButton.firstChild.textContent = "发布 ";
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function openPreview(channel) {
    currentPreviewId = channel ? channel.id : null;
    currentPreviewMode = channel ? "channel" : "article";
    const isArticlePreview = !channel;
    const decision = channel
      ? createPreviewDecision(productState, channel.id)
      : null;
    const title = isArticlePreview
      ? "文章阅读预览"
      : `${channel.platform}版本预览`;

    previewTitle.textContent = title;
    previewBack.textContent = "返回修改";
    previewCopy.hidden = false;
    previewMeta.innerHTML = isArticlePreview
      ? `<span>主文章</span><span>${productState.article.wordCount.toLocaleString(
          "zh-CN"
        )} 字</span><span>预计阅读 ${
          productState.article.readingMinutes
        } 分钟</span>`
      : `
          <span>${decision.platform}</span>
          <span>${decision.type}</span>
          <span>${decision.method}</span>
          <span>${decision.authorization}</span>
        `;

    const decisionGrid = decision
      ? `
        <div class="preview-decision-grid" aria-label="发布决策信息">
          <div><span>当前平台</span><strong>${decision.platform}</strong></div>
          <div><span>平台类型</span><strong>${decision.type}</strong></div>
          <div><span>发布方式</span><strong>${decision.method}</strong></div>
          <div><span>授权状态</span><strong>${decision.authorization}</strong></div>
          <div><span>适配进度</span><strong>${decision.adaptationProgress}%</strong></div>
          <div><span>当前状态</span><strong>${channel.status}</strong></div>
          <div><span>版本是否过期</span><strong>${decision.isStale ? "是" : "否"}</strong></div>
          <div><span>需要重新适配</span><strong>${decision.needsAdaptation ? "是" : "否"}</strong></div>
        </div>
      `
      : "";
    const missingItems = decision
      ? `
        <section class="preview-review-block">
          <h4>缺失项</h4>
          <ul>${decision.missingItems
            .map((item) => `<li>${item}</li>`)
            .join("")}</ul>
        </section>
      `
      : "";
    const riskNotes = decision
      ? `
        <section class="preview-review-block is-risk">
          <h4>风险提示</h4>
          <ul>${decision.riskNotes
            .map((item) => `<li>${item}</li>`)
            .join("")}</ul>
        </section>
      `
      : "";
    const preflightChecks = decision
      ? `
        <section class="preview-review-block preview-checks">
          <h4>发布前检查结果</h4>
          <ul>${decision.preflightChecks
            .map(
              (check) =>
                `<li data-check-result="${check.result}"><strong>${check.label}</strong><span>${check.message}</span></li>`
            )
            .join("")}</ul>
        </section>
      `
      : "";

    previewContent.innerHTML = `
      ${decisionGrid}
      <h3>${escapeHtml(
        isArticlePreview ? productState.article.title : channel.version.title
      )}</h3>
      <p>${
        isArticlePreview
          ? escapeHtml(productState.article.summary)
          : escapeHtml(channel.detail)
      }</p>
      <img class="preview-cover" src="assets/article-cover.png"
        alt="内容工作流文章封面预览" />
      ${missingItems}
      ${riskNotes}
      ${preflightChecks}
      <p>发布说明：系统会保留主文章版本，并将平台链接、发布时间与后续表现回写到本次发布任务。</p>
    `;

    currentPreviewText = isArticlePreview
      ? `${productState.article.title}\n\n${productState.article.summary}\n\n${articleBody.innerText}`
      : `${channel.version.title}\n\n${channel.detail}\n\n发布方式：${channel.method}\n授权状态：${channel.auth}`;
    previewConfirm.hidden = isArticlePreview;
    previewConfirm.disabled =
      !isArticlePreview &&
      (decision.needsAdaptation ||
        ["未授权", "失败", "发布中", "已发布"].includes(channel.status));
    previewConfirm.title = previewConfirm.disabled
      ? "请先完成重新适配、授权或重试"
      : "确认当前平台版本并加入待发布选择";
    previewDialog.showModal();
  }

  function openBatchDetail(batchId) {
    const batch = productState.publishBatches.find(
      (item) => item.id === batchId
    );
    if (!batch) return;
    currentPreviewMode = "batch";
    currentPreviewId = null;
    previewTitle.textContent = `发布批次 ${batch.id}`;
    previewBack.textContent = "关闭";
    previewCopy.hidden = true;
    previewConfirm.hidden = true;
    previewMeta.innerHTML = `
      <span>${formatLocalTime(batch.createdAt)}</span>
      <span>${batch.channelCount} 个渠道</span>
      <span>${escapeHtml(batch.strategy)}</span>
    `;
    const channelNames = (batch.channelIds || [])
      .map(
        (channelId) =>
          productState.channels.find((channel) => channel.id === channelId)
            ?.platform || channelId
      )
      .join("、");
    previewContent.innerHTML = `
      <div class="preview-decision-grid">
        <div><span>成功</span><strong>${batch.successCount}</strong></div>
        <div><span>待确认</span><strong>${batch.pendingCount}</strong></div>
        <div><span>失败</span><strong>${batch.failedCount}</strong></div>
        <div><span>批次状态</span><strong>${batch.status}</strong></div>
      </div>
      <h3>${escapeHtml(batch.articleTitle)}</h3>
      <section class="preview-review-block">
        <h4>批次渠道</h4>
        <p>${escapeHtml(channelNames)}</p>
      </section>
      <p>本记录保存在当前浏览器中，可复用渠道选择创建新的发布批次。</p>
    `;
    previewDialog.showModal();
  }

  function replaceChannel(channelId, transition) {
    if (!productState.channels.some((channel) => channel.id === channelId)) {
      return;
    }
    productState = applyChannelTransition(
      productState,
      channelId,
      transition
    );
    renderQueue();
    saveNow();
  }

  function handleChannelAction(channelId) {
    const channel = channels.find((item) => item.id === channelId);
    if (!channel) return;

    if (channel.action === "重新适配") {
      productState = readaptChannelVersion(productState, channel.id);
      renderQueue();
      saveNow();
      showToast(`${channel.platform} 已重新生成版本，请完成发布前确认。`);
      return;
    }

    if (channel.action === "确认") {
      productState = confirmChannelVersion(productState, channel.id);
      renderQueue();
      saveNow();
      showToast(`${channel.platform} 已确认并加入待发布选择。`);
      return;
    }

    if (channel.action === "去授权") {
      replaceChannel(channel.id, "authorize");
      showToast(`${channel.platform} 模拟授权成功，已恢复适配流程。`);
      return;
    }

    if (channel.action === "重试") {
      replaceChannel(channel.id, "retry");
      showToast(`${channel.platform} 已重试成功，草稿等待最终确认。`);
      return;
    }

    openPreview(channel);
  }

  function closePanels() {
    publishQueue.classList.remove("is-open");
    workspaceSidebar.classList.remove("is-open");
    toggleQueue.setAttribute("aria-expanded", "false");
    toggleSidebar.setAttribute("aria-expanded", "false");
    panelScrim.hidden = true;
  }

  queueGroups.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-channel-select]");
    const actionButton = event.target.closest("[data-channel-action]");

    if (selectButton) {
      const channel = productState.channels.find(
        (item) => item.id === selectButton.dataset.channelSelect
      );
      if (!channel) return;
      channel.selected = !channel.selected;
      renderQueue();
      saveNow();
      return;
    }

    if (actionButton) {
      handleChannelAction(actionButton.dataset.channelAction);
    }
  });

  document.querySelector(".queue-filter").addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-filter]");
    if (!filterButton) return;
    activeFilter = filterButton.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((button) =>
        button.classList.toggle("is-active", button === filterButton)
      );
    renderQueue();
  });

  document.querySelector(".queue-density").addEventListener("click", (event) => {
    const densityButton = event.target.closest("[data-queue-density]");
    if (!densityButton) return;
    productState.workspaceSettings.queueDensity =
      densityButton.dataset.queueDensity;
    renderQueue();
    saveNow();
  });

  document
    .querySelector(".editor-preview-button")
    .addEventListener("click", () => openPreview(null));

  previewConfirm.addEventListener("click", () => {
    if (!currentPreviewId) return;
    const channel = channels.find((item) => item.id === currentPreviewId);
    productState = confirmChannelVersion(productState, currentPreviewId);
    renderQueue();
    saveNow();
    showToast(`${channel?.platform || "渠道"} 已确认并加入待发布选择。`);
  });

  previewCopy.addEventListener("click", async () => {
    if (!currentPreviewText) return;
    if (await copyText(currentPreviewText)) {
      showToast("平台文案已复制，可前往目标平台继续发布。");
    } else {
      showToast("浏览器未授予剪贴板权限，请继续编辑后手动复制。");
    }
  });

  publishTime.addEventListener("change", () => {
    productState.workspaceSettings.publishTime = publishTime.value;
    updateSummary();
    saveNow();
  });

  document.querySelector("#publish-strategy").addEventListener("change", (event) => {
    productState.workspaceSettings.publishStrategy = event.target.value;
    saveNow();
  });

  document.querySelector("#post-action").addEventListener("change", (event) => {
    productState.workspaceSettings.postAction = event.target.value;
    saveNow();
  });

  publishButton.addEventListener("click", () => {
    const ready = getReadyChannels(channels);
    if (!ready.length) return;

    publishButton.disabled = true;
    publishButton.firstChild.textContent = "正在创建发布批次… ";
    readyCount.hidden = true;

    window.setTimeout(() => {
      const result = createPublishBatch(productState, {
        schedule: publishTime.value,
        strategy: document.querySelector("#publish-strategy").value,
        postActions: [document.querySelector("#post-action").value],
      });
      productState = result.state;
      readyCount.hidden = false;
      renderQueue();
      renderPublishHistory();
      saveNow();
      showToast(
        `已创建 ${result.batch.taskIds.length} 个渠道的发布批次，结果将自动回写并通知。`
      );
    }, 850);
  });

  toolbarMore.addEventListener("click", () => {
    const isOpen = toolbarMoreMenu.hidden;
    toolbarMoreMenu.hidden = !isOpen;
    toolbarMore.setAttribute("aria-expanded", String(isOpen));
  });

  toolbarMoreMenu.addEventListener("click", (event) => {
    const tool = event.target.closest("[data-editor-tool]");
    if (!tool) return;
    const labels = {
      title: "标题样式",
      bold: "加粗",
      link: "链接",
      list: "列表",
      image: "图片",
      ai: "AI 助手",
      seo: "SEO 摘要",
    };

    toolbarMoreMenu.hidden = true;
    toolbarMore.setAttribute("aria-expanded", "false");
    if (tool.dataset.editorTool === "preview") {
      openPreview(null);
      return;
    }
    showToast(`${labels[tool.dataset.editorTool]}工具已就绪。`);
  });

  editorTitle.addEventListener("input", () => {
    applyArticlePatch({ title: editorTitle.innerText.trim() });
  });

  articleSummary.addEventListener("input", () => {
    applyArticlePatch({ summary: articleSummary.innerText.trim() });
  });

  articleBody.addEventListener("input", () => {
    applyArticlePatch({ bodyHtml: articleBody.innerHTML });
  });

  coverDescription.addEventListener("input", () => {
    applyArticlePatch({
      coverDescription: coverDescription.innerText.trim(),
    });
  });

  tagAddButton.addEventListener("click", addTag);
  tagInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTag();
  });
  articleTags.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-tag]");
    if (!removeButton) return;
    applyArticlePatch({
      tags: productState.article.tags.filter(
        (tag) => tag !== removeButton.dataset.removeTag
      ),
    });
    renderTags();
  });

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-app-view]");
    if (viewButton) {
      switchView(viewButton.dataset.appView);
      closePanels();
    }
  });

  publishHistoryList.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-batch-detail]");
    const reuseButton = event.target.closest("[data-batch-reuse]");
    if (detailButton) {
      openBatchDetail(detailButton.dataset.batchDetail);
      return;
    }
    if (reuseButton) {
      productState = reusePublishBatch(
        productState,
        reuseButton.dataset.batchReuse
      );
      renderQueue();
      switchView("workbench", false);
      saveNow();
      showToast("已复用原批次渠道，可检查后再次发布。");
    }
  });

  resetDemo.addEventListener("click", () => {
    stateStore?.reset();
    productState = createProductState();
    channels = getChannelViews(productState);
    activeFilter = "all";
    hydrateEditor();
    publishTime.value = productState.workspaceSettings.publishTime;
    document.querySelector("#publish-strategy").value =
      productState.workspaceSettings.publishStrategy;
    document.querySelector("#post-action").value =
      productState.workspaceSettings.postAction;
    renderQueue();
    renderPublishHistory();
    switchView("workbench", false);
    saveNow();
    showToast("演示数据已重置。");
  });

  document.addEventListener("click", (event) => {
    if (
      !toolbarMoreMenu.hidden &&
      !event.target.closest(".toolbar-more-wrap")
    ) {
      toolbarMoreMenu.hidden = true;
      toolbarMore.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !toolbarMoreMenu.hidden) {
      toolbarMoreMenu.hidden = true;
      toolbarMore.setAttribute("aria-expanded", "false");
      toolbarMore.focus();
    }
  });

  toggleQueue.addEventListener("click", () => {
    const isOpen = publishQueue.classList.toggle("is-open");
    workspaceSidebar.classList.remove("is-open");
    toggleQueue.setAttribute("aria-expanded", String(isOpen));
    toggleSidebar.setAttribute("aria-expanded", "false");
    panelScrim.hidden = !isOpen;
  });

  toggleSidebar.addEventListener("click", () => {
    const isOpen = workspaceSidebar.classList.toggle("is-open");
    publishQueue.classList.remove("is-open");
    toggleSidebar.setAttribute("aria-expanded", String(isOpen));
    toggleQueue.setAttribute("aria-expanded", "false");
    panelScrim.hidden = !isOpen;
  });

  document.querySelector("#close-queue").addEventListener("click", closePanels);
  panelScrim.addEventListener("click", closePanels);
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) closePanels();
  });

  window.addEventListener("beforeunload", () => {
    window.clearTimeout(saveTimer);
    saveNow();
  });

  publishTime.value =
    productState.workspaceSettings.publishTime || "now";
  document.querySelector("#publish-strategy").value =
    productState.workspaceSettings.publishStrategy;
  document.querySelector("#post-action").value =
    productState.workspaceSettings.postAction;
  hydrateEditor();
  renderQueue();
  renderPublishHistory();
  switchView(
    productState.workspaceSettings.activeView || "workbench",
    false
  );
}
