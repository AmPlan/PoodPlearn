/*
  Warnings:

  - You are about to drop the column `account` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Users_account_key";

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "account",
DROP COLUMN "password";
