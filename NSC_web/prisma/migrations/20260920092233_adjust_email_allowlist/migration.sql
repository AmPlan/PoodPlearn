/*
  Warnings:

  - You are about to drop the column `role` on the `AllowedGoogleEmail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AllowedGoogleEmail" DROP COLUMN "role",
ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false;
