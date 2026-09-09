-- Add description column to Task table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='description') THEN
        ALTER TABLE "Task" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;
