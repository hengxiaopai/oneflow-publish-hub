const ROLE_RANK = Object.freeze({
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
});

export function hasMinimumRole(role, minimumRole) {
  return (
    ROLE_RANK[role] !== undefined &&
    ROLE_RANK[role] >= ROLE_RANK[minimumRole]
  );
}

export function createRoleGuard(minimumRole) {
  return async function requireRole(request, reply) {
    if (!hasMinimumRole(request.auth?.role, minimumRole)) {
      return reply.failure(
        403,
        "ROLE_PERMISSION_DENIED",
        "当前工作区角色没有执行此操作的权限。",
        {
          requiredRole: minimumRole,
          currentRole: request.auth?.role || null,
        },
      );
    }
  };
}

export { ROLE_RANK };
