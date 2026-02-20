import { cn } from "@/lib/utils";

type RiskLabel = "Active" | "Warm" | "At Risk";

const styles: Record<RiskLabel, string> = {
  Active: "bg-emerald-500/20 text-emerald-400",
  Warm: "bg-amber-500/20 text-amber-400",
  "At Risk": "bg-red-500/20 text-red-400",
};

export function RiskBadge({ label, score }: { label: string; score?: number }) {
  const key = (label as RiskLabel) in styles ? (label as RiskLabel) : "Warm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        styles[key]
      )}
    >
      {score !== undefined && <span className="font-mono">{score}</span>}
      {label}
    </span>
  );
}
