"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";

interface DraftSheetProps {
  contactId: string;
  contactName: string | null;
  contactEmail: string;
  contactScore: number;
  contactRiskLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Draft {
  subject: string;
  body: string;
}

export function DraftSheet({
  contactId,
  contactName,
  contactEmail,
  contactScore,
  contactRiskLabel,
  open,
  onOpenChange,
}: DraftSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-generate when opened
  useEffect(() => {
    if (open && !draft && !loading) {
      generateDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function generateDraft() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate draft");
      setDraft(data);
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate draft";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    trackEvent("dashboard.draft.regenerated", { contactId });
    setDraft(null);
    await generateDraft();
  }

  async function handleCopy() {
    const text = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
    trackEvent("dashboard.draft.copied", { contactId });
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      // Reset state when closing so next open auto-generates fresh
      setDraft(null);
      setSubject("");
      setBody("");
      setError(null);
    }
    onOpenChange(open);
  }

  const displayName = contactName || contactEmail;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[450px] sm:w-[450px] bg-zinc-900 border-zinc-800 flex flex-col gap-0 p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <SheetTitle className="text-white text-base font-semibold leading-tight">
            {displayName}
          </SheetTitle>
          <p className="text-zinc-400 text-xs">{contactEmail}</p>
          <div className="flex items-center gap-2 mt-2">
            <RiskBadge label={contactRiskLabel} score={contactScore} />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Follow-Up Draft
          </p>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full bg-zinc-800" />
              <Skeleton className="h-40 w-full bg-zinc-800" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-zinc-400 text-sm">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={generateDraft}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && draft && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
                  Body
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="bg-zinc-950 border-zinc-700 text-white text-sm resize-none focus:ring-zinc-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && draft && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white flex-1"
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <Check size={13} /> Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Copy size={13} /> Copy
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white flex-1"
            >
              <span className="flex items-center gap-1.5">
                <RefreshCw size={13} /> Regenerate
              </span>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
