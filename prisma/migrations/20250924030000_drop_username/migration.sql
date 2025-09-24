-- Drop index and column for username
DROP INDEX IF EXISTS "User_username_key";
ALTER TABLE "public"."User" DROP COLUMN IF EXISTS "username";
