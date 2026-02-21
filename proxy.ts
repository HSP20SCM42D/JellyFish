import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { auth: session, nextUrl } = req;
  const isAuthenticated = !!session?.user;

  if (isAuthenticated && nextUrl.pathname === "/login") {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
