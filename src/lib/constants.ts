// src/lib/constants.ts

export const costImpactOptions = [
  "Negative",
  "$0-$50K",
  "$50K-$100K",
  "$100K-$250K",
  "$250K-$500K",
  "$500K-$1M",
  "$1M+",
];

export const feasibilityOptions = [
  "Very Easy To do",
  "Manageable",
  "Achievable with Effort",
  "Challenging",
  "Very Challenging",
];

// A mapping from the cost impact option string to a representative monetary value for calculations.
export const costImpactToMonetaryValue: { [key: string]: number } = {
  Negative: 0,
  "$0-$50K": 25000,
  "$50K-$100K": 75000,
  "$100K-$250K": 175000,
  "$250K-$500K": 375000,
  "$500K-$1M": 750000,
  "$1M+": 1500000,
};

/**
 * Determines the evaluation category ('green', 'yellow', 'red') based on impact and feasibility scores.
 * The logic is dynamic and based on the length of the options arrays.
 * @param impact The impact score string from costImpactOptions.
 * @param feasibility The feasibility score string from feasibilityOptions.
 * @returns The category string ('green', 'yellow', 'red', or 'none').
 */
export const getEvaluationCategory = (
  impact: string,
  feasibility: string
): "green" | "yellow" | "red" | "none" => {
  const impactIndex = costImpactOptions.indexOf(impact);
  // For feasibility, a lower index is better.
  const feasibilityIndex = feasibilityOptions.indexOf(feasibility);

  if (impactIndex === -1 || feasibilityIndex === -1) {
    return "none";
  }

  // A score is considered "high" if it's in the better half of the scale.
  const isHighImpact = impactIndex >= Math.floor(costImpactOptions.length / 2);
  const isHighFeasibility =
    feasibilityIndex < Math.ceil(feasibilityOptions.length / 2);

  if (isHighImpact && isHighFeasibility) return "green";
  if (isHighImpact || isHighFeasibility) return "yellow";
  return "red";
};
