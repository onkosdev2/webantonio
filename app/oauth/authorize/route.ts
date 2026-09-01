import { getCurrentUser } from "@/lib/auth/session";
import {
  createAuthorizationRequestToken,
  issueAuthorizationCode,
  mcpResource,
  normalizeScope,
  readAuthorizationRequestToken,
  readOAuthClient,
  siteUrl
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://chatgpt.com https://platform.openai.com; base-uri 'none'; frame-ancestors 'none'",
      "X-Frame-Options": "DENY"
    }
  });
}

function errorPage(message: string) {
  return html(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Solicitud no válida</title><body><p>${escapeHtml(message)}</p></body></html>`, 400);
}

function callbackUrl(redirectUri: string, values: Record<string, string | undefined>) {
  const callback = new URL(redirectUri);
  for (const [key, value] of Object.entries(values)) {
    if (value) callback.searchParams.set(key, value);
  }
  return callback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const resource = url.searchParams.get("resource") ?? mcpResource();
  const scope = normalizeScope(url.searchParams.get("scope"));
  const client = readOAuthClient(clientId);

  if (responseType !== "code") return errorPage("response_type debe ser code.");
  if (!client || !client.redirectUris.includes(redirectUri)) return errorPage("Cliente o redirect_uri no válido.");
  if (!state) return errorPage("Falta el parámetro state.");
  if (resource !== mcpResource()) return errorPage("El recurso solicitado no es válido.");
  if (codeChallengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
    return errorPage("La solicitud debe usar PKCE S256.");
  }
  if (!scope) return errorPage("La solicitud contiene permisos no admitidos.");

  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) {
    const login = new URL("/login", siteUrl());
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return Response.redirect(login, 303);
  }

  const requestToken = createAuthorizationRequestToken({
    userId: user.id,
    clientId,
    redirectUri,
    state,
    codeChallenge,
    resource,
    scope
  });

  return html(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Autorizar MCP de ONKOS</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6efe4;color:#13231f;font:16px/1.55 system-ui,sans-serif;padding:24px}.card{width:min(560px,100%);background:#fffaf2;border:1px solid #ddceb7;border-radius:24px;padding:36px;box-shadow:0 20px 60px #13352d1a}.kicker{color:#9a5d24;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}h1{font:700 36px/1.1 Georgia,serif;margin:10px 0 14px}p{color:#455751}.permissions{background:#eaf2ee;border-radius:16px;padding:16px 18px;margin:24px 0}.permissions strong{display:block;color:#123f36;margin-bottom:6px}.actions{display:flex;gap:12px;justify-content:flex-end;margin-top:28px}button{border-radius:999px;padding:12px 20px;font-weight:700;cursor:pointer}.deny{background:transparent;border:1px solid #cfbfa7;color:#253a34}.approve{background:#0c493f;color:white;border:1px solid #0c493f}.account{font-size:14px;color:#68756f}
  </style>
</head>
<body>
  <main class="card">
    <span class="kicker">Conexión segura</span>
    <h1>Autorizar MCP de ONKOS</h1>
    <p><strong>${escapeHtml(client.clientName)}</strong> solicita conectarse al archivo editorial para consultar y administrar casos clínicos y noticias.</p>
    <div class="permissions"><strong>Permisos solicitados</strong>Leer contenido y ejecutar herramientas editoriales, incluidas las acciones de creación y publicación que requieran confirmación.</div>
    <p class="account">Cuenta: ${escapeHtml(user.email)}</p>
    <form method="post" action="/oauth/authorize">
      <input type="hidden" name="request_token" value="${escapeHtml(requestToken)}">
      <div class="actions">
        <button class="deny" name="decision" value="deny" type="submit">Cancelar</button>
        <button class="approve" name="decision" value="approve" type="submit">Autorizar conexión</button>
      </div>
    </form>
  </main>
</body>
</html>`);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const form = await request.formData().catch(() => null);
  const requestToken = String(form?.get("request_token") ?? "");
  const decision = String(form?.get("decision") ?? "");

  if (!user || user.mustChangePassword) return errorPage("La sesión del panel expiró.");
  const authorization = readAuthorizationRequestToken(requestToken, user.id);
  if (!authorization) return errorPage("La solicitud de autorización expiró.");

  const client = readOAuthClient(authorization.clientId);
  if (!client || !client.redirectUris.includes(authorization.redirectUri)) {
    return errorPage("El cliente OAuth dejó de ser válido.");
  }

  if (decision !== "approve") {
    return Response.redirect(callbackUrl(authorization.redirectUri, {
      error: "access_denied",
      error_description: "El usuario canceló la autorización.",
      state: authorization.state,
      iss: siteUrl()
    }), 303);
  }

  const code = issueAuthorizationCode(authorization);
  return Response.redirect(callbackUrl(authorization.redirectUri, {
    code,
    state: authorization.state,
    iss: siteUrl()
  }), 303);
}
