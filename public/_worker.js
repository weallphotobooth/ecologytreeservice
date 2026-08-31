import { EmailMessage } from "cloudflare:email";

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

async function handleQuote(request, env) {
  if (!env.QUOTE_EMAIL || !env.TURNSTILE_SECRET) {
    return json({ message: "The secure form is temporarily unavailable." }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 30_000) return json({ message: "That request is too large." }, 413);

  let input;
  try { input = await request.json(); }
  catch { return json({ message: "Please check the form and try again." }, 400); }

  if (clean(input.company_site, 100)) return json({ ok: true });

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

  const requestId = crypto.randomUUID().split("-")[0].toUpperCase();
  const subject = headerSafe(`New ${data.service} request — ${data.town} — ${data.name}`, 150);
  const replyTo = data.email ? `${headerSafe(data.name)} <${headerSafe(data.email, 160)}>` : undefined;
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
    `Submitted: ${new Date().toISOString()}`,
    `Request ID: ${requestId}`
  ].join("\r\n");

  const headers = [
    "From: Ecology Website <quotes@ecologytreeservice.com>",
    "To: ecologytree@gmail.com",
    `Subject: ${subject}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    `Message-ID: <quote-${requestId.toLowerCase()}@ecologytreeservice.com>`,
    "",
    body
  ].join("\r\n");

  await env.QUOTE_EMAIL.send(new EmailMessage("quotes@ecologytreeservice.com", "ecologytree@gmail.com", headers));
  return json({ ok: true, requestId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote") {
      if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);
      try { return await handleQuote(request, env); }
      catch (error) {
        console.error("Quote request failed", error);
        return json({ message: "We could not send the request right now." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

