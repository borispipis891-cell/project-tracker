-- Add indexes for faster writes and lookups

-- Task indexes
CREATE INDEX IF NOT EXISTS "Task_projectId_createdAt_idx" ON "Task"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");

-- ProjectHistory indexes
CREATE INDEX IF NOT EXISTS "ProjectHistory_projectId_date_idx" ON "ProjectHistory"("projectId", "date");

-- User indexes for faster session lookups
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Project indexes
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");

-- ProjectMember indexes
CREATE INDEX IF NOT EXISTS "ProjectMember_userId_projectId_idx" ON "ProjectMember"("userId", "projectId");
