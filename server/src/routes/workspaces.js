function workspaceView(membership) {
  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    role: membership.role,
    createdAt: membership.workspace.createdAt,
  };
}

export async function workspaceRoutes(app) {
  app.get(
    "/workspaces",
    { preHandler: app.authenticate },
    async (request) => {
      const memberships = await app.prisma.workspaceMember.findMany({
        where: { userId: request.auth.userId },
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      });
      return { data: memberships.map(workspaceView) };
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
        return reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "当前工作区不存在。",
            requestId: request.id,
          },
        });
      }
      return { data: workspaceView(membership) };
    },
  );
}
