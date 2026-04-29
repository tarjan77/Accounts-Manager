import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_LOGO_URL = "https://www.shreecleaning.com/logo.png";

export async function GET() {
  const logoUrl = process.env.NEXT_PUBLIC_SHREE_LOGO_URL || DEFAULT_LOGO_URL;

  try {
    const response = await fetch(logoUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({ dataUrl: null });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    return NextResponse.json({
      dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`
    });
  } catch {
    return NextResponse.json({ dataUrl: null });
  }
}
