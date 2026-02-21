"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/RiskBadge";
import { DraftSheet } from "@/components/draft-sheet";
import { toast } from "sonner";
import { trackEvent } from "@/lib/telemetry";
import {
  AlertTriangle,
  Clock,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface AtRiskContact {
  id: string;
  name: string | null;
  email: string;
  score: number;
  riskLabel: string;
  lastInteractionAt: string | null;
}

interface OutboundContact {
  id: string;
  name: string | null;
  email: string;
  score: number;
  riskLabel: string;
  lastOutboundAt: string;
  daysPending: number;
}

interface Meeting {
  id: string;
  subject: string | null;
  timestamp: string;
  attendees: {
    contactId: string;
    name: string | null;
    email: string;
    riskLabel: string;
  }[];
}

interface QuickStats {
  totalContacts: number;
  atRiskCount: number;
  outboundPendingCount: number;
  interactionsLast7Days: number;
}

interface Brief {
  id: string;
  content: string;
  generatedAt: string;
}

interface DashboardData {
  lastSyncAt: string | null;
  atRiskContacts: AtRiskContact[];
  outboundPendingContacts: OutboundContact[];
  upcomingMeetings: Meeting[];
  quickStats: QuickStats;
  latestBrief: Brief | null;
}

interface DraftContact {
  id: string;
  name: string | null;
  email: string;
  score: number;
  riskLabel: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const diffDays = Math.floor(
    (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMeetingTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) + ` at ${time}`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-20 bg-zinc-800" />
        <Skeleton className="h-4 w-48 bg-zinc-800 mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
              <Skeleton className="h-4 w-40 bg-zinc-800" />
              {[1, 2, 3].map((r) => (
                <Skeleton key={r} className="h-14 w-full bg-zinc-800 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-28 bg-zinc-800" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-16 bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-28 bg-zinc-800" />
            <Skeleton className="h-4 w-full bg-zinc-800" />
            <Skeleton className="h-4 w-5/6 bg-zinc-800" />
            <Skeleton className="h-4 w-4/6 bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [draftContact, setDraftContact] = useState<DraftContact | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoadingData(true);
    setFetchError(false);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json: DashboardData = await res.json();
      setData(json);
      setBrief(json.latestBrief);
      trackEvent("dashboard.view");
    } catch {
      setFetchError(true);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  function openDraft(contact: DraftContact) {
    trackEvent("dashboard.draft.clicked", { contactId: contact.id });
    setDraftContact(contact);
  }

  async function generateBrief() {
    setGeneratingBrief(true);
    trackEvent("dashboard.brief.generated");
    try {
      const res = await fetch("/api/brief", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate brief");
      setBrief(json);
      toast.success("Brief generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setGeneratingBrief(false);
    }
  }

  if (loadingData) return <DashboardSkeleton />;

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-zinc-400 text-sm">Something went wrong. Refresh to try again.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchDashboard}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw size={14} className="mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const hasNoData = data.quickStats.totalContacts === 0;

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <p className="text-lg font-semibold text-white">Welcome to Jellyfish</p>
        <p className="text-zinc-400 text-sm">Sync your email to get started.</p>
        <Button
          onClick={() => router.push("/ingest")}
          className="bg-white text-zinc-950 hover:bg-zinc-200"
        >
          Sync Now
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Today</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">
            {/* Card A — At-Risk Relationships */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  <h2 className="text-lg font-semibold text-zinc-100">
                    At-Risk Relationships
                  </h2>
                </div>
                {data.atRiskContacts.length > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {data.atRiskContacts.length}
                  </span>
                )}
              </div>

              {data.atRiskContacts.length === 0 ? (
                <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  No at-risk contacts. Your relationships are healthy!
                </div>
              ) : (
                <ul className="space-y-2">
                  {data.atRiskContacts.map((c) => (
                    <li key={c.id}>
                      <div
                        className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/people/${c.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {c.name || c.email}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            Last contact: {formatRelativeDate(c.lastInteractionAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <RiskBadge label={c.riskLabel} score={c.score} />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDraft(c);
                            }}
                          >
                            Draft
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Card B — Outbound Pending */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Waiting for Reply
                  </h2>
                </div>
                {data.outboundPendingContacts.length > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                    {data.outboundPendingContacts.length}
                  </span>
                )}
              </div>

              {data.outboundPendingContacts.length === 0 ? (
                <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  No pending replies. You&apos;re all caught up!
                </div>
              ) : (
                <ul className="space-y-2">
                  {data.outboundPendingContacts.map((c) => (
                    <li key={c.id}>
                      <div
                        className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/people/${c.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {c.name || c.email}
                          </p>
                          <p className="text-xs text-zinc-500">
                            You emailed {c.daysPending === 0 ? "today" : `${c.daysPending} day${c.daysPending !== 1 ? "s" : ""} ago`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                            {c.daysPending}d
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDraft(c);
                            }}
                          >
                            Draft
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Card C — Upcoming Meetings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-zinc-400" />
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Upcoming Meetings
                  </h2>
                </div>
                {data.upcomingMeetings.length > 0 && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {data.upcomingMeetings.length}
                  </span>
                )}
              </div>

              {data.upcomingMeetings.length === 0 ? (
                <p className="text-zinc-500 text-sm py-2">
                  No meetings in the next 7 days.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.upcomingMeetings.map((m) => (
                    <li
                      key={m.id}
                      className="p-3 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (m.attendees[0]) {
                          trackEvent("dashboard.meeting.clicked", { meetingId: m.id });
                          router.push(`/people/${m.attendees[0].contactId}`);
                        }
                      }}
                    >
                      <p className="text-sm font-semibold text-white">
                        {m.subject || "Meeting"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {formatMeetingTime(m.timestamp)}
                      </p>
                      {m.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {m.attendees.slice(0, 2).map((a) => (
                            <Link
                              key={a.contactId}
                              href={`/people/${a.contactId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full transition-colors"
                            >
                              {a.riskLabel === "At Risk" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                              )}
                              {a.name || a.email}
                            </Link>
                          ))}
                          {m.attendees.length > 2 && (
                            <span className="text-xs text-zinc-500">
                              +{m.attendees.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">
            {/* Card D — Quick Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">
                Overview
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-2xl font-bold text-white">
                    {data.quickStats.totalContacts}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Total Contacts</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-400">
                    {data.quickStats.atRiskCount}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">At Risk</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-2xl font-bold text-amber-400">
                    {data.quickStats.outboundPendingCount}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Awaiting Reply</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-400">
                    {data.quickStats.interactionsLast7Days}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Activity (7d)</p>
                </div>
              </div>
              {data.lastSyncAt && (
                <p className="text-xs text-zinc-600 mt-3 flex items-center gap-1">
                  <Clock size={10} />
                  Last sync: {formatRelativeDate(data.lastSyncAt)}
                </p>
              )}
            </div>

            {/* Card E — Executive Brief */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Today&apos;s Brief
                  </h2>
                  {brief && (
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {new Date(brief.generatedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateBrief}
                  disabled={generatingBrief}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
                >
                  {generatingBrief ? (
                    "Generating..."
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={12} />
                      {brief ? "Refresh" : "Generate"}
                    </span>
                  )}
                </Button>
              </div>

              {generatingBrief ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-zinc-800" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-800" />
                  <Skeleton className="h-4 w-4/6 bg-zinc-800" />
                  <Skeleton className="h-4 w-full bg-zinc-800 mt-2" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                </div>
              ) : brief ? (
                <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {brief.content}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <AlertTriangle size={18} className="text-zinc-600" />
                  <p className="text-zinc-500 text-sm">
                    Generate your first daily brief
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global DraftSheet */}
      {draftContact && (
        <DraftSheet
          contactId={draftContact.id}
          contactName={draftContact.name}
          contactEmail={draftContact.email}
          contactScore={draftContact.score}
          contactRiskLabel={draftContact.riskLabel}
          open={!!draftContact}
          onOpenChange={(open) => {
            if (!open) setDraftContact(null);
          }}
        />
      )}
    </>
  );
}
