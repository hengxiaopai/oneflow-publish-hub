-- AlterTable
ALTER TABLE "PublishTask" ADD COLUMN "idempotencyKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublishTask" ADD COLUMN "lockedAt" DATETIME;
ALTER TABLE "PublishTask" ADD COLUMN "lockOwner" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "lastErrorCode" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "lastErrorMessage" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "retryable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublishTask" ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "PublishTask" ADD COLUMN "nextRetryAt" DATETIME;

-- CreateTable
CREATE TABLE "PublishTaskEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "publishTaskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "safeRemoteStatus" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublishTaskEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishTaskEvent_publishTaskId_fkey" FOREIGN KEY ("publishTaskId") REFERENCES "PublishTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PublishTask_workspaceId_idempotencyKey_idx" ON "PublishTask"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PublishTaskEvent_workspaceId_createdAt_idx" ON "PublishTaskEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PublishTaskEvent_publishTaskId_createdAt_idx" ON "PublishTaskEvent"("publishTaskId", "createdAt");
