type EmailAttachment = {
  filename: string;
  contentType: string;
  base64: string;
};

export type ClientEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

export async function sendConnectedGmailEmail(idToken: string, input: ClientEmailInput) {
  const response = await fetch("/api/gmail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { id?: string; error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Could not send email.");
  }

  return payload.id || "";
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#217d5f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700">${escapeHtml(label)}</a>`;
}
