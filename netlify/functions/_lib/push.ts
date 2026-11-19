import crypto from 'node:crypto';

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface PushDiagnostics {
  fcmConfigured: boolean;
  fcmProjectId: string | null;
  fcmError: string | null;
  vapidConfigured: boolean;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function parseFcmServiceAccount(): {
  account: FcmServiceAccount | null;
  error: string | null;
} {
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    return { account: null, error: 'FCM_SERVICE_ACCOUNT is not set' };
  }

  let jsonText = raw;
  if (!raw.startsWith('{')) {
    try {
      jsonText = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      return { account: null, error: 'FCM_SERVICE_ACCOUNT is neither JSON nor valid base64' };
    }
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<FcmServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return {
        account: null,
        error: 'FCM_SERVICE_ACCOUNT is missing project_id, client_email, or private_key',
      };
    }
    return {
      account: {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, '\n'),
      },
      error: null,
    };
  } catch {
    return { account: null, error: 'FCM_SERVICE_ACCOUNT contains invalid JSON' };
  }
}

export function getPushDiagnostics(): PushDiagnostics {
  const { account, error } = parseFcmServiceAccount();
  const vapidConfigured = Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  );
  return {
    fcmConfigured: Boolean(account),
    fcmProjectId: account?.project_id ?? null,
    fcmError: error,
    vapidConfigured,
  };
}

let cachedToken: { token: string; expiresAtMs: number; projectId: string } | null = null;

async function getFcmAccessToken(account: FcmServiceAccount): Promise<string | null> {
  if (
    cachedToken &&
    cachedToken.projectId === account.project_id &&
    cachedToken.expiresAtMs > Date.now() + 60_000
  ) {
    return cachedToken.token;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = base64UrlEncode(signer.sign(account.private_key));
  const assertion = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    return null;
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokenJson.access_token) return null;

  cachedToken = {
    token: tokenJson.access_token,
    expiresAtMs: Date.now() + (tokenJson.expires_in ?? 3600) * 1000,
    projectId: account.project_id,
  };
  return cachedToken.token;
}

export async function sendFcmNotification(params: {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ ok: boolean; status?: number }> {
  const { account } = parseFcmServiceAccount();
  if (!account) return { ok: false };

  const accessToken = await getFcmAccessToken(account);
  if (!accessToken) return { ok: false };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: params.deviceToken,
          notification: {
            title: params.title,
            body: params.body,
          },
          data: params.data ?? {},
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'mirusync_releases',
            },
          },
        },
      }),
    }
  );

  return { ok: res.ok, status: res.status };
}
