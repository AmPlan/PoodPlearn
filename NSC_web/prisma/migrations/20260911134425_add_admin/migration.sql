-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "banExpires" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "impersonatedBy" TEXT;
