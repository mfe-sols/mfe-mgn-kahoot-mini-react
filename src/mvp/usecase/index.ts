export const formatTitle = (title: string) => title.trim();

export const calculateMaxScore = (questionCount: number, pointsPerCorrect: number) =>
  questionCount * pointsPerCorrect;

export const calculateAccuracy = (correctCount: number, questionCount: number) =>
  questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);
