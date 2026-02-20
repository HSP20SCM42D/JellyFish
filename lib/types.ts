export type RiskLabel = "Active" | "Warm" | "At Risk";
export type InteractionType = "EMAIL_IN" | "EMAIL_OUT" | "MEETING";

export interface ScoringParams {
  daysSinceLastInteraction: number;
  outboundPending: boolean;
  meetingCountLast30: number;
  emailCountLast30: number;
}
