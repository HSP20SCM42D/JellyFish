"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/RiskBadge";

interface Contact {
  id: string;
  email: string;
  name: string | null;
  score: number;
  riskLabel: string;
  lastInteractionAt: Date | null;
}

const FILTERS = ["All", "At Risk", "Warm", "Active"] as const;

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Score</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden md:table-cell">Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/people/${c.id}`)}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {c.name || c.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">
                    {c.email}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge label={c.riskLabel} score={c.score} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                    {c.lastInteractionAt
                      ? new Date(c.lastInteractionAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
