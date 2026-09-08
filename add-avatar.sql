-- Add missing avatar column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
