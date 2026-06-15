import { createHash, createHmac, randomBytes } from "node:crypto";

import { createWorkspaceForUser } from "./workspaceProvisioningService.js";

function profileSlug(profileKey) {
  return createHash("sha256").update(profileKey).digest("hex").slice(0, 12);
}

export function createSessionService(
  prisma,
  { sessionSecret, sessionTtlHours = 168 },
) {
  const hashToken = (token) =>
    createHmac("sha256", sessionSecret).update(token).digest("hex");
  const hashIp = (ipAddress) =>
    ipAddress
      ? createHmac("sha256", sessionSecret)
          .update(String(ipAddress))
          .digest("hex")
      : null;

  async function ensureDevProfile(profileKey = "default") {
    const normalizedKey = String(profileKey || "default").trim().slice(0, 80);
    let user = await prisma.user.findUnique({
      where: { devProfileKey: normalizedKey },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          devProfileKey: normalizedKey,
          name: "本地开发者",
        },
      });
    }

    let membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: {
        workspace: {
          include: { subscription: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      const workspace = await createWorkspaceForUser(prisma, user, {
        name: "OneFlow 本地工作区",
        slug: `local-${profileSlug(normalizedKey)}`,
      });
      membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: user.id,
          },
        },
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

  async function create(context, options = {}) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + Number(sessionTtlHours) * 60 * 60 * 1000,
    );
    const session = await prisma.session.create({
      data: {
        userId: context.user.id,
        workspaceId: context.workspace.id,
        tokenHash: hashToken(token),
        kind: options.kind || "auth",
        expiresAt,
        userAgent: String(options.userAgent || "").slice(0, 500) || null,
        ipHash: hashIp(options.ipAddress),
      },
    });
    return { token, session, ...context };
  }

  async function start(profileKey, requestMetadata = {}) {
    const context = await ensureDevProfile(profileKey);
    return create(context, { ...requestMetadata, kind: "dev" });
  }

  async function resolve(token) {
    if (!token) return { status: "missing" };
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true, workspace: true },
    });
    if (!session) return { status: "missing" };
    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return { status: "expired" };
    }
    if (session.user.status !== "active") {
      return { status: "inactive" };
    }
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: session.workspaceId,
          userId: session.userId,
        },
      },
    });
    if (!membership) {
      return { status: "forbidden" };
    }
    return {
      status: "active",
      sessionId: session.id,
      sessionKind: session.kind,
      userId: session.userId,
      workspaceId: session.workspaceId,
      role: membership.role,
    };
  }

  async function destroyById(sessionId) {
    if (!sessionId) return;
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }

  async function destroy(token) {
    if (!token) return;
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }

  async function clear() {
    await prisma.session.deleteMany();
  }

  return {
    clear,
    create,
    destroy,
    destroyById,
    ensureDevProfile,
    hashToken,
    resolve,
    start,
  };
}
