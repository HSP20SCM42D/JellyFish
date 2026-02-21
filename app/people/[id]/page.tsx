import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { RiskBadge } from "@/components/RiskBadge";
import { PersonDraftButton } from "@/components/PersonDraftButton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = session.user.id;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [contact, emailCount30d, meetingCount30d] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, userId },
      include: {
        interactions: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
      },
    }),
    prisma.interaction.count({
      where: {
        contactId: id,
        userId,
        type: { in: ["EMAIL_IN", "EMAIL_OUT"] },
        timestamp: { gte: thirtyDaysAgo },
      },
    }),
    prisma.interaction.count({
      where: {
        contactId: id,
        userId,
        type: "MEETING",
        timestamp: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  if (!contact) notFound();

  const daysSinceLast = contact.lastInteractionAt
    ? Math.floor(
        (Date.now() - new Date(contact.lastInteractionAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> People
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {contact.name || contact.email}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">{contact.email}</p>
          </div>
          <div className="flex-shrink-0">
            <RiskBadge label={contact.riskLabel} score={contact.score} />
          </div>
        </div>

        {/* Score context */}
        <p className="text-zinc-500 text-xs mt-2">
          {daysSinceLast !== null
            ? `Last contact: ${daysSinceLast === 0 ? "today" : `${daysSinceLast} day${daysSinceLast !== 1 ? "s" : ""} ago`}`
            : "No interactions yet"}
          {" · "}
          {emailCount30d} email{emailCount30d !== 1 ? "s" : ""} / {meetingCount30d} meeting
          {meetingCount30d !== 1 ? "s" : ""} (30d)
        </p>
      </div>

      {/* Follow-Up Draft */}
      <PersonDraftButton
        contactId={contact.id}
        contactName={contact.name}
        contactEmail={contact.email}
        contactScore={contact.score}
        contactRiskLabel={contact.riskLabel}
      />

      {/* Interaction Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Interaction History
        </h2>
        {contact.interactions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No interactions yet.</p>
        ) : (
          <ul className="space-y-3">
            {contact.interactions.map((i) => (
              <li
                key={i.id}
                className="flex gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <span className="text-lg flex-shrink-0">
                  {i.type === "MEETING" ? "📅" : "📧"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">
                      {i.subject || "(no subject)"}
                    </span>
                    {i.type !== "MEETING" && (
                      <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                        {i.type === "EMAIL_IN" ? "received" : "sent"}
                      </span>
                    )}
                  </div>
                  {i.snippet && (
                    <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{i.snippet}</p>
                  )}
                  <p className="text-zinc-600 text-xs mt-1">
                    {new Date(i.timestamp).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
