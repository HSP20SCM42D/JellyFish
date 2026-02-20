import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/auth";

function parseEmailAddress(header: string): { name: string; email: string } {
  const match = header.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].toLowerCase() };
  }
  return { name: "", email: header.toLowerCase().trim() };
}

function getHeader(
  headers: { name?: string | null; value?: string | null }[],
  name: string
): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function ingestGmail(
  userId: string,
  userEmail: string
): Promise<{ contactsUpserted: number; interactionsCreated: number }> {
  const accessToken = await getValidAccessToken(userId);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const daysAgo = 90;
  const after = new Date();
  after.setDate(after.getDate() - daysAgo);
  const afterStr = `${after.getFullYear()}/${String(after.getMonth() + 1).padStart(2, "0")}/${String(after.getDate()).padStart(2, "0")}`;

  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `after:${afterStr}`,
      maxResults: 500,
      pageToken,
    });
    const msgs = res.data.messages ?? [];
    messageIds.push(...msgs.map((m) => m.id!).filter(Boolean));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  let contactsUpserted = 0;
  let interactionsCreated = 0;

  // Process in chunks of 50
  for (let i = 0; i < messageIds.length; i += 50) {
    const chunk = messageIds.slice(i, i + 50);

    await Promise.all(
      chunk.map(async (msgId) => {
        try {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: msgId,
            format: "metadata",
            metadataHeaders: ["From", "To", "Subject", "Date"],
          });

          const headers = msg.data.payload?.headers ?? [];
          const from = getHeader(headers, "From");
          const to = getHeader(headers, "To");
          const subject = getHeader(headers, "Subject");
          const dateStr = getHeader(headers, "Date");
          const snippet = msg.data.snippet ?? "";
          const threadId = msg.data.threadId ?? undefined;

          const timestamp = dateStr ? new Date(dateStr) : new Date();
          if (isNaN(timestamp.getTime())) return;

          const fromParsed = parseEmailAddress(from);
          const isOutbound =
            fromParsed.email === userEmail.toLowerCase();

          const contactEmail = isOutbound
            ? parseEmailAddress(to.split(",")[0]).email
            : fromParsed.email;

          if (!contactEmail || contactEmail === userEmail.toLowerCase()) return;

          const contactName = isOutbound
            ? parseEmailAddress(to.split(",")[0]).name
            : fromParsed.name;

          const contact = await prisma.contact.upsert({
            where: { userId_email: { userId, email: contactEmail } },
            update: {
              name: contactName || undefined,
              lastInteractionAt: timestamp,
            },
            create: {
              userId,
              email: contactEmail,
              name: contactName || undefined,
              lastInteractionAt: timestamp,
            },
          });
          contactsUpserted++;

          // Check for existing interaction by threadId + timestamp to avoid duplicates
          const existing = await prisma.interaction.findFirst({
            where: {
              contactId: contact.id,
              threadId: threadId ?? null,
              timestamp,
            },
          });
          if (existing) return;

          await prisma.interaction.create({
            data: {
              userId,
              contactId: contact.id,
              type: isOutbound ? "EMAIL_OUT" : "EMAIL_IN",
              subject: subject || undefined,
              snippet: snippet || undefined,
              timestamp,
              threadId: threadId ?? undefined,
            },
          });
          interactionsCreated++;
        } catch {
          // Skip individual message errors
        }
      })
    );

    // Small delay between batches to avoid rate limits
    if (i + 50 < messageIds.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { contactsUpserted, interactionsCreated };
}
