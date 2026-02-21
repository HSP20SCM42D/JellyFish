"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export default function IngestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    gmail: { contactsProcessed: number; interactionsCreated: number };
    calendar: { contactsProcessed: number; meetingsCreated: number; error: string | null };
    completedAt: string;
  } | null>(null);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setResult({
        gmail: data.gmail,
        calendar: data.calendar,
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
            <div className="mt-4 p-4 bg-zinc-800 rounded-lg text-sm space-y-3">
              <p className="text-emerald-400 font-medium">Sync complete</p>

              {/* Gmail */}
              <div className="space-y-1">
                <p className="text-zinc-400 text-xs uppercase tracking-wider">Gmail</p>
                <p className="text-zinc-300">
                  Contacts: <span className="text-white font-medium">{result.gmail.contactsProcessed}</span>
                </p>
                <p className="text-zinc-300">
                  Emails: <span className="text-white font-medium">{result.gmail.interactionsCreated}</span>
                </p>
              </div>

              {/* Calendar */}
              <div className="space-y-1">
                <p className="text-zinc-400 text-xs uppercase tracking-wider">Calendar</p>
                {result.calendar.error ? (
                  <p className="text-red-400 text-xs">{result.calendar.error}</p>
                ) : (
                  <>
                    <p className="text-zinc-300">
                      Contacts: <span className="text-white font-medium">{result.calendar.contactsProcessed}</span>
                    </p>
                    <p className="text-zinc-300">
                      Meetings: <span className="text-white font-medium">{result.calendar.meetingsCreated}</span>
                    </p>
                    {result.calendar.meetingsCreated === 0 && (
                      <p className="text-amber-400 text-xs mt-1">
                        No meetings found. Upcoming Meetings only shows calendar events
                        that have other people invited (with email addresses).
                      </p>
                    )}
                  </>
                )}
              </div>

              <p className="text-zinc-500 text-xs pt-1 border-t border-zinc-700">
                Last synced: {result.completedAt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
