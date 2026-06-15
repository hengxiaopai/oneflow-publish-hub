import { createHash, randomBytes } from "node:crypto";

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

function profileSlug(profileKey) {
  return createHash("sha256").update(profileKey).digest("hex").slice(0, 12);
}

export function createSessionService(prisma) {
  const sessions = new Map();

  async function ensureProfile(profileKey = "default") {
    const normalizedKey = String(profileKey || "default").trim().slice(0, 80);
    let user = await prisma.user.findUnique({
      where: { devProfileKey: normalizedKey },
      include: {
        memberships: {
          include: {
            workspace: {
              include: { subscription: true },
            },
          },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          devProfileKey: normalizedKey,
          displayName: "本地开发者",
        },
        include: { memberships: true },
      });
    }

    let membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: {
        workspace: {
          include: { subscription: true },
        },
      },
    });

    if (!membership) {
      const suffix = profileSlug(normalizedKey);
      const workspace = await prisma.workspace.create({
        data: {
          name: "OneFlow 本地工作区",
          slug: `local-${suffix}`,
          members: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
          subscription: {
            create: {
              planId: "free",
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
      membership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id, workspaceId: workspace.id },
        include: {
          workspace: {
            include: { subscription: true },
          },
        },
      });
    }

    return {
      user,
      membership,
      workspace: membership.workspace,
      subscription: membership.workspace.subscription,
    };
  }

  async function start(profileKey) {
    const context = await ensureProfile(profileKey);
    const token = randomBytes(32).toString("base64url");
    sessions.set(token, {
      userId: context.user.id,
      workspaceId: context.workspace.id,
      role: context.membership.role,
      createdAt: Date.now(),
    });
    return { token, ...context };
  }

  function get(token) {
    return token ? sessions.get(token) || null : null;
  }

  function destroy(token) {
    if (token) sessions.delete(token);
  }

  function clear() {
    sessions.clear();
  }

  return { start, get, destroy, clear };
}
