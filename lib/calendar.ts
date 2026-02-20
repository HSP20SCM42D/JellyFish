import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/auth";

export async function ingestCalendar(
  userId: string,
  userEmail: string
): Promise<{ contactsUpserted: number; interactionsCreated: number }> {
  const accessToken = await getValidAccessToken(userId);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 90);

  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  let contactsUpserted = 0;
  let interactionsCreated = 0;
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 250,
      singleEvents: true,
      pageToken,
    });

    const events = res.data.items ?? [];
    pageToken = res.data.nextPageToken ?? undefined;

    for (const event of events) {
      const attendees = event.attendees ?? [];
      if (attendees.length === 0) continue;

      const startStr =
        event.start?.dateTime ?? event.start?.date ?? null;
      if (!startStr) continue;
      const timestamp = new Date(startStr);
      if (isNaN(timestamp.getTime())) continue;

      for (const attendee of attendees) {
        const email = attendee.email?.toLowerCase();
        if (!email || email === userEmail.toLowerCase()) continue;

        const contact = await prisma.contact.upsert({
          where: { userId_email: { userId, email } },
          update: {
            name: attendee.displayName || undefined,
            lastInteractionAt: timestamp > new Date() ? undefined : timestamp,
          },
          create: {
            userId,
            email,
            name: attendee.displayName || undefined,
            lastInteractionAt: timestamp > new Date() ? undefined : timestamp,
          },
        });
        contactsUpserted++;

        const existing = await prisma.interaction.findFirst({
          where: {
            contactId: contact.id,
            type: "MEETING",
            timestamp,
            subject: event.summary ?? null,
          },
        });
        if (existing) continue;

        await prisma.interaction.create({
          data: {
            userId,
            contactId: contact.id,
            type: "MEETING",
            subject: event.summary || "Meeting",
            timestamp,
          },
        });
        interactionsCreated++;
      }
    }
  } while (pageToken);

  return { contactsUpserted, interactionsCreated };
}
