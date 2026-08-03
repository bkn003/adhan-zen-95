/**
 * Firebase Cloud Messaging HTTP v1 sender.
 *
 * Requires the `FCM_SERVICE_ACCOUNT_JSON` secret — the full service-account JSON
 * downloaded from Firebase Console → Project settings → Service accounts.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const b64url = (input: string | Uint8Array) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  );
  const jwt = `${header}.${claim}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(`FCM token error: ${JSON.stringify(payload)}`);

  cachedToken = { token: payload.access_token, exp: now + 3500 };
  return cachedToken.token;
}

export interface FcmResult {
  sent: number;
  invalidTokens: string[];
  errors: string[];
}

/** Sends a data+notification message to each token; reports unregistered tokens. */
export async function sendFcm(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<FcmResult> {
  const rawSa = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!rawSa) throw new Error("FCM_SERVICE_ACCOUNT_JSON is not configured");
  const sa = JSON.parse(rawSa) as ServiceAccount;
  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const result: FcmResult = { sent: 0, invalidTokens: [], errors: [] };

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data,
              android: { priority: "HIGH", notification: { channel_id: "mosque_announcements" } },
              apns: { payload: { aps: { sound: "default" } } },
            },
          }),
        });
        if (res.ok) {
          result.sent++;
          return;
        }
        const err = await res.json().catch(() => ({}));
        const status = err?.error?.status ?? "";
        if (status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
          result.invalidTokens.push(token);
        } else {
          result.errors.push(status || `HTTP ${res.status}`);
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "send failed");
      }
    }),
  );

  return result;
}
