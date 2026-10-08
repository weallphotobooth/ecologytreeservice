const MAX_IMAGE_BYTES = 950_000;

let schemaPromise;
let contentCache = { expires: 0, content: null };

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

const clean = (value, max = 200) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .trim()
  .slice(0, max);

const safeJsonParse = (value, fallback) => {
  try { return JSON.parse(value); }
  catch { return fallback; }
};

async function ensureDashboardSchema(env) {
  if (!env.QUOTE_DB) throw new Error("D1 binding is unavailable");
  if (!schemaPromise) {
    schemaPromise = env.QUOTE_DB.batch([
      env.QUOTE_DB.prepare(`CREATE TABLE IF NOT EXISTS traffic_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at TEXT NOT NULL,
        day TEXT NOT NULL,
        path TEXT NOT NULL,
        referrer_host TEXT,
        country TEXT,
        device TEXT NOT NULL,
        visitor_hash TEXT NOT NULL
      )`),
      env.QUOTE_DB.prepare("CREATE INDEX IF NOT EXISTS idx_traffic_day ON traffic_events(day DESC)"),
      env.QUOTE_DB.prepare("CREATE INDEX IF NOT EXISTS idx_traffic_path_day ON traffic_events(path, day DESC)"),
      env.QUOTE_DB.prepare(`CREATE TABLE IF NOT EXISTS site_content (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        draft_json TEXT NOT NULL,
        published_json TEXT,
        updated_at TEXT NOT NULL,
        published_at TEXT
      )`),
      env.QUOTE_DB.prepare(`CREATE TABLE IF NOT EXISTS site_content_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        content_json TEXT NOT NULL
      )`),
      env.QUOTE_DB.prepare(`CREATE TABLE IF NOT EXISTS site_images (
        id TEXT PRIMARY KEY,
        image_key TEXT NOT NULL,
        content_type TEXT NOT NULL,
        data BLOB NOT NULL,
        alt_text TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`),
      env.QUOTE_DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_images_key ON site_images(image_key, created_at DESC)")
    ]).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function sha256Hmac(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getDevice(screenWidth, userAgent) {
  if (/tablet|ipad/i.test(userAgent) || (screenWidth >= 700 && screenWidth < 1100)) return "Tablet";
  if (/mobile|iphone|android/i.test(userAgent) || screenWidth < 700) return "Mobile";
  return "Desktop";
}

export async function handleAnalyticsView(request, env) {
  if (!env.QUOTE_DB || !env.ANALYTICS_HASH_SECRET || request.headers.get("DNT") === "1") {
    return new Response(null, { status: 204 });
  }
  const origin = request.headers.get("Origin");
  if (origin && origin !== "https://ecologytreeservice.com" && origin !== "https://www.ecologytreeservice.com") {
    return new Response(null, { status: 204 });
  }
  const userAgent = clean(request.headers.get("User-Agent"), 260);
  if (/bot|crawler|spider|preview|lighthouse|headless/i.test(userAgent)) return new Response(null, { status: 204 });

  let input;
  try { input = await request.json(); }
  catch { return new Response(null, { status: 204 }); }
  const path = clean(input.path, 180);
  if (!path.startsWith("/") || path.startsWith("/api/") || path.startsWith("/media/")) return new Response(null, { status: 204 });

  let referrerHost = "Direct";
  try {
    if (input.referrer) {
      const parsed = new URL(String(input.referrer));
      referrerHost = parsed.hostname.endsWith("ecologytreeservice.com") ? "Internal" : clean(parsed.hostname, 120);
    }
  } catch { referrerHost = "Direct"; }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const visitorHash = await sha256Hmac(env.ANALYTICS_HASH_SECRET, `${day}|${ip}|${userAgent}`);
  await ensureDashboardSchema(env);
  await env.QUOTE_DB.prepare(`
    INSERT INTO traffic_events (occurred_at, day, path, referrer_host, country, device, visitor_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    now.toISOString(),
    day,
    path,
    referrerHost,
    clean(request.headers.get("CF-IPCountry") || "Unknown", 3),
    getDevice(Number(input.screenWidth) || 0, userAgent),
    visitorHash
  ).run();
  return new Response(null, { status: 204 });
}

function isAdminRequest(request, env) {
  const expected = env.ADMIN_API_SECRET;
  const provided = request.headers.get("Authorization") || "";
  return Boolean(expected && provided === `Bearer ${expected}`);
}

async function getEditorSchema(request, env) {
  const schemaRequest = new Request(new URL("/admin-content.json", request.url), { method: "GET" });
  const response = await env.ASSETS.fetch(schemaRequest);
  if (!response.ok) throw new Error("Content editor schema unavailable");
  return response.json();
}

function defaultContent(schema) {
  return {
    values: Object.fromEntries(schema.fields.map((field) => [field.key, field.default])),
    images: {}
  };
}

async function getContentRecord(env) {
  await ensureDashboardSchema(env);
  return env.QUOTE_DB.prepare("SELECT draft_json, published_json, updated_at, published_at FROM site_content WHERE id = 1").first();
}

function mergeContent(defaults, saved) {
  return {
    values: { ...defaults.values, ...(saved?.values || {}) },
    images: { ...(saved?.images || {}) }
  };
}

async function handleAdminOverview(url, env) {
  await ensureDashboardSchema(env);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 7), 365);
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const [summary, daily, pages, referrers, countries, devices, quoteSummary] = await Promise.all([
    env.QUOTE_DB.prepare("SELECT COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors FROM traffic_events WHERE day >= ?").bind(since).first(),
    env.QUOTE_DB.prepare("SELECT day, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors FROM traffic_events WHERE day >= ? GROUP BY day ORDER BY day").bind(since).all(),
    env.QUOTE_DB.prepare("SELECT path, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors FROM traffic_events WHERE day >= ? GROUP BY path ORDER BY pageviews DESC LIMIT 12").bind(since).all(),
    env.QUOTE_DB.prepare("SELECT referrer_host AS label, COUNT(*) AS value FROM traffic_events WHERE day >= ? GROUP BY referrer_host ORDER BY value DESC LIMIT 10").bind(since).all(),
    env.QUOTE_DB.prepare("SELECT country AS label, COUNT(*) AS value FROM traffic_events WHERE day >= ? GROUP BY country ORDER BY value DESC LIMIT 10").bind(since).all(),
    env.QUOTE_DB.prepare("SELECT device AS label, COUNT(*) AS value FROM traffic_events WHERE day >= ? GROUP BY device ORDER BY value DESC").bind(since).all(),
    env.QUOTE_DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN email_status = 'failed' THEN 1 ELSE 0 END) AS failed FROM quote_requests WHERE created_at >= ?").bind(`${since}T00:00:00.000Z`).first().catch(() => ({ total: 0, failed: 0 }))
  ]);
  return json({
    days,
    summary: {
      pageviews: Number(summary?.pageviews || 0),
      visitors: Number(summary?.visitors || 0),
      quotes: Number(quoteSummary?.total || 0),
      emailIssues: Number(quoteSummary?.failed || 0)
    },
    daily: daily.results || [],
    pages: pages.results || [],
    referrers: referrers.results || [],
    countries: countries.results || [],
    devices: devices.results || []
  });
}

async function handleAdminQuotes(url, env) {
  await ensureDashboardSchema(env);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 250);
  const result = await env.QUOTE_DB.prepare(`
    SELECT request_id, created_at, service, address, town, tree_count, urgency, access,
      concerns_json, details, name, phone, email, call_time, contact_method,
      email_status, email_error, email_sent_at
    FROM quote_requests ORDER BY created_at DESC LIMIT ?
  `).bind(limit).all();
  return json({ quotes: (result.results || []).map((quote) => ({
    ...quote,
    concerns: safeJsonParse(quote.concerns_json, []),
    concerns_json: undefined
  })) });
}

async function handleAdminContent(request, env) {
  const schema = await getEditorSchema(request, env);
  const defaults = defaultContent(schema);
  const record = await getContentRecord(env);
  const history = await env.QUOTE_DB.prepare("SELECT id, created_at FROM site_content_versions ORDER BY id DESC LIMIT 20").all();
  return json({
    schema,
    draft: mergeContent(defaults, safeJsonParse(record?.draft_json, null)),
    published: mergeContent(defaults, safeJsonParse(record?.published_json, null)),
    updatedAt: record?.updated_at || null,
    publishedAt: record?.published_at || null,
    history: history.results || []
  });
}

async function validateDraft(request, env, input) {
  const schema = await getEditorSchema(request, env);
  const allowedFields = new Map(schema.fields.map((field) => [field.key, field]));
  const allowedImages = new Set(schema.images.map((image) => image.key));
  const values = {};
  for (const [key, value] of Object.entries(input?.values || {})) {
    const field = allowedFields.get(key);
    if (!field) continue;
    values[key] = clean(value, Number(field.maxLength) || 1000);
  }
  const images = {};
  for (const [key, image] of Object.entries(input?.images || {})) {
    if (!allowedImages.has(key) || !image || typeof image !== "object") continue;
    const url = clean(image.url, 240);
    if (!/^\/media\/site\/[a-f0-9-]{36}\.webp$/.test(url)) continue;
    images[key] = { url, alt: clean(image.alt, 240) };
  }
  return { values, images };
}

async function saveDraft(request, env) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 150_000) return json({ message: "Draft is too large." }, 413);
  const input = await request.json();
  const draft = await validateDraft(request, env, input);
  const now = new Date().toISOString();
  await ensureDashboardSchema(env);
  const existing = await getContentRecord(env);
  await env.QUOTE_DB.prepare(`
    INSERT INTO site_content (id, draft_json, published_json, updated_at, published_at)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET draft_json = excluded.draft_json, updated_at = excluded.updated_at
  `).bind(JSON.stringify(draft), existing?.published_json || null, now, existing?.published_at || null).run();
  return json({ ok: true, updatedAt: now });
}

async function publishDraft(env) {
  await ensureDashboardSchema(env);
  const record = await getContentRecord(env);
  if (!record?.draft_json) return json({ message: "Save a draft before publishing." }, 400);
  const now = new Date().toISOString();
  if (record.published_json) {
    await env.QUOTE_DB.prepare("INSERT INTO site_content_versions (created_at, content_json) VALUES (?, ?)")
      .bind(record.published_at || now, record.published_json).run();
  }
  await env.QUOTE_DB.prepare("UPDATE site_content SET published_json = draft_json, published_at = ? WHERE id = 1")
    .bind(now).run();
  contentCache = { expires: 0, content: null };
  return json({ ok: true, publishedAt: now });
}

async function restoreVersion(request, env) {
  const input = await request.json();
  const id = Number(input.id);
  if (!Number.isInteger(id) || id < 1) return json({ message: "Invalid version." }, 400);
  await ensureDashboardSchema(env);
  const version = await env.QUOTE_DB.prepare("SELECT content_json FROM site_content_versions WHERE id = ?").bind(id).first();
  if (!version) return json({ message: "Version not found." }, 404);
  const now = new Date().toISOString();
  await env.QUOTE_DB.prepare("UPDATE site_content SET draft_json = ?, updated_at = ? WHERE id = 1")
    .bind(version.content_json, now).run();
  return json({ ok: true, updatedAt: now });
}

async function uploadImage(request, env) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length <= 0 || length > MAX_IMAGE_BYTES) return json({ message: "Image must be smaller than 950 KB." }, 413);
  if (request.headers.get("Content-Type") !== "image/webp") return json({ message: "Please upload an optimized WebP image." }, 415);
  const imageKey = clean(request.headers.get("X-Image-Key"), 120);
  const altText = clean(request.headers.get("X-Alt-Text"), 240);
  const schema = await getEditorSchema(request, env);
  if (!schema.images.some((image) => image.key === imageKey)) return json({ message: "Unknown image location." }, 400);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return json({ message: "Invalid WebP image." }, 400);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await ensureDashboardSchema(env);
  await env.QUOTE_DB.prepare("INSERT INTO site_images (id, image_key, content_type, data, alt_text, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, imageKey, "image/webp", bytes, altText, now).run();

  const record = await getContentRecord(env);
  const draft = safeJsonParse(record?.draft_json, { values: {}, images: {} });
  draft.images = { ...(draft.images || {}), [imageKey]: { url: `/media/site/${id}.webp`, alt: altText } };
  await env.QUOTE_DB.prepare(`
    INSERT INTO site_content (id, draft_json, published_json, updated_at, published_at)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET draft_json = excluded.draft_json, updated_at = excluded.updated_at
  `).bind(JSON.stringify(draft), record?.published_json || null, now, record?.published_at || null).run();
  return json({ ok: true, image: draft.images[imageKey], updatedAt: now });
}

export async function serveManagedImage(url, env) {
  const match = url.pathname.match(/^\/media\/site\/([a-f0-9-]{36})\.webp$/);
  if (!match || !env.QUOTE_DB) return new Response("Not found", { status: 404 });
  await ensureDashboardSchema(env);
  const image = await env.QUOTE_DB.prepare("SELECT content_type, data FROM site_images WHERE id = ?").bind(match[1]).first();
  if (!image?.data) return new Response("Not found", { status: 404 });
  return new Response(image.data, {
    headers: {
      "Content-Type": image.content_type || "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function getPublishedContent(env) {
  if (!env.QUOTE_DB) return null;
  if (contentCache.expires > Date.now()) return contentCache.content;
  try {
    await ensureDashboardSchema(env);
    const record = await env.QUOTE_DB.prepare("SELECT published_json FROM site_content WHERE id = 1").first();
    const content = safeJsonParse(record?.published_json, null);
    contentCache = { expires: Date.now() + 30_000, content };
    return content;
  } catch (error) {
    console.error("Published content lookup failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return null;
  }
}

export async function serveSite(request, env) {
  const response = await env.ASSETS.fetch(request);
  if (request.method !== "GET" || !response.headers.get("Content-Type")?.includes("text/html")) return response;
  const content = await getPublishedContent(env);
  if (!content || (!Object.keys(content.values || {}).length && !Object.keys(content.images || {}).length)) return response;

  const values = content.values || {};
  const images = content.images || {};
  return new HTMLRewriter()
    .on("[data-content-key]", {
      element(element) {
        const key = element.getAttribute("data-content-key");
        const value = values[key];
        if (typeof value !== "string") return;
        const attribute = element.getAttribute("data-content-attr");
        if (attribute) element.setAttribute(attribute, value);
        else element.setInnerContent(value);
      }
    })
    .on("[data-content-image]", {
      element(element) {
        const key = element.getAttribute("data-content-image");
        const image = images[key];
        if (!image?.url) return;
        element.setAttribute("src", image.url);
        element.setAttribute("srcset", image.url);
        if (image.alt) element.setAttribute("alt", image.alt);
      }
    })
    .transform(response);
}

export async function handleDashboardRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin/")) return null;
  if (!isAdminRequest(request, env)) return json({ message: "Unauthorized." }, 401);
  try {
    if (url.pathname === "/api/admin/analytics" && request.method === "GET") return await handleAdminOverview(url, env);
    if (url.pathname === "/api/admin/quotes" && request.method === "GET") return await handleAdminQuotes(url, env);
    if (url.pathname === "/api/admin/content" && request.method === "GET") return await handleAdminContent(request, env);
    if (url.pathname === "/api/admin/content/draft" && request.method === "PUT") return await saveDraft(request, env);
    if (url.pathname === "/api/admin/content/publish" && request.method === "POST") return await publishDraft(env);
    if (url.pathname === "/api/admin/content/restore" && request.method === "POST") return await restoreVersion(request, env);
    if (url.pathname === "/api/admin/image" && request.method === "POST") return await uploadImage(request, env);
    return json({ message: "Not found." }, 404);
  } catch (error) {
    console.error("Admin request failed", { path: url.pathname, message: error instanceof Error ? error.message : "Unknown error" });
    return json({ message: "The dashboard request could not be completed." }, 500);
  }
}
