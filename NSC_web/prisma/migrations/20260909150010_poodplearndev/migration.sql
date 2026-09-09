/*
  Warnings:

  - You are about to drop the column `sst_model` on the `Assessment_Item_Results` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `Daily_Plan_Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `sst_model` on the `Session_Item_Results` table. All the data in the column will be lost.
  - You are about to drop the `Assessment_Result` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `comprehension_question_id` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[question_id]` on the table `Comprehension_Image_Questions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduled_date,training_plan_id]` on the table `Daily_Plan_Schedule` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[question_id]` on the table `Naming_Questions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `Patients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[question_id]` on the table `Repetition_Questions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[question_id]` on the table `Spontaneous_Questions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `Therapists` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[account]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Assessment_Category_Results" DROP CONSTRAINT "Assessment_Category_Results_assessment_result_id_fkey";

-- DropForeignKey
ALTER TABLE "Assessment_Item_Results" DROP CONSTRAINT "Assessment_Item_Results_assessment_result_id_fkey";

-- DropForeignKey
ALTER TABLE "Assessment_Result" DROP CONSTRAINT "Assessment_Result_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "Assessment_Result" DROP CONSTRAINT "Assessment_Result_set_id_fkey";

-- DropForeignKey
ALTER TABLE "Daily_Plan_Schedule" DROP CONSTRAINT "Daily_Plan_Schedule_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "comprehension_question_id" DROP CONSTRAINT "comprehension_question_id_question_id_fkey";

-- DropIndex
DROP INDEX "Daily_Plan_Schedule_patient_id_scheduled_date_training_plan_key";

-- AlterTable
ALTER TABLE "Assessment_Item_Results" DROP COLUMN "sst_model",
ADD COLUMN     "stt_model" TEXT;

-- AlterTable
ALTER TABLE "Daily_Plan_Schedule" DROP COLUMN "patient_id";

-- AlterTable
ALTER TABLE "Session_Item_Results" DROP COLUMN "sst_model",
ADD COLUMN     "stt_model" TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- DropTable
DROP TABLE "Assessment_Result";

-- DropTable
DROP TABLE "comprehension_question_id";

-- CreateTable
CREATE TABLE "Comprehension_Questions" (
    "comprehension_question_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "custom_condition" VARCHAR(255),
    "correct_answer" BOOLEAN,
    "question_text" VARCHAR(255) NOT NULL,
    "question_voice_url" VARCHAR(255) NOT NULL,

    CONSTRAINT "Comprehension_Questions_pkey" PRIMARY KEY ("comprehension_question_id")
);

-- CreateTable
CREATE TABLE "Assessment_Results" (
    "assessment_result_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "set_id" INTEGER NOT NULL DEFAULT 2,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "Assessment_Results_pkey" PRIMARY KEY ("assessment_result_id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comprehension_Questions_question_id_key" ON "Comprehension_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Comprehension_Questions_question_id_idx" ON "Comprehension_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Assessment_Results_patient_id_idx" ON "Assessment_Results"("patient_id");

-- CreateIndex
CREATE INDEX "Assessment_Results_set_id_idx" ON "Assessment_Results"("set_id");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "Assessment_Category_Results_assessment_item_result_id_idx" ON "Assessment_Category_Results"("assessment_item_result_id");

-- CreateIndex
CREATE INDEX "Assessment_Category_Results_assessment_result_id_idx" ON "Assessment_Category_Results"("assessment_result_id");

-- CreateIndex
CREATE INDEX "Assessment_Category_Results_category_id_idx" ON "Assessment_Category_Results"("category_id");

-- CreateIndex
CREATE INDEX "Assessment_Category_Results_recommended_difficulty_id_idx" ON "Assessment_Category_Results"("recommended_difficulty_id");

-- CreateIndex
CREATE INDEX "Assessment_Item_Results_assessment_result_id_idx" ON "Assessment_Item_Results"("assessment_result_id");

-- CreateIndex
CREATE INDEX "Assessment_Item_Results_question_id_idx" ON "Assessment_Item_Results"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "Comprehension_Image_Questions_question_id_key" ON "Comprehension_Image_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Comprehension_Image_Questions_question_id_idx" ON "Comprehension_Image_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Daily_Plan_Schedule_session_id_idx" ON "Daily_Plan_Schedule"("session_id");

-- CreateIndex
CREATE INDEX "Daily_Plan_Schedule_training_plan_id_idx" ON "Daily_Plan_Schedule"("training_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "Daily_Plan_Schedule_scheduled_date_training_plan_id_key" ON "Daily_Plan_Schedule"("scheduled_date", "training_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "Naming_Questions_question_id_key" ON "Naming_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Naming_Questions_question_id_idx" ON "Naming_Questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patients_user_id_key" ON "Patients"("user_id");

-- CreateIndex
CREATE INDEX "Patients_user_id_idx" ON "Patients"("user_id");

-- CreateIndex
CREATE INDEX "Progress_Category_category_id_idx" ON "Progress_Category"("category_id");

-- CreateIndex
CREATE INDEX "Progress_Tracking_patient_id_idx" ON "Progress_Tracking"("patient_id");

-- CreateIndex
CREATE INDEX "Questions_difficulty_id_idx" ON "Questions"("difficulty_id");

-- CreateIndex
CREATE UNIQUE INDEX "Repetition_Questions_question_id_key" ON "Repetition_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Repetition_Questions_question_id_idx" ON "Repetition_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Session_Category_Results_set_id_idx" ON "Session_Category_Results"("set_id");

-- CreateIndex
CREATE INDEX "Session_Item_Results_question_id_idx" ON "Session_Item_Results"("question_id");

-- CreateIndex
CREATE INDEX "Session_Item_Results_session_category_id_idx" ON "Session_Item_Results"("session_category_id");

-- CreateIndex
CREATE INDEX "Session_Results_patient_id_idx" ON "Session_Results"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "Spontaneous_Questions_question_id_key" ON "Spontaneous_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Spontaneous_Questions_question_id_idx" ON "Spontaneous_Questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "Therapists_user_id_key" ON "Therapists"("user_id");

-- CreateIndex
CREATE INDEX "Training_Plans_patient_id_idx" ON "Training_Plans"("patient_id");

-- CreateIndex
CREATE INDEX "Training_Plans_training_set_id_idx" ON "Training_Plans"("training_set_id");

-- CreateIndex
CREATE INDEX "Training_Set_Questions_question_id_idx" ON "Training_Set_Questions"("question_id");

-- CreateIndex
CREATE INDEX "Training_Sets_category_id_idx" ON "Training_Sets"("category_id");

-- CreateIndex
CREATE INDEX "Training_Sets_difficulty_id_idx" ON "Training_Sets"("difficulty_id");

-- CreateIndex
CREATE UNIQUE INDEX "Users_account_key" ON "Users"("account");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Comprehension_Questions" ADD CONSTRAINT "Comprehension_Questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment_Results" ADD CONSTRAINT "Assessment_Results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment_Results" ADD CONSTRAINT "Assessment_Results_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "Training_Sets"("set_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Item_Results" ADD CONSTRAINT "Assessment_Item_Results_assessment_result_id_fkey" FOREIGN KEY ("assessment_result_id") REFERENCES "Assessment_Results"("assessment_result_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Category_Results" ADD CONSTRAINT "Assessment_Category_Results_assessment_result_id_fkey" FOREIGN KEY ("assessment_result_id") REFERENCES "Assessment_Results"("assessment_result_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
