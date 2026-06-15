function workspaceView(membership) {
  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    role: membership.role,
    plan: membership.workspace.plan,
    ownerId: membership.workspace.ownerId,
    createdAt: membership.workspace.createdAt,
  };
}

export async function workspaceRoutes(app) {
  app.get(
    "/workspaces",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const memberships = await app.prisma.workspaceMember.findMany({
        where: { userId: request.auth.userId },
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      });
      return reply.success(memberships.map(workspaceView));
    },
  );

  app.get(
    "/workspaces/current",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const membership = await app.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: request.auth.workspaceId,
            userId: request.auth.userId,
          },
        },
        include: { workspace: true },
      });
      if (!membership) {
        return reply.failure(404, "NOT_FOUND", "当前工作区不存在。");
      }
      return reply.success(workspaceView(membership));
    },
  );
}
