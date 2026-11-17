import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySession } from "./auth";

// Clinical scores/CSV exports belong to the therapist side of the application.
export async function requireTherapistSession() {
	const cookieStore = await cookies();
	const session = verifySession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
	if (!session)
		return {
			ok: false as const,
			response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
		};
	if (session.role !== "THERAPIST")
		return {
			ok: false as const,
			response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
		};
	return { ok: true as const };
}
