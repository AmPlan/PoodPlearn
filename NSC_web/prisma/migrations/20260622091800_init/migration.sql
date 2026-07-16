-- CreateTable
CREATE TABLE "Users" (
    "user_id" SERIAL NOT NULL,
    "account" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Patients" (
    "patient_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "patient_first_name" VARCHAR(255) NOT NULL,
    "patient_last_name" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "occupation" VARCHAR(255) NOT NULL,
    "province" VARCHAR(255) NOT NULL,
    "caregiver_first_name" VARCHAR(255) NOT NULL,
    "caregiver_last_name" VARCHAR(255) NOT NULL,
    "caregiver_relationship" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "Therapists" (
    "therapist_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Therapists_pkey" PRIMARY KEY ("therapist_id")
);

-- CreateTable
CREATE TABLE "Categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "Difficulty_Levels" (
    "difficulty_id" SERIAL NOT NULL,
    "difficulty_level" SMALLINT NOT NULL,
    "difficulty_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "Difficulty_Levels_pkey" PRIMARY KEY ("difficulty_id")
);

-- CreateTable
CREATE TABLE "Training_Sets" (
    "set_id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "difficulty_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_Sets_pkey" PRIMARY KEY ("set_id")
);

-- CreateTable
CREATE TABLE "Questions" (
    "question_id" SERIAL NOT NULL,
    "set_id" INTEGER NOT NULL,
    "question_type" VARCHAR(50) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "Naming_Questions" (
    "naming_question_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "question_text" VARCHAR(255) NOT NULL,
    "question_voice_url" VARCHAR(255) NOT NULL,
    "correct_answer" VARCHAR(255) NOT NULL,
    "correct_answer_voice_url" VARCHAR(255) NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "hint_1_text" VARCHAR(255) NOT NULL,
    "hint_1_voice_url" VARCHAR(255) NOT NULL,
    "hint_2_text" VARCHAR(255) NOT NULL,
    "hint_2_voice_url" VARCHAR(255) NOT NULL,

    CONSTRAINT "Naming_Questions_pkey" PRIMARY KEY ("naming_question_id")
);

-- CreateTable
CREATE TABLE "Comprehension_Image_Questions" (
    "comprehension_image_question_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "question_text" VARCHAR(255) NOT NULL,
    "question_voice_url" VARCHAR(255) NOT NULL,
    "correct_image_url" VARCHAR(255) NOT NULL,
    "wrong_image_url_1" VARCHAR(255) NOT NULL,
    "wrong_image_url_2" VARCHAR(255) NOT NULL,

    CONSTRAINT "Comprehension_Image_Questions_pkey" PRIMARY KEY ("comprehension_image_question_id")
);

-- CreateTable
CREATE TABLE "Repetition_Questions" (
    "repetition_question_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "text_voice_url" VARCHAR(255) NOT NULL,

    CONSTRAINT "Repetition_Questions_pkey" PRIMARY KEY ("repetition_question_id")
);

-- CreateTable
CREATE TABLE "Spontaneous_Questions" (
    "spontaneous_question_id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "correct_answer" VARCHAR(255) NOT NULL,
    "correct_answer_voice_url" VARCHAR(255) NOT NULL,
    "question_text" VARCHAR(255) NOT NULL,
    "question_voice_url" VARCHAR(255) NOT NULL,

    CONSTRAINT "Spontaneous_Questions_pkey" PRIMARY KEY ("spontaneous_question_id")
);

-- CreateTable
CREATE TABLE "Session_Category_Results" (
    "session_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "set_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "total_score" DECIMAL(5,2) NOT NULL,
    "average_response_time" DECIMAL(5,2) NOT NULL,
    "average_hint_used" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "Session_Category_Results_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "Session_Item_Result" (
    "session_item_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "asr_text" TEXT,
    "hints_used" SMALLINT,
    "score" DECIMAL(3,2) NOT NULL,
    "response_time" DECIMAL(5,2) NOT NULL,
    "correctness" DECIMAL(6,3),
    "created_at" DATE DEFAULT CURRENT_TIMESTAMP,
    "answer_image_url" VARCHAR(255),

    CONSTRAINT "Session_Item_Result_pkey" PRIMARY KEY ("session_item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patients_user_id_key" ON "Patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Therapists_user_id_key" ON "Therapists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Naming_Questions_question_id_key" ON "Naming_Questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "Comprehension_Image_Questions_question_id_key" ON "Comprehension_Image_Questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "Repetition_Questions_question_id_key" ON "Repetition_Questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "Spontaneous_Questions_question_id_key" ON "Spontaneous_Questions"("question_id");

-- AddForeignKey
ALTER TABLE "Patients" ADD CONSTRAINT "Patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Therapists" ADD CONSTRAINT "Therapists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Training_Sets" ADD CONSTRAINT "Training_Sets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Training_Sets" ADD CONSTRAINT "Training_Sets_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "Difficulty_Levels"("difficulty_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "Training_Sets"("set_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Naming_Questions" ADD CONSTRAINT "Naming_Questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprehension_Image_Questions" ADD CONSTRAINT "Comprehension_Image_Questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repetition_Questions" ADD CONSTRAINT "Repetition_Questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spontaneous_Questions" ADD CONSTRAINT "Spontaneous_Questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session_Category_Results" ADD CONSTRAINT "Session_Category_Results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session_Category_Results" ADD CONSTRAINT "Session_Category_Results_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "Training_Sets"("set_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session_Item_Result" ADD CONSTRAINT "Session_Item_Result_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session_Category_Results"("session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session_Item_Result" ADD CONSTRAINT "Session_Item_Result_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Questions"("question_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
