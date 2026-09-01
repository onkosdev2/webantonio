import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "crypto";
import { db } from "@/lib/db";

export const MCP_SCOPES = ["mcp:read", "mcp:write"] as const;

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const CLIENT_TTL_SECONDS = 60 * 60 * 24 * 365;
const LOCAL_SECRET = "onkos-local-mcp-oauth-secret";

type SignedPayload = {
  exp: number;
  purpose: string;
};

export type OAuthClient = SignedPayload & {
  purpose: "oauth_client";
  clientName: string;
  redirectUris: string[];
  issuedAt: number;
};

export type AuthorizationRequest = SignedPayload & {
  purpose: "authorization_request";
  userId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  resource: string;
  scope: string;
};

type AuthorizationCode = {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  expiresAt: number;
};

type AccessToken = SignedPayload & {
  purpose: "access_token";
  userId: string;
  clientId: string;
  resource: string;
  scope: string;
  issuedAt: number;
};

declare global {
  var __mcpOAuthCodes__: Map<string, AuthorizationCode> | undefined;
}

const authorizationCodes =
  globalThis.__mcpOAuthCodes__ ?? new Map<string, AuthorizationCode>();
globalThis.__mcpOAuthCodes__ = authorizationCodes;

function oauthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET debe estar configurado para OAuth MCP.");
  }

  return LOCAL_SECRET;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signature(encodedPayload: string) {
  return createHmac("sha256", oauthSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function signPayload<T extends SignedPayload>(payload: T) {
  const encodedPayload = encode(payload);
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

function readPayload<T extends SignedPayload>(token: string, purpose: T["purpose"]): T | null {
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as T;

    if (
      payload.purpose !== purpose ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function mcpResource() {
  return `${siteUrl()}/mcp`;
}

export function protectedResourceMetadataUrl() {
  return `${siteUrl()}/.well-known/oauth-protected-resource`;
}

export function normalizeScope(value?: string | null) {
  const requested = value?.trim()
    ? [...new Set(value.trim().split(/\s+/))]
    : [...MCP_SCOPES];

  if (requested.some((scope) => !MCP_SCOPES.includes(scope as (typeof MCP_SCOPES)[number]))) {
    return null;
  }

  return requested.join(" ");
}

export function isAllowedRedirectUri(value: string) {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (
      url.protocol === "https:" &&
      ["chatgpt.com", "platform.openai.com"].includes(url.hostname)
    ) {
      return true;
    }

    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function createOAuthClient(input: {
  clientName?: string;
  redirectUris: string[];
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: OAuthClient = {
    purpose: "oauth_client",
    clientName: input.clientName?.trim().slice(0, 120) || "ChatGPT",
    redirectUris: input.redirectUris,
    issuedAt,
    exp: issuedAt + CLIENT_TTL_SECONDS
  };

  return {
    clientId: `onkos_${signPayload(payload)}`,
    issuedAt,
    clientName: payload.clientName,
    redirectUris: payload.redirectUris
  };
}

export function readOAuthClient(clientId: string) {
  if (!clientId.startsWith("onkos_")) return null;
  return readPayload<OAuthClient>(clientId.slice("onkos_".length), "oauth_client");
}

export function createAuthorizationRequestToken(
  input: Omit<AuthorizationRequest, "purpose" | "exp">
) {
  return signPayload<AuthorizationRequest>({
    ...input,
    purpose: "authorization_request",
    exp: Math.floor(Date.now() / 1000) + 10 * 60
  });
}

export function readAuthorizationRequestToken(token: string, userId: string) {
  const payload = readPayload<AuthorizationRequest>(token, "authorization_request");
  return payload?.userId === userId ? payload : null;
}

function pruneAuthorizationCodes() {
  const now = Date.now();
  for (const [code, authorization] of authorizationCodes) {
    if (authorization.expiresAt <= now) authorizationCodes.delete(code);
  }
}

export function issueAuthorizationCode(
  request: AuthorizationRequest
) {
  pruneAuthorizationCodes();
  const code = randomBytes(32).toString("base64url");
  authorizationCodes.set(code, {
    userId: request.userId,
    clientId: request.clientId,
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    resource: request.resource,
    scope: request.scope,
    expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS
  });
  return code;
}

function pkceMatches(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const calculated = createHash("sha256").update(verifier).digest("base64url");
  const supplied = Buffer.from(challenge);
  const expected = Buffer.from(calculated);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function redeemAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string;
}) {
  pruneAuthorizationCodes();
  const authorization = authorizationCodes.get(input.code);

  if (
    !authorization ||
    authorization.clientId !== input.clientId ||
    authorization.redirectUri !== input.redirectUri ||
    authorization.resource !== input.resource ||
    !pkceMatches(input.codeVerifier, authorization.codeChallenge)
  ) {
    return null;
  }

  authorizationCodes.delete(input.code);
  return authorization;
}

export function issueAccessToken(authorization: AuthorizationCode) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AccessToken = {
    purpose: "access_token",
    userId: authorization.userId,
    clientId: authorization.clientId,
    resource: authorization.resource,
    scope: authorization.scope,
    issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS
  };

  return {
    accessToken: signPayload(payload),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: payload.scope
  };
}

export async function authorizeMcpBearer(token: string) {
  const payload = readPayload<AccessToken>(token, "access_token");
  if (!payload || payload.resource !== mcpResource()) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, active: true, mustChangePassword: true }
  });

  if (!user?.active || user.mustChangePassword) return null;
  return payload;
}
