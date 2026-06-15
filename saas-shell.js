"use strict";

(function exposeSaasShell(globalScope) {
  const entitlements =
    typeof module !== "undefined" && module.exports
      ? require("./entitlements.js")
      : globalScope.OneFlowEntitlements;

  const ROUTES = Object.freeze({
    login: "#/login",
    dashboard: "#/dashboard",
    articles: "#/articles",
    workbench: "#/workbench",
    publishHistory: "#/publish-history",
    channels: "#/channels",
    media: "#/media",
    aiCapabilities: "#/ai-capabilities",
    billing: "#/billing",
    team: "#/team",
    settings: "#/settings",
  });
  const ROUTE_VALUES = new Set(Object.values(ROUTES));

  const AI_CAPABILITIES = Object.freeze([
    {
      id: "title_generation",
      name: "标题生成",
      description: "根据正文结构生成可编辑的主标题候选。",
      inputFields: ["正文", "目标读者", "标题语气"],
      outputFields: ["标题候选", "标题理由"],
      promptTemplate: "从文章核心结论出发，生成清晰、克制且不标题党的标题。",
      requiresHumanConfirmation: true,
      minimumPlan: "free",
    },
    {
      id: "summary_generation",
      name: "摘要生成",
      description: "提炼文章价值、背景和主要结论。",
      inputFields: ["标题", "正文"],
      outputFields: ["文章摘要"],
      promptTemplate: "用一段可独立阅读的文字概括文章，不引入正文外事实。",
      requiresHumanConfirmation: true,
      minimumPlan: "free",
    },
    {
      id: "seo_description",
      name: "SEO 描述",
      description: "生成长度受控的搜索结果描述。",
      inputFields: ["标题", "摘要", "关键词"],
      outputFields: ["SEO Description", "字符数"],
      promptTemplate: "保留主要关键词，在 160 字符内说明文章解决的问题。",
      requiresHumanConfirmation: true,
      minimumPlan: "free",
    },
    {
      id: "platform_style_rewrite",
      name: "平台风格改写",
      description: "按目标平台的内容结构调整标题、开场和段落。",
      inputFields: ["主文章", "目标平台", "平台规则"],
      outputFields: ["平台标题", "平台正文", "改写说明"],
      promptTemplate: "保留事实与观点，只调整信息顺序、语气和平台结构。",
      requiresHumanConfirmation: true,
      minimumPlan: "pro",
    },
    {
      id: "xiaohongshu_copy",
      name: "小红书文案",
      description: "生成图文标题、摘要、话题和封面建议。",
      inputFields: ["文章摘要", "受众", "内容重点"],
      outputFields: ["标题", "正文", "话题", "封面文案"],
      promptTemplate: "转写为高信息密度图文，不制造未经证实的体验或效果。",
      requiresHumanConfirmation: true,
      minimumPlan: "pro",
    },
    {
      id: "douyin_script",
      name: "抖音脚本",
      description: "把文章转为短视频分镜和口播脚本。",
      inputFields: ["文章要点", "视频时长", "表达风格"],
      outputFields: ["开场", "口播脚本", "分镜", "视频描述"],
      promptTemplate: "用可拍摄的镜头和口播组织内容，标记所有需人工核实的说法。",
      requiresHumanConfirmation: true,
      minimumPlan: "pro",
    },
    {
      id: "bilibili_package",
      name: "B站标题简介",
      description: "生成视频标题、简介、章节和封面信息。",
      inputFields: ["文章结构", "视频形式", "目标分区"],
      outputFields: ["标题", "简介", "章节", "封面建议"],
      promptTemplate: "突出内容价值和章节结构，不使用与内容无关的夸张承诺。",
      requiresHumanConfirmation: true,
      minimumPlan: "pro",
    },
    {
      id: "wechat_formatting",
      name: "公众号排版",
      description: "生成适合公众号编辑器的段落与强调结构。",
      inputFields: ["HTML 正文", "排版风格", "品牌规范"],
      outputFields: ["排版 HTML", "图片位建议"],
      promptTemplate: "保持语义标签和可复制性，避免依赖不稳定的内联效果。",
      requiresHumanConfirmation: true,
      minimumPlan: "pro",
    },
    {
      id: "tag_recommendation",
      name: "标签推荐",
      description: "基于文章主题和平台分类推荐标签。",
      inputFields: ["标题", "摘要", "正文关键词"],
      outputFields: ["主题标签", "平台标签"],
      promptTemplate: "只推荐正文可支持的标签，并区分主题词与平台分类。",
      requiresHumanConfirmation: true,
      minimumPlan: "free",
    },
    {
      id: "publish_risk_check",
      name: "发布风险检查",
      description: "检查缺失项、过期版本、敏感链接和平台约束。",
      inputFields: ["平台版本", "授权状态", "发布规则"],
      outputFields: ["阻塞项", "警告项", "检查说明"],
      promptTemplate: "输出可验证的风险项，不把未知平台能力判断为可用。",
      requiresHumanConfirmation: false,
      minimumPlan: "free",
    },
  ]);

  function normalizeHash(hash, sessionMode) {
    if (ROUTE_VALUES.has(hash)) return hash;
    return ["local", "saas_dev"].includes(sessionMode)
      ? ROUTES.dashboard
      : ROUTES.login;
  }

  function createAIPreferences() {
    return Object.fromEntries(
      AI_CAPABILITIES.map((capability) => [
        capability.id,
        {
          enabled: [
            "title_generation",
            "summary_generation",
            "publish_risk_check",
          ].includes(capability.id),
          automatic: capability.id === "publish_risk_check",
        },
      ])
    );
  }

  function createSaasState() {
    return {
      activeRoute: ROUTES.login,
      sessionMode: null,
      cloudAuthStatus: "not_connected",
      currentPlanId: "free",
      usage: {
        articles: 1,
        publishBatches: 0,
        aiAdaptations: 8,
        connectedChannels: 2,
        members: 1,
      },
      aiPreferences: createAIPreferences(),
      lastDecision: null,
      backendStatus: "idle",
      remoteUser: null,
      remoteWorkspace: null,
      remoteArticles: [],
      remoteChannels: [],
      remotePublishBatches: [],
      remoteArticleId: null,
    };
  }

  function enterLocalDevelopment(state) {
    return {
      ...state,
      sessionMode: "local",
      cloudAuthStatus: "not_connected",
      activeRoute: ROUTES.workbench,
    };
  }

  function enterCloudPlaceholder(state) {
    return {
      ...state,
      sessionMode: null,
      cloudAuthStatus: "placeholder",
      activeRoute: ROUTES.login,
    };
  }

  function enterSaasDevelopment(state, payload = {}) {
    return {
      ...state,
      sessionMode: "saas_dev",
      cloudAuthStatus: "dev_session",
      activeRoute: ROUTES.dashboard,
      backendStatus: payload.backendStatus || state.backendStatus,
      remoteUser: payload.user || state.remoteUser,
      remoteWorkspace: payload.workspace || state.remoteWorkspace,
      currentPlanId:
        payload.subscription?.planId || state.currentPlanId || "free",
    };
  }

  function getWorkspaceTask(taskList, channelId) {
    return (taskList || []).find(
      (task) =>
        task.channelId === channelId &&
        !task.batchId &&
        task.scope !== "batch"
    );
  }

  function buildDashboardModel(workspace, saasState) {
    const usage = {
      ...createSaasState().usage,
      ...(saasState?.usage || {}),
      articles: Math.max(1, Number(saasState?.usage?.articles) || 0),
      publishBatches:
        saasState?.sessionMode === "saas_dev"
          ? Number(saasState?.usage?.publishBatches) || 0
          : (workspace.publishBatches || []).length,
    };
    const planId = saasState?.currentPlanId || "free";
    const publishDecision = entitlements.canPublishBatch({ planId, usage });
    const aiDecision = entitlements.canUseAICapability({
      planId,
      usage,
      capabilityId: "title_generation",
    });

    return {
      recentArticle: {
        id: workspace.currentArticle?.id,
        title: workspace.currentArticle?.title,
        updatedAt: workspace.currentArticle?.updatedAt,
        wordCount: workspace.currentArticle?.wordCount || 0,
      },
      awaitingReview: (workspace.channelVersions || []).filter(
        (version) => version.status === "needs_review"
      ).length,
      failedTasks: (workspace.publishTasks || []).filter(
        (task) =>
          !task.batchId &&
          task.scope !== "batch" &&
          task.status === "failed"
      ).length,
      authorizationIssues: (workspace.channels || []).filter((channel) =>
        ["missing", "expired"].includes(
          channel.account?.authorizationStatus
        )
      ).length,
      usage: {
        publishBatches: publishDecision,
        aiAdaptations: aiDecision,
      },
      quickActions: [
        "new_article",
        "import_markdown",
        "configure_channels",
        "publish_history",
      ],
    };
  }

  function connectionStatus(account = {}) {
    if (account.authorizationStatus === "authorized") return "connected";
    if (account.authorizationStatus === "expired") return "reauthorize";
    return "not_connected";
  }

  function buildChannelConnectionViews(workspace, sessionMode) {
    return (workspace.channels || []).map((channel) => {
      const task = getWorkspaceTask(workspace.publishTasks, channel.id);
      return {
        id: channel.id,
        platform: channel.platform,
        type: channel.type,
        mark: channel.mark,
        connectionStatus: connectionStatus(channel.account),
        connectionLabel:
          connectionStatus(channel.account) === "connected"
            ? "已连接"
            : connectionStatus(channel.account) === "reauthorize"
              ? "需要重新授权"
              : "未连接",
        credentialStorage: "服务端加密托管",
        localDebugAvailable: sessionMode === "local",
        action:
          connectionStatus(channel.account) === "reauthorize"
            ? "重新授权"
            : connectionStatus(channel.account) === "connected"
              ? "管理连接"
              : "连接渠道",
        taskStatus: task?.status || "draft",
      };
    });
  }

  function toggleAICapability(state, capabilityId, field, planId) {
    const preference = state.aiPreferences[capabilityId];
    if (!preference || !["enabled", "automatic"].includes(field)) {
      return {
        ...state,
        lastDecision: { allowed: false, reason: "unknown_capability" },
      };
    }
    const decision = entitlements.canUseAICapability({
      planId,
      usage: state.usage,
      capabilityId,
    });
    if (!decision.allowed) {
      return { ...state, lastDecision: decision };
    }
    const nextValue = !preference[field];
    const nextPreference = {
      ...preference,
      [field]: nextValue,
    };
    if (field === "enabled" && nextValue === false) {
      nextPreference.automatic = false;
    }
    if (field === "automatic" && nextValue === true) {
      nextPreference.enabled = true;
    }
    return {
      ...state,
      aiPreferences: {
        ...state.aiPreferences,
        [capabilityId]: nextPreference,
      },
      lastDecision: decision,
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDate(value) {
    if (!value) return "尚未保存";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  function planContext(state, extra = {}) {
    return {
      planId: state.currentPlanId,
      usage: state.usage,
      ...extra,
    };
  }

  function pageHeader(eyebrow, title, description, actions = "") {
    return `
      <header class="saas-page-header">
        <div>
          <span class="eyebrow">${escapeHtml(eyebrow)}</span>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
        ${actions}
      </header>
    `;
  }

  function quotaTemplate(label, decision, used) {
    const limitLabel = decision.limit === null ? "不限" : decision.limit;
    const ratio =
      decision.limit === null || decision.limit === 0
        ? 0
        : Math.min(100, Math.round((used / decision.limit) * 100));
    return `
      <article class="quota-card">
        <div><span>${escapeHtml(label)}</span><strong>${used} / ${limitLabel}</strong></div>
        <div class="quota-track" aria-label="${escapeHtml(label)}使用 ${ratio}%">
          <span style="width:${ratio}%"></span>
        </div>
        <small>${decision.allowed ? "当前额度可用" : "已达到当前套餐上限"}</small>
      </article>
    `;
  }

  function renderDashboard(container, workspace, state) {
    const model = buildDashboardModel(workspace, state);
    const publishUsed = state.usage.publishBatches;
    const aiUsed = state.usage.aiAdaptations;
    container.innerHTML = `
      <div class="saas-page dashboard-page">
        ${pageHeader(
          "Creator Task Center",
          "今天从哪一项内容任务开始？",
          "这里聚合需要创作者判断的工作，不用图表掩盖真正的发布阻塞。",
          '<a class="primary-button" href="#/workbench" data-route-link>继续写作</a>'
        )}
        <section class="quick-actions" aria-label="快速操作">
          <button type="button" data-shell-action="new-article"><strong>写新文章</strong><span>创建本地草稿并进入工作台</span></button>
          <button type="button" data-shell-action="import-markdown"><strong>导入 Markdown</strong><span>从本地内容开始适配</span></button>
          <a href="#/channels" data-route-link><strong>配置渠道</strong><span>检查服务端连接状态</span></a>
          <a href="#/publish-history" data-route-link><strong>查看发布记录</strong><span>追踪批次快照和失败任务</span></a>
        </section>
        <div class="dashboard-grid">
          <article class="task-card task-card-featured">
            <span class="task-kicker">最近编辑</span>
            <h2>${escapeHtml(model.recentArticle.title)}</h2>
            <p>${Number(model.recentArticle.wordCount).toLocaleString("zh-CN")} 字 · ${formatDate(model.recentArticle.updatedAt)}</p>
            <a href="#/workbench" data-route-link>打开文章</a>
          </article>
          <article class="task-card">
            <span class="task-kicker">人工确认</span>
            <strong>${model.awaitingReview}</strong>
            <h2>个平台版本待确认</h2>
            <p>确认标题、摘要与平台规则后才能进入发布批次。</p>
            <a href="#/workbench" data-route-link>检查发布队列</a>
          </article>
          <article class="task-card ${model.failedTasks ? "is-danger" : ""}">
            <span class="task-kicker">发布异常</span>
            <strong>${model.failedTasks}</strong>
            <h2>个任务发布失败</h2>
            <p>失败上下文已保留，可在发布记录中检查并重试。</p>
            <a href="#/publish-history" data-route-link>查看失败任务</a>
          </article>
          <article class="task-card ${model.authorizationIssues ? "is-warning" : ""}">
            <span class="task-kicker">渠道连接</span>
            <strong>${model.authorizationIssues}</strong>
            <h2>个渠道授权异常</h2>
            <p>正式 SaaS 凭据由服务端加密保存，浏览器不长期持有。</p>
            <a href="#/channels" data-route-link>处理渠道连接</a>
          </article>
        </div>
        <section class="usage-section">
          <div class="section-heading">
            <div><span class="eyebrow">Monthly Usage</span><h2>本月额度</h2></div>
            <a href="#/billing" data-route-link>查看套餐</a>
          </div>
          <div class="quota-grid">
            ${quotaTemplate("发布批次", model.usage.publishBatches, publishUsed)}
            ${quotaTemplate("AI 适配", model.usage.aiAdaptations, aiUsed)}
          </div>
        </section>
      </div>
    `;
  }

  function renderChannels(container, workspace, state) {
    const channels =
      state.sessionMode === "saas_dev"
        ? state.remoteChannels.map((channel) => ({
            id: channel.id,
            platform: channel.displayName,
            type:
              channel.channelType === "short_video"
                ? "短视频"
                : channel.channelType === "image_text"
                  ? "图文"
                  : "文章",
            mark: String(channel.displayName || "C").slice(0, 1),
            connectionStatus:
              channel.connectionStatus === "connected"
                ? "connected"
                : channel.connectionStatus === "invalid"
                  ? "reauthorize"
                  : "not_connected",
            connectionLabel:
              channel.connectionStatus === "connected"
                ? "已连接"
                : channel.connectionStatus === "invalid"
                  ? "需要重新授权"
                  : "未连接",
            credentialStorage: "服务端加密托管",
            localDebugAvailable: false,
            action:
              channel.connectionStatus === "connected"
                ? "管理连接"
                : "连接渠道",
          }))
        : buildChannelConnectionViews(workspace, state.sessionMode);
    container.innerHTML = `
      <div class="saas-page">
        ${pageHeader(
          "Channel Connections",
          "渠道设置",
          "正式环境由服务端托管并加密平台凭据；浏览器只看到连接状态。",
          '<button class="primary-button" type="button" data-shell-action="connect-channel">连接渠道</button>'
        )}
        <aside class="security-boundary">
          <strong>凭据安全边界</strong>
          <p>平台密钥不会进入工作区导出、截图、日志或测试快照。本地开发仅允许临时调试，不是 SaaS 正式发布链路。</p>
        </aside>
        <div class="channel-settings-list">
          ${channels
            .map(
              (channel) => `
                <article class="channel-setting-row" data-connection-status="${channel.connectionStatus}">
                  <span class="channel-mark" aria-hidden="true">${escapeHtml(channel.mark)}</span>
                  <div>
                    <strong>${escapeHtml(channel.platform)}</strong>
                    <small>${escapeHtml(channel.type)} · ${channel.credentialStorage}</small>
                  </div>
                  <span class="connection-chip">${channel.connectionLabel}</span>
                  <span class="local-debug-note">${channel.localDebugAvailable ? "本地模式可临时调试" : "仅服务端连接"}</span>
                  <button type="button" data-channel-connect="${channel.id}">${channel.action}</button>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderMedia(container, workspace, state) {
    const imageDecision = entitlements.canUseImageHost(planContext(state));
    const cover = workspace.currentArticle?.cover || {};
    container.innerHTML = `
      <div class="saas-page">
        ${pageHeader(
          "Media Library",
          "图床 / 素材库",
          "统一管理文章封面、平台裁剪与未来对象存储资产。",
          `<button class="primary-button" type="button" data-shell-action="media-upload" ${imageDecision.allowed ? "" : "disabled"}>上传素材</button>`
        )}
        <div class="media-layout">
          <article class="media-preview-card">
            <img src="${escapeHtml(cover.url || "assets/article-cover.png")}" alt="${escapeHtml(cover.alt || "当前文章封面")}" />
            <div>
              <span class="status-chip">当前文章封面</span>
              <h2>${escapeHtml(cover.description || "尚未填写封面说明")}</h2>
              <p>${escapeHtml(cover.alt || "尚未填写替代文本")}</p>
            </div>
          </article>
          <section class="crop-list">
            <span class="eyebrow">Platform Crops</span>
            <h2>平台裁剪基础</h2>
            ${(cover.platformCrops || [])
              .map(
                (crop) => `
                  <article>
                    <strong>${escapeHtml(crop.ratio)}</strong>
                    <span>${escapeHtml(crop.platformId)}</span>
                    <p>${escapeHtml(crop.cropHint)}</p>
                  </article>
                `
              )
              .join("")}
          </section>
        </div>
        <aside class="plan-callout ${imageDecision.allowed ? "" : "is-locked"}">
          <strong>${imageDecision.allowed ? "高级图床已包含在当前套餐" : "高级图床需要 Pro 或 Studio"}</strong>
          <p>Phase 3S 仅展示产品边界，尚未连接对象存储、图片处理或 CDN。</p>
          <a href="#/billing" data-route-link>查看套餐能力</a>
        </aside>
      </div>
    `;
  }

  function renderAICapabilities(container, state) {
    container.innerHTML = `
      <div class="saas-page">
        ${pageHeader(
          "AI Capability Center",
          "AI 能力中心",
          "每项能力都有输入、输出、Prompt、执行策略和套餐边界。",
          '<a class="secondary-button" href="#/billing" data-route-link>查看 AI 额度</a>'
        )}
        <div class="ai-capability-list">
          ${AI_CAPABILITIES.map((capability) => {
            const preference = state.aiPreferences[capability.id];
            const decision = entitlements.canUseAICapability(
              planContext(state, { capabilityId: capability.id })
            );
            return `
              <article class="ai-capability-card ${decision.allowed ? "" : "is-locked"}">
                <header>
                  <div>
                    <span class="plan-chip">${capability.minimumPlan === "free" ? "Free" : "Pro+"}</span>
                    <h2>${capability.name}</h2>
                    <p>${capability.description}</p>
                  </div>
                  <button class="toggle-control ${preference.enabled ? "is-on" : ""}" type="button"
                    data-ai-toggle="${capability.id}" data-ai-field="enabled"
                    aria-pressed="${preference.enabled}" ${decision.allowed ? "" : "disabled"}>
                    ${preference.enabled ? "已启用" : "已停用"}
                  </button>
                </header>
                <div class="ai-contract-grid">
                  <div><span>输入</span><p>${capability.inputFields.map(escapeHtml).join(" · ")}</p></div>
                  <div><span>输出</span><p>${capability.outputFields.map(escapeHtml).join(" · ")}</p></div>
                </div>
                <div class="prompt-template">
                  <span>Prompt 模板</span>
                  <p>${capability.promptTemplate}</p>
                </div>
                <footer>
                  <span>${capability.requiresHumanConfirmation ? "需要人工确认" : "可作为发布前自动检查"}</span>
                  <button type="button" data-ai-toggle="${capability.id}" data-ai-field="automatic"
                    ${decision.allowed && preference.enabled ? "" : "disabled"}>
                    ${preference.automatic ? "自动执行：开" : "自动执行：关"}
                  </button>
                </footer>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function usageValue(state, key) {
    return Math.max(0, Number(state.usage[key]) || 0);
  }

  function renderBilling(container, state) {
    const currentPlan = entitlements.PLANS[state.currentPlanId];
    const featureLabels = [
      ["文章数量", "articles"],
      ["发布批次 / 月", "publishBatches"],
      ["AI 适配 / 月", "aiAdaptations"],
      ["连接渠道", "connectedChannels"],
      ["团队成员", "teamMembers"],
    ];
    container.innerHTML = `
      <div class="saas-page">
        ${pageHeader(
          "Plans & Billing",
          "账单 / 套餐",
          "套餐决定额度和产品能力；当前页面不连接真实支付。",
          '<button class="primary-button" type="button" data-shell-action="billing-upgrade">升级套餐</button>'
        )}
        <section class="current-plan-card">
          <div><span class="eyebrow">Current Plan</span><h2>${currentPlan.name}</h2><p>${currentPlan.description}</p></div>
          <span class="plan-status">本地产品预览</span>
        </section>
        <section class="billing-usage-grid">
          ${quotaTemplate("文章", entitlements.canCreateArticle(planContext(state)), usageValue(state, "articles"))}
          ${quotaTemplate("发布批次", entitlements.canPublishBatch(planContext(state)), usageValue(state, "publishBatches"))}
          ${quotaTemplate("AI 适配", entitlements.canUseAICapability(planContext(state, { capabilityId: "title_generation" })), usageValue(state, "aiAdaptations"))}
          ${quotaTemplate("渠道连接", entitlements.canConnectChannel(planContext(state)), usageValue(state, "connectedChannels"))}
        </section>
        <section class="pricing-grid" aria-label="套餐对比">
          ${entitlements.PLAN_IDS.map((planId) => {
            const plan = entitlements.PLANS[planId];
            return `
              <article class="pricing-card ${planId === state.currentPlanId ? "is-current" : ""}">
                <span>${planId === state.currentPlanId ? "当前计划" : "可升级"}</span>
                <h2>${plan.name}</h2>
                <p>${plan.description}</p>
                <dl>
                  ${featureLabels.map(([label, key]) => `<div><dt>${label}</dt><dd>${plan.limits[key] === null ? "不限" : plan.limits[key]}</dd></div>`).join("")}
                  <div><dt>高级图床</dt><dd>${plan.features.imageHost ? "支持" : "不支持"}</dd></div>
                  <div><dt>数据回流</dt><dd>${plan.features.dataFeedback ? "支持" : "不支持"}</dd></div>
                  <div><dt>定时发布</dt><dd>${plan.features.scheduledPublishing ? "支持" : "不支持"}</dd></div>
                  <div><dt>批量发布</dt><dd>${plan.features.batchPublishing === "limited" ? "单渠道批次" : "支持"}</dd></div>
                </dl>
                <button type="button" data-plan-select="${planId}" ${planId === state.currentPlanId ? "disabled" : ""}>
                  ${planId === state.currentPlanId ? "正在使用" : "选择 " + plan.name}
                </button>
              </article>
            `;
          }).join("")}
        </section>
      </div>
    `;
  }

  function renderTeam(container, state) {
    const inviteDecision = entitlements.canInviteMember(planContext(state));
    container.innerHTML = `
      <div class="saas-page">
        ${pageHeader(
          "Workspace Members",
          "团队 / 成员",
          "成员、角色与工作区权限将在 SaaS 后端统一校验。",
          `<button class="primary-button" type="button" data-shell-action="invite-member" ${inviteDecision.allowed ? "" : "disabled"}>邀请成员</button>`
        )}
        <div class="member-list">
          <article>
            <span class="member-avatar">林</span>
            <div><strong>本地工作区所有者</strong><small>Owner · 当前浏览器</small></div>
            <span class="status-chip">当前成员</span>
          </article>
        </div>
        <aside class="plan-callout ${inviteDecision.allowed ? "" : "is-locked"}">
          <strong>${inviteDecision.allowed ? "当前套餐可邀请成员" : "团队协作需要 Studio / Team"}</strong>
          <p>正式环境中的邀请、角色和权限变更必须由后端验证 WorkspaceMember 与 Role。</p>
          <a href="#/billing" data-route-link>查看团队套餐</a>
        </aside>
      </div>
    `;
  }

  function renderSettings(container, state) {
    const modeLabel =
      state.sessionMode === "saas_dev"
        ? "SaaS Dev Mode"
        : state.sessionMode === "local"
          ? "本地演示模式"
          : "SaaS 云端占位";
    container.innerHTML = `
      <div class="saas-page">
        ${pageHeader(
          "Workspace Settings",
          "设置",
          "管理本地工作区、数据边界与未来 SaaS 连接方式。"
        )}
        <div class="settings-grid">
          <section>
            <span class="eyebrow">Workspace</span>
            <h2>技术内容引擎</h2>
            <p>当前运行模式：${modeLabel}</p>
            <label>工作区名称<input type="text" value="技术内容引擎" aria-label="工作区名称" /></label>
            <button type="button" data-shell-action="save-settings">保存设置</button>
          </section>
          <section>
            <span class="eyebrow">Local Data</span>
            <h2>导入与导出</h2>
            <p>工作区 JSON 不包含长期平台凭据。导入前仍需检查来源与数据内容。</p>
            <div class="settings-actions">
              <button type="button" data-shell-action="export-workspace">导出工作区</button>
              <button type="button" data-shell-action="import-workspace">导入工作区</button>
              <button type="button" data-shell-action="reset-workspace">重置演示数据</button>
            </div>
          </section>
          <section>
            <span class="eyebrow">Security</span>
            <h2>发布安全边界</h2>
            <p>正式 SaaS 中平台凭据由后端加密保存，发布任务由 Worker 执行，浏览器不直接依赖第三方 CORS。</p>
            <a href="#/channels" data-route-link>查看渠道连接</a>
          </section>
          <section>
            <span class="eyebrow">Session</span>
            <h2>切换入口</h2>
            <p>退出本地开发模式不会删除浏览器中的工作区数据。</p>
            <button type="button" data-shell-action="exit-local">返回登录入口</button>
          </section>
        </div>
      </div>
    `;
  }

  function initializeSaasShell(api) {
    const SESSION_KEY = "oneflow.session.mode";
    const PREFERENCES_KEY = "oneflow.saas.preferences.v1";
    const app = globalScope.OneFlowApp;
    const apiClient = globalScope.OneFlowApiClient;
    if (!app) return;

    const refs = {
      topShell: document.querySelector(".top-shell"),
      productMenu: document.querySelector("#product-menu"),
      productMenuToggle: document.querySelector("#toggle-product-menu"),
      login: document.querySelector("#login-view"),
      cloudPlaceholder: document.querySelector("#cloud-auth-placeholder"),
      saasDevStatus: document.querySelector("#saas-dev-status"),
      saasDevButton: document.querySelector("#enter-saas-dev-mode"),
      workbench: document.querySelector("#workbench-view"),
      agentRail: document.querySelector("#agent-rail"),
      publishDock: document.querySelector("#publish-dock"),
      history: document.querySelector("#publish-history-view"),
      articles: document.querySelector("#content-library-view"),
      shellToast: document.querySelector("#shell-toast"),
      profileButton: document.querySelector(".profile-button"),
      apiConnectionStatus: document.querySelector("#api-connection-status"),
    };
    let state = createSaasState();
    let toastTimer = null;
    let remoteSaveTimer = null;
    let remoteSaveInFlight = false;
    const storedMode = globalScope.sessionStorage.getItem(SESSION_KEY);
    if (storedMode === "local") {
      state = enterLocalDevelopment(state);
    } else if (storedMode === "saas_dev") {
      state = enterSaasDevelopment(state, { backendStatus: "connecting" });
    }
    try {
      const preferences = JSON.parse(
        globalScope.localStorage.getItem(PREFERENCES_KEY) || "null"
      );
      if (preferences && typeof preferences === "object") {
        state.aiPreferences = {
          ...state.aiPreferences,
          ...preferences,
        };
      }
    } catch {
      globalScope.localStorage.removeItem(PREFERENCES_KEY);
    }

    function showShellToast(message) {
      refs.shellToast.textContent = message;
      refs.shellToast.classList.add("is-visible");
      globalScope.clearTimeout(toastTimer);
      toastTimer = globalScope.setTimeout(
        () => refs.shellToast.classList.remove("is-visible"),
        2800
      );
    }

    function setSaasDevStatus(message, status = "loading") {
      refs.saasDevStatus.hidden = !message;
      refs.saasDevStatus.textContent = message || "";
      refs.saasDevStatus.dataset.state = status;
    }

    function updateProfileMode() {
      const strong = refs.profileButton?.querySelector("strong");
      const small = refs.profileButton?.querySelector("small");
      if (!strong || !small) return;
      if (state.sessionMode === "saas_dev") {
        strong.textContent =
          state.remoteWorkspace?.name || "OneFlow SaaS Dev";
        small.textContent = `${state.currentPlanId.toUpperCase()} · API 模式`;
        refs.profileButton.setAttribute("aria-label", "当前模式：SaaS Dev");
      } else {
        strong.textContent = "本地工作区";
        small.textContent = "Free · 演示模式";
        refs.profileButton.setAttribute("aria-label", "当前模式：本地演示");
      }
    }

    function updateApiConnectionStatus(status = state.backendStatus) {
      if (!refs.apiConnectionStatus) return;
      const labels = {
        idle: "本地演示",
        connecting: "API 连接中",
        connected: "API 已连接",
        unavailable: "API 不可用",
      };
      const effectiveStatus =
        state.sessionMode === "saas_dev" ? status : "idle";
      refs.apiConnectionStatus.dataset.state = effectiveStatus;
      refs.apiConnectionStatus.textContent =
        labels[effectiveStatus] || labels.idle;
    }

    function usageFromApi(usage) {
      return {
        articles: Number(usage?.articles?.used) || 0,
        publishBatches: Number(usage?.publishBatches?.used) || 0,
        aiAdaptations: Number(usage?.aiAdaptations?.used) || 0,
        connectedChannels: Number(usage?.connectedChannels?.used) || 0,
        members: Number(usage?.members?.used) || 0,
      };
    }

    async function ensureSaasChannel() {
      if (!state.remoteChannels.length) {
        const channel = await apiClient.saveChannel({
          platformId: "mock-blog",
          displayName: "SaaS Dev Mock Blog",
          channelType: "article",
          configuration: { publishMode: "create_draft" },
          mockBehavior: "success",
        });
        state.remoteChannels = [channel];
      }
    }

    async function ensureSaasSeedData() {
      if (!state.remoteArticles.length) {
        const article = await apiClient.saveArticle(
          app.getState().currentArticle
        );
        state.remoteArticles = [article];
        state.remoteArticleId = article.id;
      } else {
        state.remoteArticleId = state.remoteArticles[0].id;
      }
      await ensureSaasChannel();
    }

    async function loadSaasWorkspace(sessionContext = null) {
      if (!apiClient) {
        throw new Error("后端 API Client 未加载，可切换到本地演示模式。");
      }
      const auth = sessionContext || (await apiClient.getCurrentUser());
      const [usage, articles, channels, batches] = await Promise.all([
        apiClient.getUsage(),
        apiClient.listArticles(),
        apiClient.listChannels(),
        apiClient.listPublishBatches(),
      ]);
      state = enterSaasDevelopment(state, {
        ...auth,
        backendStatus: "connected",
      });
      state.usage = usageFromApi(usage);
      state.remoteArticles = articles;
      state.remoteChannels = channels;
      state.remotePublishBatches = batches;
      await ensureSaasSeedData();
      state.usage.articles = state.remoteArticles.length;
      updateProfileMode();
      updateApiConnectionStatus("connected");
      return state;
    }

    async function startSaasDevelopment() {
      refs.saasDevButton.disabled = true;
      setSaasDevStatus("正在连接本地 API 与 SQLite 工作区…");
      try {
        const session = await apiClient.startDevSession("browser-default");
        await loadSaasWorkspace(session);
        globalScope.sessionStorage.setItem(SESSION_KEY, "saas_dev");
        globalScope.location.hash = ROUTES.dashboard;
        setSaasDevStatus("");
        renderRoute();
      } catch (error) {
        state = createSaasState();
        globalScope.sessionStorage.removeItem(SESSION_KEY);
        updateApiConnectionStatus("unavailable");
        setSaasDevStatus(
          error.message || "后端服务未启动，可切换到本地开发模式。",
          "error"
        );
      } finally {
        refs.saasDevButton.disabled = false;
      }
    }

    async function restoreSaasDevelopment() {
      try {
        await loadSaasWorkspace();
        renderRoute();
      } catch {
        try {
          const session = await apiClient.startDevSession("browser-default");
          await loadSaasWorkspace(session);
          renderRoute();
        } catch (error) {
          state = createSaasState();
          globalScope.sessionStorage.removeItem(SESSION_KEY);
          globalScope.location.hash = ROUTES.login;
          updateApiConnectionStatus("unavailable");
          setSaasDevStatus(
            error.message || "后端服务未启动，可切换到本地开发模式。",
            "error"
          );
          renderRoute();
        }
      }
    }

    function renderRemoteArticles() {
      if (state.sessionMode !== "saas_dev") return;
      const list = document.querySelector("#content-library-list");
      if (!list) return;
      list.innerHTML = state.remoteArticles.length
        ? state.remoteArticles
            .map((article) => {
              const wordCount = String(article.contentHtml || "")
                .replace(/<[^>]+>/g, "")
                .trim().length;
              return `
                <article class="library-row" data-remote-article-id="${escapeHtml(article.id)}">
                  <div>
                    <span class="status-chip">SaaS · ${escapeHtml(article.status)}</span>
                    <strong>${escapeHtml(article.title)}</strong>
                    <small>服务端更新 ${formatDate(article.updatedAt)}</small>
                  </div>
                  <span>${wordCount.toLocaleString("zh-CN")} 字</span>
                  <span>${state.remotePublishBatches.filter((batch) => batch.articleId === article.id).length} 个发布批次</span>
                  <div class="history-actions">
                    <button type="button" data-shell-action="open-remote-article">打开工作台</button>
                  </div>
                </article>
              `;
            })
            .join("")
        : '<div class="empty-state">后端工作区暂无文章。</div>';
    }

    function renderRemotePublishHistory() {
      if (state.sessionMode !== "saas_dev") return;
      const list = document.querySelector("#publish-history-list");
      if (!list) return;
      list.innerHTML = state.remotePublishBatches.length
        ? state.remotePublishBatches
            .map((batch) => {
              const tasks = batch.tasks || [];
              const success = tasks.filter((task) =>
                ["draft_created", "published"].includes(task.status)
              ).length;
              const failed = tasks.filter(
                (task) => task.status === "failed"
              ).length;
              return `
                <article class="history-row">
                  <time>${formatDate(batch.createdAt)}</time>
                  <div class="history-article">
                    <strong>${escapeHtml(batch.articleSnapshot?.title || "文章快照")}</strong>
                    <span>${tasks.length} 个渠道 · SaaS Worker</span>
                  </div>
                  <div class="history-results">
                    <span class="is-success">${success} 成功</span>
                    <span class="${failed ? "is-danger" : ""}">${failed} 失败</span>
                  </div>
                  <span class="history-strategy">${escapeHtml(batch.strategy)}</span>
                </article>
              `;
            })
            .join("")
        : '<div class="empty-state">后端尚未创建发布批次。</div>';
    }

    function hideLegacyViews() {
      refs.workbench.hidden = true;
      refs.agentRail.hidden = true;
      refs.publishDock.hidden = true;
      refs.history.hidden = true;
      refs.articles.hidden = true;
    }

    function hideSaasViews() {
      document
        .querySelectorAll("[data-saas-view]")
        .forEach((view) => (view.hidden = true));
    }

    function renderCustomRoute(route) {
      const workspace = app.getState();
      const routeContainer = document.querySelector(
        `[data-saas-view][data-route="${route}"]`
      );
      if (!routeContainer) return;
      routeContainer.hidden = false;
      if (route === ROUTES.dashboard) {
        renderDashboard(routeContainer, workspace, state);
      } else if (route === ROUTES.channels) {
        renderChannels(routeContainer, workspace, state);
      } else if (route === ROUTES.media) {
        renderMedia(routeContainer, workspace, state);
      } else if (route === ROUTES.aiCapabilities) {
        renderAICapabilities(routeContainer, state);
      } else if (route === ROUTES.billing) {
        renderBilling(routeContainer, state);
      } else if (route === ROUTES.team) {
        renderTeam(routeContainer, state);
      } else if (route === ROUTES.settings) {
        renderSettings(routeContainer, state);
      }
    }

    function updateNavigation(route) {
      document.querySelectorAll("[data-route-link]").forEach((link) => {
        const active = link.getAttribute("href") === route;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }

    function renderRoute() {
      let route = normalizeHash(globalScope.location.hash, state.sessionMode);
      if (
        route !== ROUTES.login &&
        !["local", "saas_dev"].includes(state.sessionMode)
      ) {
        route = ROUTES.login;
      }
      if (globalScope.location.hash !== route) {
        globalScope.history.replaceState(null, "", route);
      }
      state.activeRoute = route;
      document.body.dataset.saasRoute = route.slice(2);
      hideSaasViews();
      refs.productMenu.hidden = true;
      refs.productMenuToggle.setAttribute("aria-expanded", "false");

      if (route === ROUTES.login) {
        hideLegacyViews();
        refs.topShell.hidden = true;
        refs.login.hidden = false;
        refs.cloudPlaceholder.hidden =
          state.cloudAuthStatus !== "placeholder";
      } else {
        refs.topShell.hidden = false;
        updateProfileMode();
        updateApiConnectionStatus();
        if (route === ROUTES.workbench) {
          app.openLegacyView("workbench");
        } else if (route === ROUTES.articles) {
          app.openLegacyView("library");
          renderRemoteArticles();
        } else if (route === ROUTES.publishHistory) {
          app.openLegacyView("history");
          renderRemotePublishHistory();
        } else {
          hideLegacyViews();
          renderCustomRoute(route);
        }
      }
      updateNavigation(route);
    }

    function persistAIPreferences() {
      globalScope.localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify(state.aiPreferences)
      );
    }

    document.addEventListener("click", (event) => {
      const routeLink = event.target.closest("[data-route-link]");
      if (routeLink) refs.productMenu.hidden = true;

      const aiToggle = event.target.closest("[data-ai-toggle]");
      if (aiToggle) {
        state = toggleAICapability(
          state,
          aiToggle.dataset.aiToggle,
          aiToggle.dataset.aiField,
          state.currentPlanId
        );
        if (!state.lastDecision?.allowed) {
          showShellToast("当前套餐无法启用这项能力，请先升级套餐。");
        } else {
          persistAIPreferences();
        }
        renderRoute();
        return;
      }

      const channelAction = event.target.closest("[data-channel-connect]");
      if (channelAction) {
        showShellToast("正式连接将跳转服务端授权流程，本地版本不保存长期凭据。");
        return;
      }

      const planAction = event.target.closest("[data-plan-select]");
      if (planAction) {
        showShellToast("支付与套餐变更尚未接入，当前不会创建订单。");
        return;
      }

      const action = event.target.closest("[data-shell-action]")?.dataset
        .shellAction;
      if (!action) return;
      if (action === "new-article") {
        if (state.sessionMode === "saas_dev") {
          state.remoteArticleId = null;
        }
        app.createNewArticle();
        globalScope.location.hash = ROUTES.workbench;
      } else if (action === "open-remote-article") {
        globalScope.location.hash = ROUTES.workbench;
      } else if (action === "import-markdown") {
        app.openImport();
      } else if (action === "connect-channel") {
        showShellToast("渠道授权将由后端连接服务处理，当前为产品占位。");
      } else if (action === "media-upload") {
        showShellToast("对象存储尚未接入，当前不会上传文件。");
      } else if (action === "billing-upgrade") {
        showShellToast("Checkout 尚未接入，当前不会产生扣费。");
      } else if (action === "invite-member") {
        showShellToast("成员邀请需要 Studio / Team 和后端权限服务。");
      } else if (action === "save-settings") {
        showShellToast("本地设置已保留；云端同步尚未接入。");
      } else if (action === "export-workspace") {
        document.querySelector("#export-workspace")?.click();
      } else if (action === "import-workspace") {
        app.openImport();
      } else if (action === "reset-workspace") {
        document.querySelector("#reset-demo")?.click();
      } else if (action === "exit-local") {
        globalScope.sessionStorage.removeItem(SESSION_KEY);
        if (state.sessionMode === "saas_dev") {
          apiClient?.logout().catch(() => {});
        }
        state = createSaasState();
        updateApiConnectionStatus("idle");
        globalScope.location.hash = ROUTES.login;
        renderRoute();
      }
    });

    document
      .querySelector("#enter-local-mode")
      .addEventListener("click", () => {
        state = enterLocalDevelopment(state);
        globalScope.sessionStorage.setItem(SESSION_KEY, "local");
        globalScope.location.hash = ROUTES.workbench;
        renderRoute();
      });

    refs.saasDevButton.addEventListener("click", startSaasDevelopment);
    apiClient?.subscribeConnection((connection) => {
      if (state.sessionMode !== "saas_dev") return;
      state.backendStatus = connection.status;
      updateApiConnectionStatus(connection.status);
      if (connection.status === "unavailable" && connection.error) {
        showShellToast(connection.error);
      }
    });

    document
      .querySelector("#show-cloud-placeholder")
      .addEventListener("click", () => {
        state = enterCloudPlaceholder(state);
        refs.cloudPlaceholder.hidden = false;
      });

    refs.productMenuToggle.addEventListener("click", () => {
      const willOpen = refs.productMenu.hidden;
      refs.productMenu.hidden = !willOpen;
      refs.productMenuToggle.setAttribute("aria-expanded", String(willOpen));
    });

    document.addEventListener("click", (event) => {
      if (
        !refs.productMenu.hidden &&
        !event.target.closest("#product-menu") &&
        !event.target.closest("#toggle-product-menu")
      ) {
        refs.productMenu.hidden = true;
        refs.productMenuToggle.setAttribute("aria-expanded", "false");
      }
    });

    globalScope.addEventListener("hashchange", renderRoute);
    app.subscribe((workspace) => {
      if (
        state.sessionMode === "saas_dev" &&
        state.backendStatus === "connected" &&
        !remoteSaveInFlight
      ) {
        globalScope.clearTimeout(remoteSaveTimer);
        remoteSaveTimer = globalScope.setTimeout(async () => {
          remoteSaveInFlight = true;
          try {
            const article = await apiClient.saveArticle(
              workspace.currentArticle,
              state.remoteArticleId
            );
            state.remoteArticleId = article.id;
            state.remoteArticles = [
              article,
              ...state.remoteArticles.filter(
                (item) => item.id !== article.id
              ),
            ];
            state.usage.articles = state.remoteArticles.length;
          } catch (error) {
            showShellToast(error.message);
          } finally {
            remoteSaveInFlight = false;
          }
        }, 650);
      }
      if (
        ![
          ROUTES.workbench,
          ROUTES.articles,
          ROUTES.publishHistory,
          ROUTES.login,
        ].includes(state.activeRoute)
      ) {
        renderRoute();
      }
    });
    app.subscribePublishBatches?.(async (batch, workspace) => {
      if (
        state.sessionMode !== "saas_dev" ||
        state.backendStatus !== "connected"
      ) {
        return;
      }
      try {
        await ensureSaasChannel();
        const article = await apiClient.saveArticle(
          workspace.currentArticle,
          state.remoteArticleId
        );
        state.remoteArticleId = article.id;
        state.remoteArticles = [
          article,
          ...state.remoteArticles.filter((item) => item.id !== article.id),
        ];
        const remoteBatch = await apiClient.createPublishBatch({
          articleId: article.id,
          channelIds: [state.remoteChannels[0].id],
          strategy: batch.strategy || "automatic_first",
          postActions: batch.postActions || [],
        });
        state.remotePublishBatches = [
          remoteBatch,
          ...state.remotePublishBatches.filter(
            (item) => item.id !== remoteBatch.id
          ),
        ];
        state.usage.publishBatches += 1;
        showShellToast("SaaS Dev 发布批次已交给后端 Mock Worker。");
        if (state.activeRoute === ROUTES.publishHistory) {
          renderRemotePublishHistory();
        }
      } catch (error) {
        showShellToast(error.message);
      }
    });
    renderRoute();
    if (storedMode === "saas_dev") {
      restoreSaasDevelopment();
    }
  }

  const api = {
    AI_CAPABILITIES,
    ROUTES,
    buildChannelConnectionViews,
    buildDashboardModel,
    createSaasState,
    enterCloudPlaceholder,
    enterLocalDevelopment,
    enterSaasDevelopment,
    normalizeHash,
    toggleAICapability,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalScope.OneFlowSaaS = api;
  if (typeof document !== "undefined") {
    initializeSaasShell(api);
  }
})(typeof window !== "undefined" ? window : globalThis);
