CREATE TABLE "EmailTaskDraft" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mailboxUid" INTEGER,
    "senderName" TEXT,
    "senderEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "attachmentNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailReceivedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "receivedAt" TEXT NOT NULL,
    "deadline" TEXT NOT NULL DEFAULT '',
    "projectId" INTEGER,
    "responsible" TEXT,
    "responsibleId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agentNote" TEXT NOT NULL DEFAULT '',
    "agentModel" TEXT,
    "errorMessage" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdTaskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTaskDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailTaskDraft_messageId_key" ON "EmailTaskDraft"("messageId");
CREATE INDEX "EmailTaskDraft_status_createdAt_idx" ON "EmailTaskDraft"("status", "createdAt");
CREATE INDEX "EmailTaskDraft_projectId_idx" ON "EmailTaskDraft"("projectId");
CREATE INDEX "EmailTaskDraft_senderEmail_idx" ON "EmailTaskDraft"("senderEmail");

CREATE TABLE "EmailTaskSyncState" (
    "id" TEXT NOT NULL,
    "lastUid" INTEGER NOT NULL DEFAULT 0,
    "uidValidity" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTaskSyncState_pkey" PRIMARY KEY ("id")
);
