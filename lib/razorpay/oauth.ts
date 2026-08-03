import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

/**
 * Razorpay OAuth — the restaurant grants Trogix permission to create orders on
 * THEIR account. Funds move Razorpay → restaurant's bank. Trogix is never a
 * party to the money.
 */

const AUTH_URL = "https://auth.razorpay.com/authorize";
const TOKEN_URL = "https://auth.razorpay.com/token";
const API_BASE = "https://api.razorpay.com/v2";

/** Only what we need: read the account, and create/read orders + payments. */
const SCOPES = ["read_write"];

export function razorpayEnv() {
  const clientId = process.env.RAZORPAY_CLIENT_ID;
  const clientSecret = process.env.RAZORPAY_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return {
    clientId,
    clientSecret,
    appUrl,
    configured: Boolean(clientId && clientSecret && appUrl),
  };
}

function requireEnv() {
  const env = razorpayEnv();
  if (!env.configured) {
    throw new Error("Razorpay Connect is not configured on this deployment.");
  }
  return {
    clientId: env.clientId!,
    clientSecret: env.clientSecret!,
    appUrl: env.appUrl!.replace(/\/$/, ""),
  };
}

export function redirectUri() {
  return `${requireEnv().appUrl}/api/razorpay/callback`;
}

/* ------------------------------------------------------------------ state */

/**
 * OAuth state is an HMAC of the business id, so the callback cannot be
 * replayed for a different tenant and needs no server-side session store.
 */
export function signState(businessId: string): string {
  const { clientSecret } = requireEnv();
  const nonce = randomBytes(8).toString("hex");
  const payload = `${businessId}.${Date.now()}.${nonce}`;
  const mac = createHmac("sha256", clientSecret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

export function verifyState(state: string): string | null {
  try {
    const { clientSecret } = requireEnv();
    const [payloadPart, mac] = state.split(".");
    if (!payloadPart || !mac) return null;

    const payload = Buffer.from(payloadPart, "base64url").toString("utf8");
    const expected = createHmac("sha256", clientSecret)
      .update(payload)
      .digest("base64url");

    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const [businessId, issuedAt] = payload.split(".");
    // 15-minute window.
    if (Date.now() - Number(issuedAt) > 15 * 60 * 1000) return null;
    return businessId ?? null;
  } catch {
    return null;
  }
}

export function authorizeUrl(businessId: string): string {
  const { clientId } = requireEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES.join(" "),
    state: signState(businessId),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/* ------------------------------------------------------------------ token */

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  razorpay_account_id?: string;
  public_token?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = requireEnv();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Razorpay token request failed (${response.status}).`);
  }
  return (await response.json()) as TokenResponse;
}

export function exchangeCode(code: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/* ---------------------------------------------------------------- account */

export async function fetchMerchant(accessToken: string) {
  const response = await fetch(`${API_BASE}/accounts/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    id?: string;
    name?: string;
    email?: string;
    live?: boolean;
  };
}

export async function storeGrant(
  businessId: string,
  token: TokenResponse,
  merchant: { id?: string; name?: string; email?: string; live?: boolean } | null,
) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);

  const values = {
    provider: "razorpay",
    status: "connected" as const,
    accountId: token.razorpay_account_id ?? merchant?.id ?? null,
    accountName: merchant?.name ?? null,
    accountEmail: merchant?.email ?? null,
    publicKey: token.public_token ?? null,
    accessTokenEnc: encrypt(token.access_token),
    refreshTokenEnc: encrypt(token.refresh_token),
    tokenExpiresAt: expiresAt,
    liveMode: Boolean(merchant?.live),
    connectedAt: new Date(),
    lastError: null,
    lastErrorAt: null,
  };

  await db
    .insert(schema.paymentAccounts)
    .values({ businessId, ...values })
    .onConflictDoUpdate({
      target: [schema.paymentAccounts.businessId, schema.paymentAccounts.provider],
      set: values,
    });
}

/**
 * Returns a usable access token, refreshing it first if it is close to expiry.
 * Never returns a token for a disconnected or revoked account.
 */
export async function getAccessToken(businessId: string): Promise<{
  accessToken: string;
  accountId: string | null;
  publicKey: string | null;
} | null> {
  const db = getDb();
  const [account] = await db
    .select()
    .from(schema.paymentAccounts)
    .where(
      and(
        eq(schema.paymentAccounts.businessId, businessId),
        eq(schema.paymentAccounts.provider, "razorpay"),
      ),
    )
    .limit(1);

  if (!account || account.status !== "connected" || !account.accessTokenEnc) {
    return null;
  }

  const expiresSoon =
    !account.tokenExpiresAt ||
    account.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!expiresSoon) {
    return {
      accessToken: decrypt(account.accessTokenEnc),
      accountId: account.accountId,
      publicKey: account.publicKey,
    };
  }

  if (!account.refreshTokenEnc) return null;

  try {
    const refreshed = await refreshAccessToken(decrypt(account.refreshTokenEnc));
    await db
      .update(schema.paymentAccounts)
      .set({
        accessTokenEnc: encrypt(refreshed.access_token),
        refreshTokenEnc: encrypt(refreshed.refresh_token),
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        status: "connected",
        lastError: null,
        lastErrorAt: null,
      })
      .where(eq(schema.paymentAccounts.id, account.id));

    return {
      accessToken: refreshed.access_token,
      accountId: account.accountId,
      publicKey: refreshed.public_token ?? account.publicKey,
    };
  } catch {
    await db
      .update(schema.paymentAccounts)
      .set({
        status: "expired",
        lastError: "Could not refresh the Razorpay grant.",
        lastErrorAt: new Date(),
      })
      .where(eq(schema.paymentAccounts.id, account.id));
    return null;
  }
}

export async function disconnect(businessId: string) {
  const db = getDb();
  await db
    .update(schema.paymentAccounts)
    .set({
      status: "revoked",
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
    })
    .where(
      and(
        eq(schema.paymentAccounts.businessId, businessId),
        eq(schema.paymentAccounts.provider, "razorpay"),
      ),
    );
}
