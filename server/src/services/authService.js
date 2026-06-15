import { Prisma } from "@prisma/client";

import { hashPassword, verifyPassword } from "./passwordService.js";
import { createWorkspaceForUser } from "./workspaceProvisioningService.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function createAuthService(prisma, sessionService) {
  async function register(input, metadata = {}) {
    const email = normalizeEmail(input.email);
    try {
      const context = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: String(input.name || "").trim(),
            passwordHash: await hashPassword(input.password),
            status: "active",
          },
        });
        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: "password",
            providerUserId: email,
          },
        });
        const workspace = await createWorkspaceForUser(tx, user);
        const membership = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: user.id,
            },
          },
        });
        return {
          user,
          workspace,
          membership,
          subscription: workspace.subscription,
        };
      });
      return {
        ok: true,
        context: await sessionService.create(context, {
          ...metadata,
          kind: "auth",
        }),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, code: "EMAIL_ALREADY_REGISTERED" };
      }
      throw error;
    }
  }

  async function login(input, metadata = {}) {
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });
    const valid =
      user?.status === "active" &&
      (await verifyPassword(user.passwordHash, input.password));
    if (!valid) return { ok: false, code: "INVALID_CREDENTIALS" };

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: {
        workspace: {
          include: { subscription: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) return { ok: false, code: "WORKSPACE_ACCESS_DENIED" };

    const context = {
      user,
      membership,
      workspace: membership.workspace,
      subscription: membership.workspace.subscription,
    };
    return {
      ok: true,
      context: await sessionService.create(context, {
        ...metadata,
        kind: "auth",
      }),
    };
  }

  return { login, register };
}
