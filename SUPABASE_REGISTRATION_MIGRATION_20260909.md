# Production registration database repair — 2026-09-09

Applied through Supabase SQL Editor to project `jsudvmzfgfxxugxsuowp`, schema `public`.

Inspection found `VerificationToken` empty, with legacy required `identifier` and `expires` columns, and missing `type`, `expiresAt`, and `usedAt`. The existing primary key, token unique constraint, user foreign key, and userId index were present. The previously committed migration only adding `type` was insufficient.

Executed successfully:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';
LOCK TABLE public."VerificationToken" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public."VerificationToken") THEN
    RAISE EXCEPTION 'Token table changed since inspection; migration aborted for review';
  END IF;
END $$;
ALTER TABLE public."VerificationToken"
  ADD COLUMN "type" TEXT NOT NULL,
  ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "usedAt" TIMESTAMP(3),
  ALTER COLUMN "identifier" DROP NOT NULL,
  ALTER COLUMN "expires" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "VerificationToken_token_idx"
  ON public."VerificationToken"("token");
COMMIT;
```

Post-migration inspection confirmed all five column definitions. No columns, users, or projects were deleted; legacy columns were retained. This SQL is a record of the already executed repair, not a script to rerun. Prisma migration history was not modified. Future migrations should account for this production schema repair.

This repairs database compatibility only. SMTP delivery and application-level registration/resend issues require separate verification.
