"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export default function IngestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    contactsProcessed: number;
    interactionsCreated: number;
    completedAt: string;
  } | null>(null);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setResult({
        contactsProcessed: data.contactsProcessed,
        interactionsCreated: data.interactionsCreated,
        completedAt: new Date().toLocaleString(),
      });
      toast.success("Sync complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Sync Data</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Pull your last 90 days of Gmail and Calendar activity.
      </p>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Gmail + Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400 text-sm">
            This will ingest emails and meetings from the past 90 days, create
            contact records, and compute relationship scores.
          </p>
          <Button
            onClick={handleSync}
            disabled={loading}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Syncing...
              </span>
            ) : (
              "Sync Last 90 Days"
            )}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-zinc-800 rounded-lg text-sm space-y-1">
              <p className="text-emerald-400 font-medium">Sync complete</p>
              <p className="text-zinc-300">
                Contacts processed: <span className="text-white font-medium">{result.contactsProcessed}</span>
              </p>
              <p className="text-zinc-300">
                Interactions created: <span className="text-white font-medium">{result.interactionsCreated}</span>
              </p>
              <p className="text-zinc-500 text-xs mt-2">Last synced: {result.completedAt}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
