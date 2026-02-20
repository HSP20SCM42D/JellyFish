import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ingestGmail } from "@/lib/gmail";
import { ingestCalendar } from "@/lib/calendar";
import { recomputeScores } from "@/lib/recomputeScores";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, email: userEmail } = session.user;

    const gmailResult = await ingestGmail(userId, userEmail);
    const calendarResult = await ingestCalendar(userId, userEmail);
    await recomputeScores(userId);

    return NextResponse.json({
      success: true,
      contactsProcessed: gmailResult.contactsUpserted + calendarResult.contactsUpserted,
      interactionsCreated: gmailResult.interactionsCreated + calendarResult.interactionsCreated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
