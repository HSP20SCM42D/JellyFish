"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/RiskBadge";
import { Mail, Clock } from "lucide-react";

interface Contact {
  id: string;
  email: string;
  name: string | null;
  score: number;
  riskLabel: string;
  lastInteractionAt: Date | null;
}

const FILTERS = ["All", "At Risk", "Warm", "Active"] as const;

const riskAccent: Record<string, string> = {
  "At Risk": "border-red-500/30 hover:border-red-500/60",
  Warm: "border-amber-500/30 hover:border-amber-500/60",
  Active: "border-emerald-500/30 hover:border-emerald-500/60",
};

const avatarAccent: Record<string, string> = {
  "At Risk": "bg-red-500/20 text-red-400",
  Warm: "bg-amber-500/20 text-amber-400",
  Active: "bg-emerald-500/20 text-emerald-400",
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatLastSeen(date: Date | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PeopleTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("All");

  const filtered =
    filter === "All" ? contacts : contacts.filter((c) => c.riskLabel === filter);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          {FILTERS.map((f) => (
            <TabsTrigger
              key={f}
              value={f}
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
            >
              {f}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-500">
            {filter === "All"
              ? "No contacts yet. Sync your data to get started."
              : `No ${filter} contacts.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/people/${c.id}`)}
              className={`
                bg-zinc-900 border rounded-xl p-4 cursor-pointer
                transition-all duration-150 hover:bg-zinc-800/70 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30
                ${riskAccent[c.riskLabel] ?? "border-zinc-800 hover:border-zinc-600"}
              `}
            >
              {/* Avatar + badge row */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarAccent[c.riskLabel] ?? "bg-zinc-700 text-zinc-300"}`}
                >
                  {getInitials(c.name, c.email)}
                </div>
                <RiskBadge label={c.riskLabel} score={c.score} />
              </div>

              {/* Name */}
              <p className="text-white font-semibold text-sm leading-tight truncate">
                {c.name || c.email}
              </p>

              {/* Email */}
              <div className="flex items-center gap-1.5 mt-1">
                <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                <p className="text-zinc-500 text-xs truncate">{c.email}</p>
              </div>

              {/* Last seen */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800">
                <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                <span className="text-zinc-500 text-xs">
                  {formatLastSeen(c.lastInteractionAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
