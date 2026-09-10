-- Production databases created by an older schema can have neither addedAt nor createdAt.
-- Keep existing timestamps when addedAt exists; otherwise add the missing column safely.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ProjectMember' AND column_name = 'addedAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ProjectMember' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "ProjectMember" RENAME COLUMN "addedAt" TO "createdAt";
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ProjectMember' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "ProjectMember"
        ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
