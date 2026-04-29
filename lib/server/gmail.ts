import { createHmac, randomUUID } from "crypto";

export type EmailAttachment = {
  filename: string;
  contentType: string;
  base64: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function oauthClient() {
  return {
    clientId: requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: requiredEnv("GOOGLE_OAUTH_REDIRECT_URI")
  };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function stateSecret() {
  return process.env.GMAIL_OAUTH_STATE_SECRET || requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET");
}

export function createOAuthState(uid: string) {
  const payload = base64Url(
    JSON.stringify({
      uid,
      nonce: randomUUID(),
      exp: Date.now() + 10 * 60 * 1000
    })
  );
  const signature = createHmac("sha256", stateSecret()).update(payload).digest();

  return `${payload}.${base64Url(signature)}`;
}

export function verifyOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    throw new Error("Invalid OAuth state.");
  }

  const expected = base64Url(createHmac("sha256", stateSecret()).update(payload).digest());
  if (signature !== expected) {
    throw new Error("Invalid OAuth state.");
  }

  const decoded = JSON.parse(decodeBase64Url(payload).toString("utf8")) as {
    uid?: string;
    exp?: number;
  };

  if (!decoded.uid || !decoded.exp || decoded.exp < Date.now()) {
    throw new Error("OAuth connection expired. Please try again.");
  }

  return { uid: decoded.uid };
}

export function buildGoogleOAuthUrl(uid: string) {
  const { clientId, redirectUri } = oauthClient();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: createOAuthState(uid)
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = oauthClient();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  const payload = (await response.json()) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Could not connect Gmail.");
  }

  return payload;
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = oauthClient();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    })
  });

  const payload = (await response.json()) as TokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Could not refresh Gmail access.");
  }

  return payload.access_token;
}

export async function getGoogleEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return "";
  }

  const payload = (await response.json()) as { email?: string };
  return payload.email || "";
}

export async function revokeGoogleToken(token: string) {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token })
  });
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") || value;
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function buildMimeMessage(input: SendEmailInput) {
  const mixedBoundary = `mixed_${randomUUID()}`;
  const altBoundary = `alt_${randomUUID()}`;
  const fromName = cleanHeader(process.env.GMAIL_FROM_NAME || "Shree Cleaning");
  const fromEmail = cleanHeader(process.env.GMAIL_FROM_EMAIL || "");
  const fromHeader = fromEmail ? `${fromName} <${fromEmail}>` : fromName;
  const text = input.text || htmlToText(input.html);
  const headers = [
    `From: ${fromHeader}`,
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${cleanHeader(input.subject)}`,
    "MIME-Version: 1.0"
  ];

  const alternativePart = [
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.html,
    "",
    `--${altBoundary}--`
  ].join("\r\n");

  if (!input.attachments?.length) {
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      alternativePart.replace(`Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`, "")
    ].join("\r\n");
  }

  const attachmentParts = input.attachments.map((attachment) =>
    [
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${cleanHeader(attachment.filename)}"`,
      `Content-Disposition: attachment; filename="${cleanHeader(attachment.filename)}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(attachment.base64)
    ].join("\r\n")
  );

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    alternativePart,
    ...attachmentParts,
    `--${mixedBoundary}--`
  ].join("\r\n");
}

export async function sendGmailEmail(refreshToken: string, input: SendEmailInput) {
  const accessToken = await refreshAccessToken(refreshToken);
  const raw = base64Url(buildMimeMessage(input));
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  const payload = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message || "Gmail could not send this email.");
  }

  return payload.id;
}
