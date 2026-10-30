WITH ranked_items AS (
  SELECT
    assessment_item_result_id,
    FIRST_VALUE(assessment_item_result_id) OVER (
      PARTITION BY assessment_result_id, question_id
      ORDER BY created_at DESC, assessment_item_result_id DESC
    ) AS latest_item_result_id,
    ROW_NUMBER() OVER (
      PARTITION BY assessment_result_id, question_id
      ORDER BY created_at DESC, assessment_item_result_id DESC
    ) AS attempt_number
  FROM "Assessment_Item_Results"
)
UPDATE "Assessment_Category_Results" AS category_result
SET assessment_item_result_id = ranked_items.latest_item_result_id
FROM ranked_items
WHERE category_result.assessment_item_result_id =
      ranked_items.assessment_item_result_id
  AND ranked_items.attempt_number > 1;

WITH ranked_items AS (
  SELECT
    assessment_item_result_id,
    ROW_NUMBER() OVER (
      PARTITION BY assessment_result_id, question_id
      ORDER BY created_at DESC, assessment_item_result_id DESC
    ) AS attempt_number
  FROM "Assessment_Item_Results"
)
DELETE FROM "Assessment_Item_Results" AS item
USING ranked_items
WHERE item.assessment_item_result_id = ranked_items.assessment_item_result_id
  AND ranked_items.attempt_number > 1;

CREATE UNIQUE INDEX "Assessment_Item_Results_assessment_result_id_question_id_key"
ON "Assessment_Item_Results"("assessment_result_id", "question_id");

WITH item_scores AS (
  SELECT
    item.assessment_result_id,
    category.category_id,
    SUM(
      CASE
        WHEN item.is_correct THEN GREATEST(COALESCE(difficulty.difficulty_level, 1), 1)
        ELSE 0
      END
    )::DECIMAL(5, 2) AS total_score,
    SUM(GREATEST(COALESCE(difficulty.difficulty_level, 1), 1))::DECIMAL(5, 2) AS max_score
  FROM "Assessment_Item_Results" AS item
  JOIN "Assessment_Results" AS assessment
    ON assessment.assessment_result_id = item.assessment_result_id
  JOIN "Questions" AS question
    ON question.question_id = item.question_id
  JOIN "Training_Sets" AS training_set
    ON training_set.set_id = assessment.set_id
  LEFT JOIN "Difficulty_Levels" AS difficulty
    ON difficulty.difficulty_id = training_set.difficulty_id
  JOIN "Categories" AS category
    ON (
      UPPER(question.question_type::TEXT) = 'NAMING'
      AND REGEXP_REPLACE(LOWER(category.category_name), '[^a-z0-9]', '', 'g') = 'naming'
    ) OR (
      UPPER(question.question_type::TEXT) IN ('COMPREHENSION', 'COMPREHENSION_IMAGE')
      AND REGEXP_REPLACE(LOWER(category.category_name), '[^a-z0-9]', '', 'g')
        IN ('comprehension', 'imagecomprehension', 'comprehensionimage')
    ) OR (
      UPPER(question.question_type::TEXT) = 'REPETITION'
      AND REGEXP_REPLACE(LOWER(category.category_name), '[^a-z0-9]', '', 'g') = 'repetition'
    ) OR (
      UPPER(question.question_type::TEXT) = 'SPONTANEOUS'
      AND REGEXP_REPLACE(LOWER(category.category_name), '[^a-z0-9]', '', 'g') = 'spontaneous'
    )
  GROUP BY item.assessment_result_id, category.category_id
),
category_totals AS (
  SELECT
    category_result.assessment_category_result_id,
    COALESCE(item_scores.total_score, 0)::DECIMAL(5, 2) AS total_score,
    COALESCE(item_scores.max_score, 0)::DECIMAL(5, 2) AS max_score
  FROM "Assessment_Category_Results" AS category_result
  LEFT JOIN item_scores
    ON item_scores.assessment_result_id = category_result.assessment_result_id
   AND item_scores.category_id = category_result.category_id
)
UPDATE "Assessment_Category_Results" AS category_result
SET
  total_score = category_totals.total_score,
  max_score = category_totals.max_score
FROM category_totals
WHERE category_result.assessment_category_result_id =
      category_totals.assessment_category_result_id;
