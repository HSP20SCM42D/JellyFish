import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/gemini";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const atRiskContacts = await prisma.contact.findMany({
      where: { userId },
      orderBy: { score: "asc" },
      take: 5,
      select: { name: true, email: true, score: true, lastInteractionAt: true, riskLabel: true },
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingMeetings = await prisma.interaction.findMany({
      where: {
        userId,
        type: "MEETING",
        timestamp: { gte: now, lte: sevenDaysFromNow },
      },
      include: { contact: { select: { name: true, email: true } } },
      orderBy: { timestamp: "asc" },
      take: 10,
    });

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const highActivityRaw = await prisma.interaction.groupBy({
      by: ["contactId"],
      where: { userId, timestamp: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });
    const highActivityContactIds = highActivityRaw.map((r) => r.contactId);
    const highActivityContacts = await prisma.contact.findMany({
      where: { id: { in: highActivityContactIds } },
      select: { name: true, email: true, score: true },
    });

    const atRiskText = atRiskContacts
      .map(
        (c) =>
          `- ${c.name || c.email} (${c.email}): Score ${c.score}/100, ${c.riskLabel}, last contact: ${c.lastInteractionAt ? c.lastInteractionAt.toDateString() : "unknown"}`
      )
      .join("\n");

    const meetingsText = upcomingMeetings
      .map(
        (m) =>
          `- ${m.subject || "Meeting"} with ${m.contact.name || m.contact.email} on ${m.timestamp.toDateString()}`
      )
      .join("\n");

    const highActivityText = highActivityContacts
      .map((c) => `- ${c.name || c.email} (score: ${c.score}/100)`)
      .join("\n");

    const prompt = `You are an executive relationship advisor. Based on the following data about the executive's professional network, generate a concise daily briefing.

AT-RISK RELATIONSHIPS:
${atRiskText || "None identified"}

UPCOMING MEETINGS (next 7 days):
${meetingsText || "No meetings scheduled"}

HIGH-ACTIVITY CONTACTS:
${highActivityText || "None"}

Generate a briefing with:
1. A 2-3 sentence executive summary of relationship health
2. Top 3-5 specific action items (reference real names and context)
3. Key focus areas for the week

Be specific, reference names, and keep it actionable. Use a professional, concise tone.`;

    const content = await generateContent(prompt);

    const brief = await prisma.brief.create({
      data: { userId, content },
    });

    return NextResponse.json({ content: brief.content, generatedAt: brief.generatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const brief = await prisma.brief.findFirst({
      where: { userId: session.user.id },
      orderBy: { generatedAt: "desc" },
    });
    return NextResponse.json(brief ?? null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
