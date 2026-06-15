import { pathToFileURL } from "node:url";
import { createPrismaClient } from "../src/db.js";
import { hashPassword } from "../src/services/passwordService.js";

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

const CHANNELS = [
  {
    platformId: "mock-blog",
    displayName: "SaaS Dev Mock Blog",
    channelType: "article",
    configuration: { publishMode: "create_draft" },
    mockBehavior: "success",
  },
  {
    platformId: "halo",
    displayName: "Halo Blog（待连接）",
    channelType: "article",
    configuration: { publishMode: "create_draft" },
    mockBehavior: "success",
  },
  {
    platformId: "xiaohongshu",
    displayName: "小红书（内容再加工）",
    channelType: "image_text",
    configuration: { publishMode: "copy_publish" },
    mockBehavior: "success",
  },
];

export async function seedDatabase(prisma) {
  const demoEmail = String(process.env.DEMO_USER_EMAIL || "")
    .trim()
    .toLowerCase();
  const demoName =
    String(process.env.DEMO_USER_NAME || "").trim() || "OneFlow 开发者";
  const demoPassword = String(process.env.DEMO_USER_PASSWORD || "");
  const passwordHash = demoPassword
    ? await hashPassword(demoPassword)
    : undefined;
  const user = await prisma.user.upsert({
    where: { devProfileKey: "seed-dev-user" },
    update: {
      name: demoName,
      ...(demoEmail ? { email: demoEmail } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    create: {
      id: "seed-user-oneflow",
      devProfileKey: "seed-dev-user",
      email: demoEmail || null,
      name: demoName,
      passwordHash,
    },
  });
  const workspace = await prisma.workspace.upsert({
    where: { slug: "oneflow-dev-workspace" },
    update: {
      name: "OneFlow 开发工作区",
      ownerId: user.id,
      plan: "free",
    },
    create: {
      id: "seed-workspace-oneflow",
      slug: "oneflow-dev-workspace",
      name: "OneFlow 开发工作区",
      ownerId: user.id,
      plan: "free",
    },
  });

  if (demoEmail && passwordHash) {
    await prisma.authIdentity.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "password",
        },
      },
      update: { providerUserId: demoEmail },
      create: {
        userId: user.id,
        provider: "password",
        providerUserId: demoEmail,
      },
    });
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: { role: "owner" },
    create: {
      id: "seed-membership-owner",
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    },
  });
  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: { planId: "free", status: "active" },
    create: {
      id: "seed-subscription-free",
      workspaceId: workspace.id,
      planId: "free",
      status: "active",
    },
  });
  await prisma.article.upsert({
    where: { id: "seed-article-oneflow" },
    update: {
      title: "从本地 MVP 到 SaaS 发布中枢",
      summary: "OneFlow Phase 4 后端工程化示例文章。",
    },
    create: {
      id: "seed-article-oneflow",
      workspaceId: workspace.id,
      title: "从本地 MVP 到 SaaS 发布中枢",
      summary: "OneFlow Phase 4 后端工程化示例文章。",
      contentHtml:
        "<h2>工程化目标</h2><p>让文章、渠道与发布批次在同一工作区中可靠流转。</p>",
      contentMarkdown:
        "## 工程化目标\n\n让文章、渠道与发布批次在同一工作区中可靠流转。",
      tags: JSON.stringify(["OneFlow", "SaaS", "内容发布"]),
      cover: JSON.stringify({
        sourceType: "generated",
        url: "/assets/article-cover.png",
        alt: "OneFlow 一文多发发布中枢",
        aspectRatio: "16:9",
        platformCrops: [],
      }),
      status: "draft",
    },
  });

  for (const channel of CHANNELS) {
    await prisma.channelConfig.upsert({
      where: {
        workspaceId_platformId_displayName: {
          workspaceId: workspace.id,
          platformId: channel.platformId,
          displayName: channel.displayName,
        },
      },
      update: {
        channelType: channel.channelType,
        configuration: JSON.stringify(channel.configuration),
        mockBehavior: channel.mockBehavior,
      },
      create: {
        workspaceId: workspace.id,
        platformId: channel.platformId,
        displayName: channel.displayName,
        channelType: channel.channelType,
        configuration: JSON.stringify(channel.configuration),
        credentialStatus: "none",
        connectionStatus: "not_connected",
        mockBehavior: channel.mockBehavior,
      },
    });
  }

  for (const [capabilityId, name, minimumPlan] of CAPABILITIES) {
    await prisma.aICapability.upsert({
      where: {
        workspaceId_capabilityId: {
          workspaceId: workspace.id,
          capabilityId,
        },
      },
      update: {
        name,
        minimumPlan,
        enabled: minimumPlan === "free",
      },
      create: {
        workspaceId: workspace.id,
        capabilityId,
        name,
        minimumPlan,
        enabled: minimumPlan === "free",
        humanConfirmation: true,
      },
    });
  }

  return { user, workspace };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const prisma = createPrismaClient(databaseUrl);
  try {
    await seedDatabase(prisma);
    console.log("OneFlow development seed completed.");
  } finally {
    await prisma.$disconnect();
  }
}

const isEntryPoint =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
