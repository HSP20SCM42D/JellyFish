import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          googleAccessToken: account.access_token ?? undefined,
          googleRefreshToken: account.refresh_token ?? undefined,
          tokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : undefined,
        },
        create: {
          email: user.email,
          name: user.name ?? undefined,
          googleAccessToken: account.access_token ?? undefined,
          googleRefreshToken: account.refresh_token ?? undefined,
          tokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : undefined,
        },
      });

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
        }
      }
      return session;
    },
  },
});

/**
 * Refresh Google access token if expired. Returns a valid access token.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      tokenExpiry: true,
    },
  });

  if (!user?.googleAccessToken) {
    throw new Error("No access token found. Please sign in again.");
  }

  const isExpired =
    !user.tokenExpiry || new Date() >= new Date(user.tokenExpiry);

  if (!isExpired) {
    return user.googleAccessToken;
  }

  if (!user.googleRefreshToken) {
    throw new Error("No refresh token. Please sign in again.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: user.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token. Please sign in again.");
  }

  const data = await response.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: data.access_token,
      tokenExpiry: newExpiry,
    },
  });

  return data.access_token;
}
