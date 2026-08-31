const CLOUDFLARE_ACCOUNT_ID = "31d06642a08b1bd412f3339cc535179a";
const QUOTE_DESTINATION = "ecologytree@gmail.com";
const QUOTE_SENDER = "quotes@ecologytreeservice.com";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

const clean = (value, max = 200) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const headerSafe = (value, max = 120) => clean(value, max).replace(/[\r\n]+/g, " ");
const list = (value) => Array.isArray(value) ? value.map((item) => clean(item, 80)).filter(Boolean) : [];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function verifyTurnstile(token, secret, ip) {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.action === "quote_request";
}

async function sendQuoteEmail(emailPayload, token) {
  let lastFailure = { status: 0, detail: "Email service unavailable" };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(emailPayload)
        }
      );
      const result = await response.json().catch(() => null);
      if (response.ok && result?.success === true) return { ok: true };

      const detail = Array.isArray(result?.errors)
        ? result.errors.map((error) => clean(`${error.code ?? ""} ${error.message ?? ""}`, 180)).filter(Boolean).join("; ")
        : `HTTP ${response.status}`;
      lastFailure = { status: response.status, detail: detail || `HTTP ${response.status}` };
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastFailure = { status: 0, detail: clean(error instanceof Error ? error.message : "Network error", 180) };
    }

    if (attempt === 1) await wait(250);
  }

  return { ok: false, ...lastFailure };
}

async function handleQuote(request, env) {
  if (!env.QUOTE_DB || !env.TURNSTILE_SECRET) {
    return json({ message: "The secure form is temporarily unavailable." }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 30_000) return json({ message: "That request is too large." }, 413);

  let input;
  try { input = await request.json(); }
  catch { return json({ message: "Please check the form and try again." }, 400); }

  const data = {
    service: clean(input.service, 80),
    address: clean(input.address, 160),
    town: clean(input.town, 80),
    treeCount: clean(input.tree_count, 40),
    urgency: clean(input.urgency, 80),
    access: clean(input.access, 100),
    concerns: list(input.concerns),
    details: clean(input.details, 1600),
    name: clean(input.name, 100),
    phone: clean(input.phone, 30),
    email: clean(input.email, 160),
    callTime: clean(input.call_time, 50),
    contactMethod: clean(input.contact_method, 50),
    consent: clean(input.consent, 10)
  };

  const required = [data.service, data.address, data.town, data.treeCount, data.urgency, data.details, data.name, data.phone];
  if (required.some((value) => !value) || data.consent !== "yes") {
    return json({ message: "Please complete all required fields." }, 400);
  }
  if (!/^[+()\-\.\s\d]{7,30}$/.test(data.phone)) return json({ message: "Please enter a valid phone number." }, 400);
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return json({ message: "Please enter a valid email address." }, 400);

  const token = clean(input["cf-turnstile-response"], 2400);
  const verified = await verifyTurnstile(token, env.TURNSTILE_SECRET, request.headers.get("CF-Connecting-IP"));
  if (!verified) return json({ message: "Secure verification expired. Please try again." }, 403);

  const recordId = crypto.randomUUID();
  const requestId = recordId.split("-")[0].toUpperCase();
  const createdAt = new Date().toISOString();

  await env.QUOTE_DB.prepare(`
    INSERT INTO quote_requests (
      id, request_id, created_at, service, address, town, tree_count, urgency,
      access, concerns_json, details, name, phone, email, call_time,
      contact_method, email_status, source_host, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    recordId,
    requestId,
    createdAt,
    data.service,
    data.address,
    data.town,
    data.treeCount,
    data.urgency,
    data.access,
    JSON.stringify(data.concerns),
    data.details,
    data.name,
    data.phone,
    data.email,
    data.callTime,
    data.contactMethod,
    clean(new URL(request.url).hostname, 120),
    clean(request.headers.get("User-Agent"), 300)
  ).run();

  const subject = headerSafe(`New ${data.service} request — ${data.town} — ${data.name}`, 150);
  const body = [
    `NEW WEBSITE ESTIMATE REQUEST · ${requestId}`,
    "",
    `Job type: ${data.service}`,
    `Timing: ${data.urgency}`,
    `Number of trees: ${data.treeCount}`,
    `Property: ${data.address}, ${data.town}`,
    `Access: ${data.access}`,
    `Nearby concerns: ${data.concerns.length ? data.concerns.join(", ") : "None selected"}`,
    "",
    "CUSTOMER DESCRIPTION",
    data.details,
    "",
    "CONTACT",
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email || "Not provided"}`,
    `Preferred contact: ${data.contactMethod}`,
    `Best time to call: ${data.callTime}`,
    "",
    `Submitted: ${createdAt}`,
    `Request ID: ${requestId}`
  ].join("\r\n");

  const emailPayload = {
    to: QUOTE_DESTINATION,
    from: { address: QUOTE_SENDER, name: "Ecology Website" },
    subject,
    text: body,
    ...(data.email ? { reply_to: { address: data.email, name: headerSafe(data.name) } } : {})
  };

  const delivery = env.EMAIL_API_TOKEN
    ? await sendQuoteEmail(emailPayload, env.EMAIL_API_TOKEN)
    : { ok: false, status: 0, detail: "Email API token is unavailable" };

  if (!delivery.ok) {
    await env.QUOTE_DB.prepare(`
      UPDATE quote_requests
      SET email_status = 'failed', email_error = ?
      WHERE id = ?
    `).bind(clean(delivery.detail, 300), recordId).run();
    console.error("Quote saved but email notification failed", {
      requestId,
      status: delivery.status
    });
    return json({ ok: true, requestId, notificationDelayed: true }, 202);
  }

  await env.QUOTE_DB.prepare(`
    UPDATE quote_requests
    SET email_status = 'sent', email_sent_at = ?
    WHERE id = ?
  `).bind(new Date().toISOString(), recordId).run();

  console.log("Quote saved and notification sent", { requestId });

  return json({ ok: true, requestId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote") {
      if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);
      try { return await handleQuote(request, env); }
      catch (error) {
        console.error("Quote request failed", {
          message: error instanceof Error ? error.message : "Unknown error"
        });
        return json({ message: "We could not save the request right now." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
