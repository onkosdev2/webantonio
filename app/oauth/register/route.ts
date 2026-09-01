import {
  createOAuthClient,
  isAllowedRedirectUri
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistrationRequest = {
  client_name?: unknown;
  redirect_uris?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
  token_endpoint_auth_method?: unknown;
};

function invalidClientMetadata(description: string) {
  return Response.json(
    { error: "invalid_client_metadata", error_description: description },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegistrationRequest | null;
  const redirectUris = body?.redirect_uris;

  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length < 1 ||
    redirectUris.length > 10 ||
    !redirectUris.every((uri) => typeof uri === "string" && isAllowedRedirectUri(uri))
  ) {
    return invalidClientMetadata("redirect_uris debe contener entre 1 y 10 URL válidas.");
  }

  if (
    body?.token_endpoint_auth_method !== undefined &&
    body.token_endpoint_auth_method !== "none"
  ) {
    return invalidClientMetadata("Solo se admite token_endpoint_auth_method=none con PKCE.");
  }

  const grantTypes = body?.grant_types;
  if (
    grantTypes !== undefined &&
    (!Array.isArray(grantTypes) || grantTypes.some((value) => value !== "authorization_code"))
  ) {
    return invalidClientMetadata("Solo se admite authorization_code.");
  }

  const responseTypes = body?.response_types;
  if (
    responseTypes !== undefined &&
    (!Array.isArray(responseTypes) || responseTypes.some((value) => value !== "code"))
  ) {
    return invalidClientMetadata("Solo se admite response_type=code.");
  }

  const client = createOAuthClient({
    clientName: typeof body?.client_name === "string" ? body.client_name : undefined,
    redirectUris
  });

  return Response.json(
    {
      client_id: client.clientId,
      client_id_issued_at: client.issuedAt,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
