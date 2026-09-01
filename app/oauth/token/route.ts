import {
  issueAccessToken,
  mcpResource,
  readOAuthClient,
  redeemAuthorizationCode,
  redeemRefreshToken
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } }
  );
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return oauthError("invalid_request", "Solicitud inválida.");

  const grantType = String(form.get("grant_type") ?? "");
  const code = String(form.get("code") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeVerifier = String(form.get("code_verifier") ?? "");
  const refreshToken = String(form.get("refresh_token") ?? "");
  const resource = String(form.get("resource") ?? mcpResource());

  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return oauthError(
      "unsupported_grant_type",
      "Solo se admiten authorization_code y refresh_token."
    );
  }

  const client = readOAuthClient(clientId);
  if (
    !client ||
    (grantType === "authorization_code" && !client.redirectUris.includes(redirectUri))
  ) {
    return oauthError("invalid_client", "Cliente OAuth no válido.", 401);
  }

  if (resource !== mcpResource()) {
    return oauthError("invalid_target", "El recurso solicitado no es válido.");
  }

  const authorization =
    grantType === "authorization_code"
      ? redeemAuthorizationCode({
          code,
          clientId,
          redirectUri,
          codeVerifier,
          resource
        })
      : redeemRefreshToken({
          refreshToken,
          clientId,
          resource
        });

  if (!authorization) {
    return oauthError(
      "invalid_grant",
      grantType === "authorization_code"
        ? "El código expiró, fue utilizado o no supera PKCE."
        : "El token de renovación expiró o no es válido."
    );
  }

  const token = issueAccessToken(authorization);
  return Response.json(
    {
      access_token: token.accessToken,
      token_type: "Bearer",
      expires_in: token.expiresIn,
      scope: token.scope,
      refresh_token: token.refreshToken
    },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } }
  );
}
