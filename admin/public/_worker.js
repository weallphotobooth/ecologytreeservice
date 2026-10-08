let accessKeys = { expires: 0, keys: [] };

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; img-src 'self' https://ecologytreeservice.com data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...securityHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

const base64UrlBytes = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const decodePart = (value) => JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));

async function verifyAccess(request, env) {
  const url = new URL(request.url);
  if ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && env.LOCAL_DEV === "true") {
    return { email: "local-preview@ecologytreeservice.com" };
  }
  if (url.hostname !== "admin.ecologytreeservice.com") return null;
  if (!env.CF_ACCESS_AUD || !env.CF_ACCESS_TEAM_DOMAIN) return null;
  const token = request.headers.get("CF-Access-Jwt-Assertion");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = decodePart(parts[0]);
    const payload = decodePart(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (header.alg !== "RS256" || !audiences.includes(env.CF_ACCESS_AUD) || payload.exp <= now) return null;
    const teamDomain = String(env.CF_ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (payload.iss !== `https://${teamDomain}`) return null;
    if (accessKeys.expires < Date.now()) {
      const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
      if (!response.ok) return null;
      const certs = await response.json();
      accessKeys = { expires: Date.now() + 3_600_000, keys: certs.keys || [] };
    }
    const jwk = accessKeys.keys.find((key) => key.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return valid ? { email: payload.email || "Authorized user" } : null;
  } catch {
    return null;
  }
}

async function proxyApi(request, env) {
  if (!env.ADMIN_API_SECRET) return json({ message: "Dashboard API is not configured." }, 503);
  const incoming = new URL(request.url);
  const localRequest = incoming.hostname === "127.0.0.1" || incoming.hostname === "localhost";
  const apiOrigin = localRequest && env.MAIN_SITE_ORIGIN ? env.MAIN_SITE_ORIGIN : "https://ecologytreeservice.com";
  const target = new URL(incoming.pathname.replace(/^\/api\//, "/api/admin/") + incoming.search, apiOrigin);
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${env.ADMIN_API_SECRET}`);
  for (const name of ["Content-Type", "Content-Length", "X-Image-Key", "X-Alt-Text"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body
  });
  const outputHeaders = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) outputHeaders.set(name, value);
  outputHeaders.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers: outputHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const user = await verifyAccess(request, env);
    if (!user) {
      return new Response("Ecology dashboard is locked. Cloudflare Access must authorize this request.", {
        status: 403,
        headers: { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
    }
    if (url.pathname === "/api/session") return json({ email: user.email });
    if (url.pathname.startsWith("/api/")) return proxyApi(request, env);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
    headers.set("Cache-Control", response.headers.get("Content-Type")?.includes("text/html") ? "no-store" : "public, max-age=3600");
    return new Response(response.body, { status: response.status, headers });
  }
};
