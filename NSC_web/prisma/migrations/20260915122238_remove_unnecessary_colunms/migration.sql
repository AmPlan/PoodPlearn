/*
  Warnings:

  - You are about to drop the column `audio_file_name` on the `Assessment_Item_Results` table. All the data in the column will be lost.
  - You are about to drop the column `stt_model` on the `Assessment_Item_Results` table. All the data in the column will be lost.
  - You are about to drop the column `audio_file_name` on the `Session_Item_Results` table. All the data in the column will be lost.
  - You are about to drop the column `stt_model` on the `Session_Item_Results` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Assessment_Item_Results" DROP COLUMN "audio_file_name",
DROP COLUMN "stt_model";

-- AlterTable
ALTER TABLE "Session_Item_Results" DROP COLUMN "audio_file_name",
DROP COLUMN "stt_model";
