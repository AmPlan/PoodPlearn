/*
  Warnings:

  - You are about to drop the column `account` on the `Users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Users_account_key";

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "account",
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");
