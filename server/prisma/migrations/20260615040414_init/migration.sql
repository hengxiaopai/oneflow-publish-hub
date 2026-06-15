-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "devProfileKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "cover" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Article_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "channelType" TEXT NOT NULL DEFAULT 'article',
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "encryptedCredential" TEXT,
    "credentialStatus" TEXT NOT NULL DEFAULT 'none',
    "connectionStatus" TEXT NOT NULL DEFAULT 'not_connected',
    "mockBehavior" TEXT NOT NULL DEFAULT 'success',
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChannelConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "channelConfigId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChannelVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChannelVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChannelVersion_channelConfigId_fkey" FOREIGN KEY ("channelConfigId") REFERENCES "ChannelConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "articleId" TEXT,
    "strategy" TEXT NOT NULL DEFAULT 'automatic_first',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduleAt" DATETIME,
    "postActions" TEXT NOT NULL DEFAULT '[]',
    "articleSnapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PublishBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishBatch_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "publishBatchId" TEXT NOT NULL,
    "channelConfigId" TEXT,
    "channelVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channelVersionSnapshot" TEXT NOT NULL,
    "result" TEXT,
    "remoteUrl" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PublishTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishTask_publishBatchId_fkey" FOREIGN KEY ("publishBatchId") REFERENCES "PublishBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishTask_channelConfigId_fkey" FOREIGN KEY ("channelConfigId") REFERENCES "ChannelConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PublishTask_channelVersionId_fkey" FOREIGN KEY ("channelVersionId") REFERENCES "ChannelVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AICapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "automaticExecution" BOOLEAN NOT NULL DEFAULT false,
    "humanConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "minimumPlan" TEXT NOT NULL DEFAULT 'free',
    "promptTemplate" TEXT NOT NULL DEFAULT '',
    "inputFields" TEXT NOT NULL DEFAULT '[]',
    "outputFields" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AICapability_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "period" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_devProfileKey_key" ON "User"("devProfileKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Article_workspaceId_updatedAt_idx" ON "Article"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChannelConfig_workspaceId_connectionStatus_idx" ON "ChannelConfig"("workspaceId", "connectionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConfig_workspaceId_platformId_displayName_key" ON "ChannelConfig"("workspaceId", "platformId", "displayName");

-- CreateIndex
CREATE INDEX "ChannelVersion_workspaceId_status_idx" ON "ChannelVersion"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelVersion_articleId_channelConfigId_key" ON "ChannelVersion"("articleId", "channelConfigId");

-- CreateIndex
CREATE INDEX "PublishBatch_workspaceId_createdAt_idx" ON "PublishBatch"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PublishTask_workspaceId_status_idx" ON "PublishTask"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "PublishTask_publishBatchId_idx" ON "PublishTask"("publishBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "AICapability_workspaceId_capabilityId_key" ON "AICapability"("workspaceId", "capabilityId");

-- CreateIndex
CREATE INDEX "UsageRecord_workspaceId_period_type_idx" ON "UsageRecord"("workspaceId", "period", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");
