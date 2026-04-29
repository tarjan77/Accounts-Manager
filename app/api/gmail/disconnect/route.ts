import { NextResponse } from "next/server";
import {
  deleteServerDocument,
  getServerDocument,
  setServerDocument,
  verifyRequestUser
} from "@/lib/server/firebase-rest";
import { revokeGoogleToken } from "@/lib/server/gmail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid } = await verifyRequestUser(request);
    const secret = await getServerDocument(["users", uid, "private", "gmail"]);
    const refreshToken = typeof secret?.refreshToken === "string" ? secret.refreshToken : "";

    if (refreshToken) {
      await revokeGoogleToken(refreshToken);
    }

    await deleteServerDocument(["users", uid, "private", "gmail"]);
    await setServerDocument(["users", uid, "settings", "gmail"], {
      connected: false,
      email: "",
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not disconnect Gmail." },
      { status: 400 }
    );
  }
}
