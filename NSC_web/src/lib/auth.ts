import { betterAuth } from "better-auth/minimal";
import { username, admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { nextCookies } from "better-auth/next-js";

export const emailDomain = "@local.internal";

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const email = user.email.trim().toLowerCase();
          const allowedEmail = await prisma.allowedGoogleEmail.findUnique({
            where: { email },
          });

          if (!allowedEmail) {
            return;
          }

          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { role: "THERAPIST" },
            }),
            prisma.therapist.create({
              data: { userId: user.id },
            }),
          ]);
        },
      },
    },
  },
  user: {
    validateUserInfo: async ({ user, source }) => {
      if (source.method !== "oauth" || source.oauth?.providerId !== "google") {
        return;
      }

      const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";

      const allowedEmail = await prisma.allowedGoogleEmail.findUnique({
        where: { email },
      });

      if (!allowedEmail || allowedEmail?.disabled === true) {
        return {
          error: "google_account_not_allowed",
          errorDescription: "This Google account is not allowed to sign in.",
        };
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      disableImplicitLinking: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // Expiration time in seconds (e.g., 7 days)
    updateAge: 60 * 60 * 24, // Refresh interval in seconds (e.g., 1 day)
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [
    username({
      displayUsername: false,
    }),
    admin({
      adminRoles: ["ADMIN"],
      defaultRole: "PATIENT",
    }),
    nextCookies(),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    cookiePrefix: "poodPlearn",
  },
});

export function getEmail(account: string): string {
  return account + emailDomain;
}

export function handleAuthError(error: unknown, fallbackMessage = "Authentication failed") {
  const status = typeof (error as any)?.statusCode === "number" ? (error as any).statusCode : 500;

  const message: string =
    typeof (error as any)?.message === "string" ? (error as any).message : fallbackMessage;

  console.log(fallbackMessage + ": " + message);

  return NextResponse.json({ error: message.replaceAll("email", "account") }, { status });
}
