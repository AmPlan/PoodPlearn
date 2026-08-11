/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
type QuestionWithVariants = {
  namingQuestions: any[];
  comprehensionImageQuestions: any[];
  ComprehensionQuestion: any[];
  repetitionQuestions: any[];
  spontaneousQuestions: any[];
};

/**
 * Each question row has exactly one populated "variant" relation depending on
 * its questionType. This flattens that polymorphic shape into a single
 * discriminated object the client can render directly.
 */
export function getQuestionDetail(question: QuestionWithVariants) {
  const [naming] = question.namingQuestions ?? [];
  if (naming) {
    return {
      type: 'NAMING' as const,
      correctAnswer: naming.correctAnswer,
      correctAnswerVoiceUrl: naming.correctAnswerVoiceUrl,
      imageUrl: naming.imageUrl,
      hint1Text: naming.hint1Text,
      hint1VoiceUrl: naming.hint1VoiceUrl,
      hint2Text: naming.hint2Text,
      hint2VoiceUrl: naming.hint2VoiceUrl,
    };
  }

  const [comprehensionImage] = question.comprehensionImageQuestions ?? [];
  if (comprehensionImage) {
    return {
      type: 'COMPREHENSION_IMAGE' as const,
      questionText: comprehensionImage.questionText,
      questionVoiceUrl: comprehensionImage.questionVoiceUrl,
      correctImageUrl: comprehensionImage.correctImageUrl,
      wrongImageUrl1: comprehensionImage.wrongImageUrl1,
      wrongImageUrl2: comprehensionImage.wrongImageUrl2,
    };
  }

  const [comprehension] = question.ComprehensionQuestion ?? [];
  if (comprehension) {
    return {
      type: 'COMPREHENSION' as const,
      questionText: comprehension.questionText,
      questionVoiceUrl: comprehension.questionVoiceUrl,
      correctAnswer: comprehension.correctAnswer,
      customCondition: comprehension.customCondition,
    };
  }

  const [repetition] = question.repetitionQuestions ?? [];
  if (repetition) {
    return {
      type: 'REPETITION' as const,
      text: repetition.text,
      textVoiceUrl: repetition.textVoiceUrl,
    };
  }

  const [spontaneous] = question.spontaneousQuestions ?? [];
  if (spontaneous) {
    return {
      type: 'SPONTANEOUS' as const,
      questionText: spontaneous.questionText,
      questionVoiceUrl: spontaneous.questionVoiceUrl,
      correctAnswer: spontaneous.correctAnswer,
      correctAnswerVoiceUrl: spontaneous.correctAnswerVoiceUrl,
      customCondition: spontaneous.customCondition,
    };
  }

  return null;
}