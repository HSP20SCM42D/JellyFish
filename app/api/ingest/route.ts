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

    let calendarResult = { contactsUpserted: 0, interactionsCreated: 0 };
    let calendarError: string | null = null;
    try {
      calendarResult = await ingestCalendar(userId, userEmail);
    } catch (err) {
      calendarError = err instanceof Error ? err.message : "Calendar sync failed";
      console.error("[ingest] Calendar error:", calendarError);
    }

    await recomputeScores(userId);

    return NextResponse.json({
      success: true,
      gmail: {
        contactsProcessed: gmailResult.contactsUpserted,
        interactionsCreated: gmailResult.interactionsCreated,
      },
      calendar: {
        contactsProcessed: calendarResult.contactsUpserted,
        meetingsCreated: calendarResult.interactionsCreated,
        error: calendarError,
      },
      // keep legacy fields so existing UI doesn't break
      contactsProcessed: gmailResult.contactsUpserted + calendarResult.contactsUpserted,
      interactionsCreated: gmailResult.interactionsCreated + calendarResult.interactionsCreated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("sign in") || message.includes("Unauthorized")
      ? 401
      : message.includes("not enabled") || message.includes("access denied")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
