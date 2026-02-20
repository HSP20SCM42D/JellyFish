import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";

export async function recomputeScores(userId: string): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      interactions: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const contact of contacts) {
    const last = contact.lastInteractionAt ?? contact.createdAt;
    const daysSince = Math.floor(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );

    const recent = contact.interactions.filter(
      (i) => i.timestamp >= thirtyDaysAgo
    );
    const meetingCountLast30 = recent.filter((i) => i.type === "MEETING").length;
    const emailCountLast30 = recent.filter(
      (i) => i.type === "EMAIL_IN" || i.type === "EMAIL_OUT"
    ).length;

    // outboundPending: most recent email was EMAIL_OUT with no newer EMAIL_IN
    const recentEmails = contact.interactions.filter(
      (i) => i.type === "EMAIL_IN" || i.type === "EMAIL_OUT"
    );
    const lastEmail = recentEmails[0] ?? null;
    const outboundPending = lastEmail?.type === "EMAIL_OUT";

    const { score, riskLabel } = computeScore({
      daysSinceLastInteraction: daysSince,
      outboundPending,
      meetingCountLast30,
      emailCountLast30,
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { score, riskLabel },
    });
  }
}
