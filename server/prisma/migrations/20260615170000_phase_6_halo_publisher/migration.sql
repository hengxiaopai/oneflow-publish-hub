-- AlterTable
ALTER TABLE "Article" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ChannelConfig" ADD COLUMN "publisherMode" TEXT NOT NULL DEFAULT 'mock';
ALTER TABLE "ChannelConfig" ADD COLUMN "lastTestedAt" DATETIME;
ALTER TABLE "ChannelConfig" ADD COLUMN "lastTestStatus" TEXT;
ALTER TABLE "ChannelConfig" ADD COLUMN "lastTestMessage" TEXT;

-- AlterTable
ALTER TABLE "PublishTask" ADD COLUMN "remotePostId" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "remotePostName" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "remoteEditUrl" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "remotePreviewUrl" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "remotePublicUrl" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "remoteStatus" TEXT;
ALTER TABLE "PublishTask" ADD COLUMN "draftCreatedAt" DATETIME;
ALTER TABLE "PublishTask" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "PublishTask" ADD COLUMN "lastSyncAt" DATETIME;
ALTER TABLE "PublishTask" ADD COLUMN "rawResponseSummary" TEXT;

-- CreateTable
CREATE TABLE "ValidationIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "publishTaskId" TEXT,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "field" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationIssue_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ValidationIssue_publishTaskId_fkey" FOREIGN KEY ("publishTaskId") REFERENCES "PublishTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ValidationIssue_workspaceId_createdAt_idx" ON "ValidationIssue"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ValidationIssue_publishTaskId_idx" ON "ValidationIssue"("publishTaskId");
