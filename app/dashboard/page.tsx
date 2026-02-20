import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BriefCard } from "@/components/BriefCard";
import { RiskBadge } from "@/components/RiskBadge";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const atRiskContacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { score: "asc" },
    take: 5,
  });

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingMeetings = await prisma.interaction.findMany({
    where: {
      userId,
      type: "MEETING",
      timestamp: { gte: now, lte: sevenDaysFromNow },
    },
    include: { contact: true },
    orderBy: { timestamp: "asc" },
    take: 10,
  });

  const latestBrief = await prisma.brief.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
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

      <BriefCard initialBrief={latestBrief} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At-Risk Contacts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            At-Risk Contacts
          </h2>
          {atRiskContacts.length === 0 ? (
            <p className="text-zinc-500 text-sm">No contacts yet. Sync your data first.</p>
          ) : (
            <ul className="space-y-3">
              {atRiskContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/people/${c.id}`}
                    className="flex items-center justify-between hover:bg-zinc-800 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {c.name || c.email}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{c.email}</p>
                    </div>
                    <RiskBadge label={c.riskLabel} score={c.score} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Upcoming Meetings
          </h2>
          {upcomingMeetings.length === 0 ? (
            <p className="text-zinc-500 text-sm">No meetings in the next 7 days.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingMeetings.map((m) => (
                <li key={m.id} className="flex items-start gap-3">
                  <span className="text-lg">📅</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium">{m.subject || "Meeting"}</p>
                    <p className="text-xs text-zinc-400">
                      {m.timestamp.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <Link
                      href={`/people/${m.contactId}`}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {m.contact.name || m.contact.email}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
