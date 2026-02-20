import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { contactId } = body as { contactId: string };
    if (!contactId) {
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const recentInteractions = await prisma.interaction.findMany({
      where: { contactId },
      orderBy: { timestamp: "desc" },
      take: 5,
    });

    const lastMeeting = await prisma.interaction.findFirst({
      where: { contactId, type: "MEETING" },
      orderBy: { timestamp: "desc" },
    });

    const interactionText = recentInteractions
      .map(
        (i) =>
          `- [${i.type}] ${i.timestamp.toDateString()}: ${i.subject || "(no subject)"} ${i.snippet ? `— "${i.snippet.slice(0, 100)}"` : ""}`
      )
      .join("\n");

    const prompt = `You are drafting a professional follow-up email on behalf of an executive.

CONTACT: ${contact.name || contact.email} (${contact.email})
RELATIONSHIP STATUS: ${contact.riskLabel} (Score: ${contact.score}/100)

RECENT INTERACTION HISTORY:
${interactionText || "No recent interactions"}

${lastMeeting ? `LAST MEETING: ${lastMeeting.subject} on ${lastMeeting.timestamp.toDateString()}` : ""}

Write a follow-up email with:
- Subject line
- Email body

The tone should be warm but professional. Reference specific past interactions where relevant. Include a clear call to action. Keep it concise (under 150 words for the body).

Return as JSON only: { "subject": "...", "body": "..." }`;

    const raw = await generateContent(prompt);

    let parsed: { subject: string; body: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const draft = await prisma.followUpDraft.create({
      data: {
        userId,
        contactId,
        subject: parsed.subject,
        body: parsed.body,
      },
    });

    return NextResponse.json({ subject: draft.subject, body: draft.body, id: draft.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
