import { NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/server/firebase-rest";
import { buildGoogleOAuthUrl } from "@/lib/server/gmail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid } = await verifyRequestUser(request);
    return NextResponse.json({ url: buildGoogleOAuthUrl(uid) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start Gmail connection." },
      { status: 400 }
    );
  }
}
