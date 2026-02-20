"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Copy, Check } from "lucide-react";

export function DraftSection({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateDraft() {
    setLoading(true);
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
      toast.success("Draft generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    const text = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Follow-Up Draft
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={generateDraft}
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
        >
          {loading ? (
            "Generating..."
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              {draft ? "Regenerate" : "Generate Follow-Up Draft"}
            </span>
          )}
        </Button>
      </div>

      {loading && (
        <div className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <Skeleton className="h-4 w-3/4 bg-zinc-800" />
          <Skeleton className="h-24 w-full bg-zinc-800" />
        </div>
      )}

      {!loading && draft && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">
              Body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="bg-zinc-800 border-zinc-700 text-white text-sm resize-none focus:ring-zinc-600"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={copyToClipboard}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
          >
            {copied ? (
              <span className="flex items-center gap-1.5">
                <Check size={12} /> Copied!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Copy size={12} /> Copy to Clipboard
              </span>
            )}
          </Button>
        </div>
      )}

      {!loading && !draft && (
        <p className="text-zinc-500 text-sm">
          Click &quot;Generate Follow-Up Draft&quot; to create a personalized email for{" "}
          {contactName}.
        </p>
      )}
    </div>
  );
}
