const CAPABILITIES = [
  ["title_generation", "标题生成", "free"],
  ["summary_generation", "摘要生成", "free"],
  ["seo_description", "SEO 描述", "free"],
  ["platform_style_rewrite", "平台风格改写", "pro"],
  ["xiaohongshu_copy", "小红书文案", "pro"],
  ["douyin_script", "抖音脚本", "pro"],
  ["bilibili_package", "B站标题简介", "pro"],
  ["wechat_formatting", "公众号排版", "pro"],
  ["tag_recommendation", "标签推荐", "free"],
  ["publish_risk_check", "发布风险检查", "free"],
];

function workspaceSlug(user) {
  const source = user.email?.split("@")[0] || user.name || "workspace";
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${normalized || "workspace"}-${user.id.slice(-8)}`;
}

export async function createWorkspaceForUser(prisma, user, options = {}) {
  return prisma.workspace.create({
    data: {
      name: options.name || `${user.name}的工作区`,
      slug: options.slug || workspaceSlug(user),
      ownerId: user.id,
      plan: options.plan || "free",
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
      subscription: {
        create: {
          planId: options.plan || "free",
          status: "active",
        },
      },
      aiCapabilities: {
        create: CAPABILITIES.map(([capabilityId, name, minimumPlan]) => ({
          capabilityId,
          name,
          minimumPlan,
          enabled: minimumPlan === "free",
          humanConfirmation: true,
        })),
      },
    },
    include: { subscription: true },
  });
}

export { CAPABILITIES };
