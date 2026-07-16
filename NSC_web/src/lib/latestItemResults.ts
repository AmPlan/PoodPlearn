export function keepLatestItemsByQuestionId<T>(
  items: T[],
  getQuestionId: (item: T) => number,
  getOrderValue: (item: T) => number
) {
  const latestByQuestionId = new Map<number, T>();

  for (const item of items) {
    const questionId = getQuestionId(item);
    const currentItem = latestByQuestionId.get(questionId);

    if (!currentItem || getOrderValue(item) > getOrderValue(currentItem)) {
      latestByQuestionId.set(questionId, item);
    }
  }

  return [...latestByQuestionId.values()];
}