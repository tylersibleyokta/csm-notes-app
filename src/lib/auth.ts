import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Okta from "next-auth/providers/okta";
import { prisma } from "@/lib/prisma";

const oktaConfigured =
  !!process.env.OKTA_ISSUER &&
  !!process.env.OKTA_CLIENT_ID &&
  !!process.env.OKTA_CLIENT_SECRET;

const providers: NextAuthConfig["providers"] = oktaConfigured
  ? [Okta({ issuer: process.env.OKTA_ISSUER })]
  : [
      Credentials({
        name: "Dev login",
        credentials: {
          name: { label: "Name", type: "text" },
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          const email = String(credentials?.email ?? "").trim().toLowerCase();
          const name = String(credentials?.name ?? "").trim();
          if (!email || !name) return null;
          return { id: email, name, email };
        },
      }),
    ];

export const isDevLogin = !oktaConfigured;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, profile, user }) {
      const email = (profile?.email ?? user?.email ?? token.email) as
        | string
        | undefined;
      const name = (profile?.name ?? user?.name ?? token.name) as
        | string
        | undefined;
      const oktaSub = oktaConfigured ? (profile?.sub as string | undefined) : undefined;

      if (email) {
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: { name, oktaSub },
          create: { email, name, oktaSub },
        });
        token.userId = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
