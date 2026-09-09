-- ============================================
-- Add missing columns to existing tables
-- Safe to run multiple times (checks before adding)
-- ============================================

-- Task table: add all missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='receivedAt') THEN
        ALTER TABLE "Task" ADD COLUMN "receivedAt" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='deadline') THEN
        ALTER TABLE "Task" ADD COLUMN "deadline" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='completedAt') THEN
        ALTER TABLE "Task" ADD COLUMN "completedAt" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='responsible') THEN
        ALTER TABLE "Task" ADD COLUMN "responsible" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='engineer') THEN
        ALTER TABLE "Task" ADD COLUMN "engineer" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='customFields') THEN
        ALTER TABLE "Task" ADD COLUMN "customFields" JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='deletedAt') THEN
        ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='createdAt') THEN
        ALTER TABLE "Task" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='updatedAt') THEN
        ALTER TABLE "Task" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Project table: add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='color') THEN
        ALTER TABLE "Project" ADD COLUMN "color" TEXT DEFAULT '#3B82F6';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='tags') THEN
        ALTER TABLE "Project" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='deletedAt') THEN
        ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='customFields') THEN
        ALTER TABLE "Project" ADD COLUMN "customFields" JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='receivedAt') THEN
        ALTER TABLE "Project" ADD COLUMN "receivedAt" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='deadline') THEN
        ALTER TABLE "Project" ADD COLUMN "deadline" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='completedAt') THEN
        ALTER TABLE "Project" ADD COLUMN "completedAt" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='customer') THEN
        ALTER TABLE "Project" ADD COLUMN "customer" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='pss') THEN
        ALTER TABLE "Project" ADD COLUMN "pss" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='reg') THEN
        ALTER TABLE "Project" ADD COLUMN "reg" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='status') THEN
        ALTER TABLE "Project" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='priority') THEN
        ALTER TABLE "Project" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='responsible') THEN
        ALTER TABLE "Project" ADD COLUMN "responsible" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='engineer') THEN
        ALTER TABLE "Project" ADD COLUMN "engineer" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='ownerId') THEN
        ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='createdAt') THEN
        ALTER TABLE "Project" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Project' AND column_name='updatedAt') THEN
        ALTER TABLE "Project" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Comment table: add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='author') THEN
        ALTER TABLE "Comment" ADD COLUMN "author" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='text') THEN
        ALTER TABLE "Comment" ADD COLUMN "text" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='date') THEN
        ALTER TABLE "Comment" ADD COLUMN "date" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='projectId') THEN
        ALTER TABLE "Comment" ADD COLUMN "projectId" INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='taskId') THEN
        ALTER TABLE "Comment" ADD COLUMN "taskId" INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='userId') THEN
        ALTER TABLE "Comment" ADD COLUMN "userId" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='createdAt') THEN
        ALTER TABLE "Comment" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- ProjectHistory table: add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='date') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "date" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='user') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "user" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='action') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "action" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='details') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "details" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='projectId') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "projectId" INTEGER NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='userId') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "userId" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectHistory' AND column_name='createdAt') THEN
        ALTER TABLE "ProjectHistory" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Attachment table: add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='name') THEN
        ALTER TABLE "Attachment" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='size') THEN
        ALTER TABLE "Attachment" ADD COLUMN "size" INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='mimeType') THEN
        ALTER TABLE "Attachment" ADD COLUMN "mimeType" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='url') THEN
        ALTER TABLE "Attachment" ADD COLUMN "url" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='cloudinaryId') THEN
        ALTER TABLE "Attachment" ADD COLUMN "cloudinaryId" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='uploadedAt') THEN
        ALTER TABLE "Attachment" ADD COLUMN "uploadedAt" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='uploadedBy') THEN
        ALTER TABLE "Attachment" ADD COLUMN "uploadedBy" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='projectId') THEN
        ALTER TABLE "Attachment" ADD COLUMN "projectId" INTEGER NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Attachment' AND column_name='createdAt') THEN
        ALTER TABLE "Attachment" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- ============================================
-- Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS "Task_deletedAt_idx" ON "Task"("deletedAt");
CREATE INDEX IF NOT EXISTS "Project_deletedAt_idx" ON "Project"("deletedAt");
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX IF NOT EXISTS "Attachment_cloudinaryId_idx" ON "Attachment"("cloudinaryId");
CREATE INDEX IF NOT EXISTS "Attachment_projectId_idx" ON "Attachment"("projectId");

-- ============================================
-- Add foreign keys
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_projectId_fkey') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_projectId_fkey') THEN
        ALTER TABLE "Comment" ADD CONSTRAINT "Comment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_taskId_fkey') THEN
        ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_userId_fkey') THEN
        ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectHistory_projectId_fkey') THEN
        ALTER TABLE "ProjectHistory" ADD CONSTRAINT "ProjectHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectHistory_userId_fkey') THEN
        ALTER TABLE "ProjectHistory" ADD CONSTRAINT "ProjectHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attachment_projectId_fkey') THEN
        ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_ownerId_fkey') THEN
        ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectMember_projectId_fkey') THEN
        ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectMember_userId_fkey') THEN
        ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
