import { NextRequest, NextResponse } from "next/server";
import { setServerDocument } from "@/lib/server/firebase-rest";
import {
  exchangeCodeForTokens,
  getGoogleEmail,
  verifyOAuthState
} from "@/lib/server/gmail";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?gmail=error&reason=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?gmail=missing-code", request.url));
  }

  try {
    const { uid } = verifyOAuthState(state);
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/settings?gmail=no-refresh-token", request.url));
    }

    const email = await getGoogleEmail(tokens.access_token || "");
    const now = new Date().toISOString();

    await setServerDocument(["users", uid, "private", "gmail"], {
      refreshToken: tokens.refresh_token,
      scope: tokens.scope || "",
      tokenType: tokens.token_type || "",
      email,
      updatedAt: now
    });

    await setServerDocument(["users", uid, "settings", "gmail"], {
      connected: true,
      email,
      updatedAt: now
    });

    return NextResponse.redirect(new URL("/settings?gmail=connected", request.url));
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "Could not connect Gmail.";
    return NextResponse.redirect(
      new URL(`/settings?gmail=error&reason=${encodeURIComponent(message)}`, request.url)
    );
  }
}
