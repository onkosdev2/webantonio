export type EditorialQualityReviewPresentation = {
  approved: boolean;
  recommendations: string[];
  missingFigures: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function getEditorialQualityReview(
  sharedState: unknown
): EditorialQualityReviewPresentation | null {
  if (!isRecord(sharedState)) return null;
  const review = sharedState.editorial_quality_review;
  if (!isRecord(review)) return null;

  return {
    approved: review.approved === true,
    recommendations: stringArray(review.recommendations),
    missingFigures: stringArray(review.missing_figures)
  };
}
