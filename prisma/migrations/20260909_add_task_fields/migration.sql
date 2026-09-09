-- Add missing columns to Task table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='description') THEN
        ALTER TABLE "Task" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='priority') THEN
        ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='dueDate') THEN
        ALTER TABLE "Task" ADD COLUMN "dueDate" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Rename addedAt to createdAt in ProjectMember if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ProjectMember' AND column_name='addedAt') THEN
        ALTER TABLE "ProjectMember" RENAME COLUMN "addedAt" TO "createdAt";
    END IF;
END $$;
