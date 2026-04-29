import { NextResponse } from "next/server";
import { getServerDocument, verifyRequestUser } from "@/lib/server/firebase-rest";
import { sendGmailEmail, type EmailAttachment } from "@/lib/server/gmail";

export const runtime = "nodejs";

type SendBody = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
};

export async function POST(request: Request) {
  try {
    const { uid } = await verifyRequestUser(request);
    const body = (await request.json()) as SendBody;

    if (!body.to || !body.subject || !body.html) {
      return NextResponse.json(
        { error: "Email, subject, and message are required." },
        { status: 400 }
      );
    }

    const secret = await getServerDocument(["users", uid, "private", "gmail"]);
    const refreshToken = typeof secret?.refreshToken === "string" ? secret.refreshToken : "";

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Connect Gmail in Settings before sending emails." },
        { status: 409 }
      );
    }

    const id = await sendGmailEmail(refreshToken, {
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      attachments: body.attachments || []
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send email." },
      { status: 400 }
    );
  }
}
