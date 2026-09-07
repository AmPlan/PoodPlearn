/*
  Warnings:

  - You are about to drop the column `question_text` on the `Naming_Questions` table. All the data in the column will be lost.
  - You are about to drop the column `question_voice_url` on the `Naming_Questions` table. All the data in the column will be lost.
  - You are about to drop the column `order_index` on the `Questions` table. All the data in the column will be lost.
  - You are about to drop the column `question_type` on the `Questions` table. All the data in the column will be lost.
  - You are about to drop the column `set_id` on the `Questions` table. All the data in the column will be lost.
  - The primary key for the `Session_Category_Results` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `patient_id` on the `Session_Category_Results` table. All the data in the column will be lost.
  - The `role` column on the `Users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Session_Item_Result` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[session_id]` on the table `Session_Category_Results` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `gender` on the `Patients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `questionType` to the `Questions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'THERAPIST');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('NAMING', 'COMPREHENSION_IMAGE', 'COMPREHENSION', 'REPETITION', 'SPONTANEOUS');

-- CreateEnum
CREATE TYPE "PlanRole" AS ENUM ('MAIN', 'SECONDARY', 'STANDARD');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'SKIPPED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Questions" DROP CONSTRAINT "Questions_set_id_fkey";

-- DropForeignKey
ALTER TABLE "Session_Category_Results" DROP CONSTRAINT "Session_Category_Results_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "Session_Item_Result" DROP CONSTRAINT "Session_Item_Result_question_id_fkey";

-- DropForeignKey
ALTER TABLE "Session_Item_Result" DROP CONSTRAINT "Session_Item_Result_session_id_fkey";

-- DropIndex
DROP INDEX "Comprehension_Image_Questions_question_id_key";

-- DropIndex
DROP INDEX "Naming_Questions_question_id_key";

-- DropIndex
DROP INDEX "Patients_user_id_key";

-- DropIndex
DROP INDEX "Repetition_Questions_question_id_key";

-- DropIndex
DROP INDEX "Spontaneous_Questions_question_id_key";

-- DropIndex
DROP INDEX "Therapists_user_id_key";

-- AlterTable
ALTER TABLE "Naming_Questions" DROP COLUMN "question_text",
DROP COLUMN "question_voice_url";

-- AlterTable
ALTER TABLE "Patients" ADD COLUMN     "caregiverTelephone" VARCHAR(15),
ADD COLUMN     "childrenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "familyStatus" VARCHAR(255),
ADD COLUMN     "householdMembersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "postcode" VARCHAR(5),
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender" NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Questions" DROP COLUMN "order_index",
DROP COLUMN "question_type",
DROP COLUMN "set_id",
ADD COLUMN     "difficulty_id" INTEGER,
ADD COLUMN     "questionType" "QuestionType" NOT NULL;

-- AlterTable
ALTER TABLE "Session_Category_Results" DROP CONSTRAINT "Session_Category_Results_pkey",
DROP COLUMN "patient_id",
ADD COLUMN     "session_category_id" SERIAL NOT NULL,
ALTER COLUMN "session_id" DROP DEFAULT,
ALTER COLUMN "ended_at" DROP NOT NULL,
ADD CONSTRAINT "Session_Category_Results_pkey" PRIMARY KEY ("session_category_id");
DROP SEQUENCE "Session_Category_Results_session_id_seq";

-- AlterTable
ALTER TABLE "Spontaneous_Questions" ADD COLUMN     "custom_condition" VARCHAR(255),
ALTER COLUMN "correct_answer" DROP NOT NULL,
ALTER COLUMN "correct_answer_voice_url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Therapists" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Training_Sets" ADD COLUMN     "is_standard_assessment" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'PATIENT',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "Session_Item_Result";

-- CreateTable
CREATE TABLE "Training_Set_Questions" (
    "set_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "Training_Set_Questions_pkey" PRIMARY KEY ("set_id","question_id")
);

-- CreateTable
CREATE TABLE "comprehension_question_id" (
    "comprehension_question_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "custom_condition" VARCHAR(255),
    "correct_answer" BOOLEAN,
    "question_text" VARCHAR(255) NOT NULL,
    "question_voice_url" VARCHAR(255) NOT NULL,

    CONSTRAINT "comprehension_question_id_pkey" PRIMARY KEY ("comprehension_question_id")
);

-- CreateTable
CREATE TABLE "Session_Results" (
    "session_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,

    CONSTRAINT "Session_Results_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "Session_Item_Results" (
    "session_item_id" SERIAL NOT NULL,
    "session_category_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "asr_text" TEXT,
    "hints_used" SMALLINT,
    "score" DECIMAL(3,2) NOT NULL,
    "response_time" DECIMAL(5,2) NOT NULL,
    "correctness" DECIMAL(6,3),
    "created_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answer_image_url" VARCHAR(255),
    "answer_boolean" BOOLEAN,
    "audio_file_name" TEXT,
    "sst_model" TEXT,

    CONSTRAINT "Session_Item_Results_pkey" PRIMARY KEY ("session_item_id")
);

-- CreateTable
CREATE TABLE "Assessment_Result" (
    "assessment_result_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "set_id" INTEGER NOT NULL DEFAULT 2,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "Assessment_Result_pkey" PRIMARY KEY ("assessment_result_id")
);

-- CreateTable
CREATE TABLE "Assessment_Item_Results" (
    "assessment_item_result_id" SERIAL NOT NULL,
    "assessment_result_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "asr_text" TEXT,
    "correctness" DECIMAL(6,3),
    "response_time" DECIMAL(5,2),
    "answer_image_url" VARCHAR(255),
    "answer_boolean" BOOLEAN,
    "is_correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audio_file_name" TEXT,
    "sst_model" TEXT,

    CONSTRAINT "Assessment_Item_Results_pkey" PRIMARY KEY ("assessment_item_result_id")
);

-- CreateTable
CREATE TABLE "Assessment_Category_Results" (
    "assessment_category_result_id" SERIAL NOT NULL,
    "assessment_result_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "assessment_item_result_id" INTEGER,
    "total_score" DECIMAL(5,2) NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL,
    "recommended_difficulty_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_Category_Results_pkey" PRIMARY KEY ("assessment_category_result_id")
);

-- CreateTable
CREATE TABLE "Training_Plans" (
    "training_plan_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "training_set_id" INTEGER NOT NULL,
    "planRole" "PlanRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_Plans_pkey" PRIMARY KEY ("training_plan_id")
);

-- CreateTable
CREATE TABLE "Daily_Plan_Schedule" (
    "daily_plan_schedule_id" SERIAL NOT NULL,
    "training_plan_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "session_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Daily_Plan_Schedule_pkey" PRIMARY KEY ("daily_plan_schedule_id")
);

-- CreateTable
CREATE TABLE "Progress_Tracking" (
    "progress_tracking_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "last_update" TIMESTAMP NOT NULL,

    CONSTRAINT "Progress_Tracking_pkey" PRIMARY KEY ("progress_tracking_id")
);

-- CreateTable
CREATE TABLE "Progress_Category" (
    "progress_tracking_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "average_score_percentage" DOUBLE PRECISION,
    "latest_score_percent" DOUBLE PRECISION,
    "average_hint_used" DOUBLE PRECISION,
    "average_response_time" DOUBLE PRECISION,
    "trend" DOUBLE PRECISION,

    CONSTRAINT "Progress_Category_pkey" PRIMARY KEY ("progress_tracking_id","category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Daily_Plan_Schedule_patient_id_scheduled_date_training_plan_key" ON "Daily_Plan_Schedule"("patient_id", "scheduled_date", "training_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_Category_Results_session_id_key" ON "Session_Category_Results"("session_id");

-- AddForeignKey
ALTER TABLE "Training_Set_Questions" ADD CONSTRAINT "Training_Set_Questions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "Training_Sets"("set_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training_Set_Questions" ADD CONSTRAINT "Training_Set_Questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "Difficulty_Levels"("difficulty_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comprehension_question_id" ADD CONSTRAINT "comprehension_question_id_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session_Results" ADD CONSTRAINT "Session_Results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session_Category_Results" ADD CONSTRAINT "Session_Category_Results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session_Results"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session_Item_Results" ADD CONSTRAINT "Session_Item_Results_session_category_id_fkey" FOREIGN KEY ("session_category_id") REFERENCES "Session_Category_Results"("session_category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session_Item_Results" ADD CONSTRAINT "Session_Item_Results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Result" ADD CONSTRAINT "Assessment_Result_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment_Result" ADD CONSTRAINT "Assessment_Result_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "Training_Sets"("set_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Item_Results" ADD CONSTRAINT "Assessment_Item_Results_assessment_result_id_fkey" FOREIGN KEY ("assessment_result_id") REFERENCES "Assessment_Result"("assessment_result_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Item_Results" ADD CONSTRAINT "Assessment_Item_Results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Category_Results" ADD CONSTRAINT "Assessment_Category_Results_assessment_result_id_fkey" FOREIGN KEY ("assessment_result_id") REFERENCES "Assessment_Result"("assessment_result_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Category_Results" ADD CONSTRAINT "Assessment_Category_Results_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Category_Results" ADD CONSTRAINT "Assessment_Category_Results_recommended_difficulty_id_fkey" FOREIGN KEY ("recommended_difficulty_id") REFERENCES "Difficulty_Levels"("difficulty_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment_Category_Results" ADD CONSTRAINT "Assessment_Category_Results_assessment_item_result_id_fkey" FOREIGN KEY ("assessment_item_result_id") REFERENCES "Assessment_Item_Results"("assessment_item_result_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Training_Plans" ADD CONSTRAINT "Training_Plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Training_Plans" ADD CONSTRAINT "Training_Plans_training_set_id_fkey" FOREIGN KEY ("training_set_id") REFERENCES "Training_Sets"("set_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Daily_Plan_Schedule" ADD CONSTRAINT "Daily_Plan_Schedule_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "Training_Plans"("training_plan_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Daily_Plan_Schedule" ADD CONSTRAINT "Daily_Plan_Schedule_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Daily_Plan_Schedule" ADD CONSTRAINT "Daily_Plan_Schedule_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session_Results"("session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Progress_Tracking" ADD CONSTRAINT "Progress_Tracking_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress_Category" ADD CONSTRAINT "Progress_Category_progress_tracking_id_fkey" FOREIGN KEY ("progress_tracking_id") REFERENCES "Progress_Tracking"("progress_tracking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress_Category" ADD CONSTRAINT "Progress_Category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
