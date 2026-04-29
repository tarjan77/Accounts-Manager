import { createSign, createVerify } from "crypto";

type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

type FirestoreFields = Record<string, { [key: string]: unknown }>;

let serviceAccessToken: { token: string; expiresAt: number } | null = null;
let firebaseCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

function projectId() {
  const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!id) {
    throw new Error("Firebase project ID is not configured.");
  }

  return id;
}

function serviceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
      client_email?: string;
      private_key?: string;
    };

    if (parsed.client_email && parsed.private_key) {
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n")
      };
    }
  }

  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Firebase service account credentials are not configured.");
  }

  return { clientEmail, privateKey };
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function signServiceJwt() {
  const { clientEmail, privateKey } = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}

async function getServiceAccessToken() {
  if (serviceAccessToken && serviceAccessToken.expiresAt > Date.now() + 60_000) {
    return serviceAccessToken.token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signServiceJwt()
    })
  });

  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || "Could not authenticate Firebase service account.");
  }

  serviceAccessToken = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000
  };

  return serviceAccessToken.token;
}

function firestoreUrl(path: string[]) {
  const encodedPath = path.map(encodeURIComponent).join("/");
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/${encodedPath}`;
}

function toFirestoreValue(value: FirestoreValue): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }

  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, toFirestoreValue(nestedValue)])
      )
    }
  };
}

function fromFirestoreValue(value: Record<string, unknown>): FirestoreValue {
  if ("stringValue" in value) {
    return String(value.stringValue || "");
  }

  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }

  if ("integerValue" in value) {
    return Number(value.integerValue || 0);
  }

  if ("doubleValue" in value) {
    return Number(value.doubleValue || 0);
  }

  if ("arrayValue" in value) {
    const arrayValue = value.arrayValue as { values?: Record<string, unknown>[] };
    return (arrayValue.values || []).map(fromFirestoreValue);
  }

  if ("mapValue" in value) {
    const mapValue = value.mapValue as { fields?: FirestoreFields };
    return fromFirestoreFields(mapValue.fields || {});
  }

  return null;
}

function fromFirestoreFields(fields: FirestoreFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)])
  );
}

export async function setServerDocument(path: string[], data: Record<string, FirestoreValue>) {
  const token = await getServiceAccessToken();
  const response = await fetch(firestoreUrl(path), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
      )
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Could not save Firestore document.");
  }
}

export async function getServerDocument(path: string[]) {
  const token = await getServiceAccessToken();
  const response = await fetch(firestoreUrl(path), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (response.status === 404) {
    return null;
  }

  const payload = (await response.json()) as { fields?: FirestoreFields; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Could not read Firestore document.");
  }

  return fromFirestoreFields(payload.fields || {});
}

export async function deleteServerDocument(path: string[]) {
  const token = await getServiceAccessToken();
  const response = await fetch(firestoreUrl(path), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(error || "Could not delete Firestore document.");
  }
}

async function getFirebaseCerts() {
  if (firebaseCerts && firebaseCerts.expiresAt > Date.now()) {
    return firebaseCerts.certs;
  }

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Could not load Firebase auth certificates.");
  }

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  firebaseCerts = {
    certs: (await response.json()) as Record<string, string>,
    expiresAt: Date.now() + maxAge * 1000
  };

  return firebaseCerts.certs;
}

export async function verifyFirebaseIdToken(token: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid authentication token.");
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8")) as { kid?: string; alg?: string };
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as {
    aud?: string;
    exp?: number;
    iss?: string;
    sub?: string;
    user_id?: string;
  };

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid authentication token.");
  }

  const id = projectId();
  if (payload.aud !== id || payload.iss !== `https://securetoken.google.com/${id}`) {
    throw new Error("Authentication token is not for this Firebase project.");
  }

  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    throw new Error("Authentication token has expired.");
  }

  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error("Could not verify authentication token.");
  }

  const isValid = createVerify("RSA-SHA256")
    .update(`${encodedHeader}.${encodedPayload}`)
    .verify(cert, decodeBase64Url(encodedSignature));

  if (!isValid || !payload.sub) {
    throw new Error("Invalid authentication token.");
  }

  return { uid: payload.sub };
}

export async function verifyRequestUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    throw new Error("Sign in before using Gmail sending.");
  }

  return verifyFirebaseIdToken(token);
}
