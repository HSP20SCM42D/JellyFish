import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Lightweight auth config for Edge middleware — no Prisma imports
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/login" || pathname.startsWith("/api/auth");
      if (isPublic) return true;
      return !!auth?.user;
    },
  },
};
