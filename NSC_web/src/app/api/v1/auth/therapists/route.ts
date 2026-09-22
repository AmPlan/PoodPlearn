import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/shared/utils/emailUtils";

type CreateTherapistBody = {
  allowGoogleEmail?: string;
};


// Create Therapist
export const POST = withAuth([], async(req, _session) => {
  try {
    const body = (await req.json()) as CreateTherapistBody;
    const allowGoogleEmail = body.allowGoogleEmail?.trim().toLowerCase() ?? "";

    if (!allowGoogleEmail) {
      return NextResponse.json(
        { error: "Missing required field: allowGoogleEmail." },
        { status: 400 },
      );
    }

    if (!isValidEmail(allowGoogleEmail)) {
      return NextResponse.json({ error: "Invalid allowGoogleEmail." }, { status: 400 });
    }

    const existingAllowedEmail = await prisma.allowedGoogleEmail.findUnique({
      where: { email: allowGoogleEmail },
      select: { id: true },
    });

    if (existingAllowedEmail) {
      return NextResponse.json({ error: "This Google email is already allowed." }, { status: 409 });
    }

    const allowedGoogleEmailRecord = await prisma.allowedGoogleEmail.create({
      data: { id: crypto.randomUUID(), email: allowGoogleEmail },
    });

    return NextResponse.json(
      {
        message: "Google email allowed successfully.",
        allowedGoogleEmail: allowedGoogleEmailRecord,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to allow therapist Google email:", error);
    return NextResponse.json({ error: "Unable to allow therapist Google email." }, { status: 500 });
  }

})
