import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      atRiskContacts,
      contactsWithEmails,
      upcomingMeetingsRaw,
      totalContacts,
      atRiskCount,
      interactionsLast7Days,
      latestBrief,
      lastInteraction,
    ] = await Promise.all([
      // 1. At-risk contacts sorted by score ascending (worst first)
      prisma.contact.findMany({
        where: { userId, riskLabel: "At Risk" },
        orderBy: { score: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          score: true,
          riskLabel: true,
          lastInteractionAt: true,
        },
      }),

      // 2. All contacts with recent email interactions for outbound-pending detection
      prisma.contact.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          email: true,
          score: true,
          riskLabel: true,
          interactions: {
            where: { type: { in: ["EMAIL_IN", "EMAIL_OUT"] } },
            orderBy: { timestamp: "desc" },
            take: 5,
            select: { type: true, timestamp: true },
          },
        },
      }),

      // 3. Upcoming meetings in the next 7 days
      prisma.interaction.findMany({
        where: {
          userId,
          type: "MEETING",
          timestamp: { gte: now, lte: sevenDaysFromNow },
        },
        select: {
          id: true,
          subject: true,
          timestamp: true,
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              riskLabel: true,
            },
          },
        },
        orderBy: { timestamp: "asc" },
      }),

      // 4. Total contacts
      prisma.contact.count({ where: { userId } }),

      // 5. At-risk count
      prisma.contact.count({ where: { userId, riskLabel: "At Risk" } }),

      // 6. Interactions in last 7 days
      prisma.interaction.count({
        where: { userId, timestamp: { gte: sevenDaysAgo } },
      }),

      // 7. Latest brief
      prisma.brief.findFirst({
        where: { userId },
        orderBy: { generatedAt: "desc" },
        select: { id: true, content: true, generatedAt: true },
      }),

      // 8. Last sync proxy: most recent interaction timestamp
      prisma.interaction.findFirst({
        where: { userId },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
    ]);

    // Compute outbound-pending contacts — show all regardless of risk label
    const outboundPendingContacts = contactsWithEmails
      .filter((c) => {
        const emails = c.interactions;
        if (!emails.length) return false;
        // Most recent email interaction must be EMAIL_OUT with no newer EMAIL_IN
        return emails[0].type === "EMAIL_OUT";
      })
      .map((c) => {
        const lastOut = c.interactions[0];
        const daysPending = Math.floor(
          (now.getTime() - new Date(lastOut.timestamp).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          score: c.score,
          riskLabel: c.riskLabel,
          lastOutboundAt: new Date(lastOut.timestamp).toISOString(),
          daysPending,
        };
      })
      .sort((a, b) => b.daysPending - a.daysPending)
      .slice(0, 5);

    // Group meetings by subject+timestamp to collect attendees
    const meetingMap = new Map<
      string,
      {
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
    >();

    for (const m of upcomingMeetingsRaw) {
      const key = `${m.subject}|${m.timestamp.toISOString()}`;
      const attendee = {
        contactId: m.contact.id,
        name: m.contact.name,
        email: m.contact.email,
        riskLabel: m.contact.riskLabel,
      };
      if (meetingMap.has(key)) {
        meetingMap.get(key)!.attendees.push(attendee);
      } else {
        meetingMap.set(key, {
          id: m.id,
          subject: m.subject,
          timestamp: m.timestamp.toISOString(),
          attendees: [attendee],
        });
      }
    }

    const upcomingMeetings = Array.from(meetingMap.values()).slice(0, 5);

    return NextResponse.json({
      lastSyncAt: lastInteraction?.timestamp.toISOString() ?? null,
      atRiskContacts: atRiskContacts.map((c) => ({
        ...c,
        lastInteractionAt: c.lastInteractionAt?.toISOString() ?? null,
      })),
      outboundPendingContacts,
      upcomingMeetings,
      quickStats: {
        totalContacts,
        atRiskCount,
        outboundPendingCount: outboundPendingContacts.length,
        interactionsLast7Days,
      },
      latestBrief: latestBrief
        ? {
            id: latestBrief.id,
            content: latestBrief.content,
            generatedAt: latestBrief.generatedAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    console.error("[dashboard API]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
