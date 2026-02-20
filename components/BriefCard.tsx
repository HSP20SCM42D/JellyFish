"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface Brief {
  content: string;
  generatedAt: Date | string;
}

export function BriefCard({ initialBrief }: { initialBrief: Brief | null }) {
  const [brief, setBrief] = useState<Brief | null>(initialBrief);
  const [loading, setLoading] = useState(false);

  async function generateBrief() {
    setLoading(true);
    try {
      const res = await fetch("/api/brief", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setBrief(data);
      toast.success("Brief generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Executive Brief
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={generateBrief}
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
        >
          {loading ? (
            "Generating..."
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} /> Generate Brief
            </span>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-zinc-800" />
            <Skeleton className="h-4 w-5/6 bg-zinc-800" />
            <Skeleton className="h-4 w-4/6 bg-zinc-800" />
          </div>
        ) : brief ? (
          <div className="space-y-1">
            <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
              {brief.content}
            </p>
            <p className="text-zinc-600 text-xs mt-3">
              Generated{" "}
              {new Date(brief.generatedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No brief yet. Click &quot;Generate Brief&quot; to create your daily executive summary.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
