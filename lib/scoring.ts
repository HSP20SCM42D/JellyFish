import { ScoringParams, RiskLabel } from "@/lib/types";

export function computeScore(params: ScoringParams): {
  score: number;
  riskLabel: RiskLabel;
} {
  let score = 100;
  score -= params.daysSinceLastInteraction * 2;
  score -= params.outboundPending ? 15 : 0;
  score += params.meetingCountLast30 * 8;
  score += params.emailCountLast30 * 2;
  score = Math.max(0, Math.min(100, score));

  let riskLabel: RiskLabel;
  if (score >= 70) riskLabel = "Active";
  else if (score >= 40) riskLabel = "Warm";
  else riskLabel = "At Risk";

  return { score, riskLabel };
}
