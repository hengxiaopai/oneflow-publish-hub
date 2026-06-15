-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'auth',
    "expiresAt" DATETIME NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "devProfileKey" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" (
    "createdAt",
    "devProfileKey",
    "email",
    "id",
    "name",
    "updatedAt"
)
SELECT
    "createdAt",
    "devProfileKey",
    "email",
    "id",
    COALESCE(NULLIF("displayName", ''), 'OneFlow User'),
    "updatedAt"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_devProfileKey_key" ON "User"("devProfileKey");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Workspace" (
    "createdAt",
    "id",
    "name",
    "ownerId",
    "slug",
    "updatedAt"
)
SELECT
    "Workspace"."createdAt",
    "Workspace"."id",
    "Workspace"."name",
    (
        SELECT "WorkspaceMember"."userId"
        FROM "WorkspaceMember"
        WHERE "WorkspaceMember"."workspaceId" = "Workspace"."id"
        ORDER BY CASE "WorkspaceMember"."role"
            WHEN 'owner' THEN 0
            WHEN 'admin' THEN 1
            ELSE 2
        END, "WorkspaceMember"."createdAt"
        LIMIT 1
    ),
    "Workspace"."slug",
    "Workspace"."updatedAt"
FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_workspaceId_idx" ON "Session"("workspaceId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");
CREATE UNIQUE INDEX "AuthIdentity_provider_providerUserId_key" ON "AuthIdentity"("provider", "providerUserId");
CREATE UNIQUE INDEX "AuthIdentity_userId_provider_key" ON "AuthIdentity"("userId", "provider");
