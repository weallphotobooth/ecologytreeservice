const state = { analytics: null, quotes: [], content: null, currentGroup: null };
const titles = {
  overview: "Website overview",
  quotes: "Quote requests",
  content: "Wording & search details",
  images: "Website images",
  versions: "Publish & history"
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const siteAsset = (path) => path?.startsWith("/") ? `https://ecologytreeservice.com${path}` : path;

function notify(message, error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.className = `notice show${error ? " error" : ""}`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { notice.className = "notice"; }, 4500);
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function switchView(view) {
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
  $("#view-title").textContent = titles[view];
  $(".sidebar").classList.remove("open");
  try {
    if (view === "overview") await loadAnalytics();
    if (view === "quotes") await loadQuotes();
    if (["content", "images", "versions"].includes(view)) await loadContent();
  } catch (error) { notify(error.message, true); }
}

function renderMetrics(summary) {
  const metrics = [
    ["Unique visitors", summary.visitors, ""],
    ["Page views", summary.pageviews, ""],
    ["Quote requests", summary.quotes, ""],
    ["Email delivery issues", summary.emailIssues, summary.emailIssues ? "warning" : ""]
  ];
  $("#metrics").innerHTML = metrics.map(([label, value, className]) => `<article class="metric ${className}"><small>${label}</small><strong>${Number(value).toLocaleString()}</strong></article>`).join("");
}

function renderChart(rows) {
  const chart = $("#traffic-chart");
  if (!rows.length) { chart.innerHTML = '<p class="empty">Traffic will appear here after the new tracker begins collecting visits.</p>'; return; }
  const max = Math.max(...rows.map((row) => Number(row.pageviews)), 1);
  chart.innerHTML = rows.map((row) => {
    const height = Math.max((Number(row.pageviews) / max) * 100, 1.5);
    return `<div class="bar-wrap" style="--bar-height:${height}%"><span class="bar-tip">${escapeHtml(row.day)} · ${row.pageviews} views</span><i class="bar" style="height:${height}%"></i></div>`;
  }).join("");
}

function renderRank(selector, rows) {
  const root = $(selector);
  if (!rows.length) { root.innerHTML = '<p class="empty">No data yet.</p>'; return; }
  const max = Math.max(...rows.map((row) => Number(row.value)), 1);
  root.innerHTML = rows.map((row) => `<div class="rank-row"><span title="${escapeHtml(row.label)}">${escapeHtml(row.label || "Unknown")}</span><strong>${Number(row.value).toLocaleString()}</strong><span class="rank-meter"><i style="width:${(Number(row.value) / max) * 100}%"></i></span></div>`).join("");
}

async function loadAnalytics() {
  const days = $("#period").value;
  const data = await api(`/api/analytics?days=${days}`);
  state.analytics = data;
  $("#period-label").textContent = data.days;
  renderMetrics(data.summary);
  renderChart(data.daily);
  renderRank("#device-list", data.devices);
  renderRank("#referrer-list", data.referrers);
  renderRank("#country-list", data.countries);
  $("#page-table").innerHTML = data.pages.length ? data.pages.map((row) => `<tr><td>${escapeHtml(row.path)}</td><td>${Number(row.pageviews).toLocaleString()}</td><td>${Number(row.visitors).toLocaleString()}</td></tr>`).join("") : '<tr><td colspan="3" class="empty">No page views collected yet.</td></tr>';
}

function quoteMatches(quote, query) {
  return [quote.name, quote.town, quote.service, quote.phone, quote.email, quote.request_id].join(" ").toLowerCase().includes(query.toLowerCase());
}

function renderQuotes() {
  const query = $("#quote-search").value.trim();
  const quotes = state.quotes.filter((quote) => quoteMatches(quote, query));
  $("#quote-table").innerHTML = quotes.length ? quotes.map((quote) => `<tr><td>${escapeHtml(formatDate(quote.created_at))}<br><small>${escapeHtml(quote.request_id)}</small></td><td><strong>${escapeHtml(quote.name)}</strong><br>${escapeHtml(quote.phone)}</td><td>${escapeHtml(quote.service)}</td><td>${escapeHtml(quote.town)}</td><td><span class="status ${quote.email_status === "failed" ? "failed" : ""}">${escapeHtml(quote.email_status)}</span></td><td><button class="link-button" data-quote="${escapeHtml(quote.request_id)}">View</button></td></tr>`).join("") : '<tr><td colspan="6" class="empty">No matching quote requests.</td></tr>';
}

async function loadQuotes() {
  const data = await api("/api/quotes?limit=150");
  state.quotes = data.quotes;
  renderQuotes();
}

function showQuote(requestId) {
  const quote = state.quotes.find((item) => item.request_id === requestId);
  if (!quote) return;
  const items = [
    ["Request", quote.request_id], ["Received", formatDate(quote.created_at)], ["Customer", quote.name], ["Phone", quote.phone],
    ["Email", quote.email || "Not provided"], ["Service", quote.service], ["Property", `${quote.address}, ${quote.town}`],
    ["Urgency", quote.urgency], ["Trees", quote.tree_count], ["Access", quote.access || "Not provided"],
    ["Nearby concerns", quote.concerns?.join(", ") || "None selected"], ["Preferred contact", quote.contact_method || "Not provided"],
    ["Best call time", quote.call_time || "Not provided"], ["Description", quote.details],
    ["Email delivery", quote.email_status === "failed" ? `Failed: ${quote.email_error || "Unknown error"}` : quote.email_status]
  ];
  $("#quote-detail").innerHTML = `<p class="kicker">Estimate request</p><h2>${escapeHtml(quote.name)}</h2><div class="detail-grid">${items.map(([label, value], index) => `<div class="detail-item ${index >= 13 ? "wide" : ""}"><small>${escapeHtml(label)}</small><p>${escapeHtml(value)}</p></div>`).join("")}</div>`;
  $("#quote-dialog").showModal();
}

function renderContentGroups() {
  const groups = state.content.schema.groups;
  state.currentGroup ||= groups[0].id;
  $("#content-groups").innerHTML = groups.map((group) => `<button type="button" data-group="${escapeHtml(group.id)}" class="${group.id === state.currentGroup ? "active" : ""}">${escapeHtml(group.label)}</button>`).join("");
  renderContentForm();
}

function renderContentForm() {
  const group = state.content.schema.groups.find((item) => item.id === state.currentGroup);
  const fields = state.content.schema.fields.filter((field) => field.group === state.currentGroup);
  $("#content-form").innerHTML = `<h3>${escapeHtml(group.label)}</h3>${fields.map((field) => {
    const value = state.content.draft.values[field.key] ?? field.default;
    const control = field.type === "textarea"
      ? `<textarea id="field-${escapeHtml(field.key)}" data-key="${escapeHtml(field.key)}" maxlength="${field.maxLength}">${escapeHtml(value)}</textarea>`
      : `<input id="field-${escapeHtml(field.key)}" data-key="${escapeHtml(field.key)}" maxlength="${field.maxLength}" value="${escapeHtml(value)}">`;
    return `<div class="field"><label for="field-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>${control}<small><span data-count="${escapeHtml(field.key)}">${String(value).length}</span> / ${field.maxLength}</small></div>`;
  }).join("")}`;
}

function collectVisibleFields() {
  $$('[data-key]', $("#content-form")).forEach((field) => { state.content.draft.values[field.dataset.key] = field.value; });
}

function renderImages() {
  $("#image-grid").innerHTML = state.content.schema.images.map((image) => {
    const current = state.content.draft.images[image.key];
    const preview = siteAsset(current?.url || image.defaultPreview);
    const alt = current?.alt || image.alt;
    return `<article class="image-card" data-image-card="${escapeHtml(image.key)}"><img src="${escapeHtml(preview)}" alt=""><p class="location">${escapeHtml(image.group)} · ${escapeHtml(image.aspect)}</p><h3>${escapeHtml(image.label)}</h3><label for="alt-${escapeHtml(image.key)}">Accessible image description</label><input id="alt-${escapeHtml(image.key)}" type="text" maxlength="240" data-image-alt="${escapeHtml(image.key)}" value="${escapeHtml(alt)}"><div class="image-actions"><input class="file-input" id="file-${escapeHtml(image.key)}" data-image-file="${escapeHtml(image.key)}" type="file" accept="image/jpeg,image/png,image/webp"><label class="choose-file" for="file-${escapeHtml(image.key)}">Choose & upload photo</label></div><p class="upload-state">${current ? "Draft image uploaded" : "Using the website’s original image"}</p></article>`;
  }).join("");
}

function renderVersions() {
  $("#published-at").textContent = state.content.publishedAt ? `Last published ${formatDate(state.content.publishedAt)}` : "Nothing has been published through this dashboard yet.";
  $("#version-list").innerHTML = state.content.history.length ? state.content.history.map((version) => `<div class="version-row"><span>Published ${escapeHtml(formatDate(version.created_at))}</span><button class="link-button" data-restore="${version.id}">Restore to draft</button></div>`).join("") : '<p class="empty">Earlier versions will appear after the second publish.</p>';
}

async function loadContent(force = false) {
  if (!state.content || force) state.content = await api("/api/content");
  renderContentGroups();
  renderImages();
  renderVersions();
}

async function saveContent() {
  collectVisibleFields();
  const button = $("#save-content");
  button.disabled = true;
  try {
    const result = await api("/api/content/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.content.draft) });
    state.content.updatedAt = result.updatedAt;
    notify("Draft saved. The public website has not changed.");
  } finally { button.disabled = false; }
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const limit = 1920;
  const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = .84;
  let blob;
  do {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    quality -= .08;
  } while (blob && blob.size > 900000 && quality >= .44);
  if (!blob || blob.size > 950000) throw new Error("This image is still too large after optimization. Please choose a smaller photo.");
  return blob;
}

async function uploadImage(key, file) {
  const card = $(`[data-image-card="${CSS.escape(key)}"]`);
  const status = $(".upload-state", card);
  status.textContent = "Optimizing image…";
  const blob = await compressImage(file);
  status.textContent = "Uploading optimized image…";
  const alt = $(`[data-image-alt="${CSS.escape(key)}"]`).value.trim();
  const result = await api("/api/image", { method: "POST", headers: { "Content-Type": "image/webp", "X-Image-Key": key, "X-Alt-Text": alt }, body: blob });
  state.content.draft.images[key] = result.image;
  $("img", card).src = siteAsset(result.image.url);
  status.textContent = `Draft uploaded · ${Math.round(blob.size / 1024)} KB WebP`;
  notify("Image optimized and added to the draft.");
}

async function publishContent() {
  const button = $("#publish-content");
  button.disabled = true;
  try {
    await saveContent();
    const result = await api("/api/content/publish", { method: "POST" });
    notify("Website published successfully.");
    await loadContent(true);
    state.content.publishedAt = result.publishedAt;
    renderVersions();
  } finally { button.disabled = false; }
}

async function restoreVersion(id) {
  await api("/api/content/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  await loadContent(true);
  notify("Earlier version restored to the draft. Review it, then publish when ready.");
  await switchView("content");
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) switchView(nav.dataset.view);
  const group = event.target.closest("[data-group]");
  if (group) { collectVisibleFields(); state.currentGroup = group.dataset.group; renderContentGroups(); }
  const quote = event.target.closest("[data-quote]");
  if (quote) showQuote(quote.dataset.quote);
  const restore = event.target.closest("[data-restore]");
  if (restore) restoreVersion(restore.dataset.restore).catch((error) => notify(error.message, true));
});

document.addEventListener("input", (event) => {
  if (event.target.id === "quote-search") renderQuotes();
  if (event.target.matches("[data-key]")) {
    state.content.draft.values[event.target.dataset.key] = event.target.value;
    const count = $(`[data-count="${CSS.escape(event.target.dataset.key)}"]`);
    if (count) count.textContent = event.target.value.length;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "period") loadAnalytics().catch((error) => notify(error.message, true));
  if (event.target.matches("[data-image-file]") && event.target.files[0]) {
    uploadImage(event.target.dataset.imageFile, event.target.files[0]).catch((error) => notify(error.message, true));
  }
  if (event.target.matches("[data-image-alt]")) {
    const image = state.content.draft.images[event.target.dataset.imageAlt];
    if (image) image.alt = event.target.value;
  }
});

$("#save-content").addEventListener("click", () => saveContent().catch((error) => notify(error.message, true)));
$("#publish-content").addEventListener("click", () => publishContent().catch((error) => notify(error.message, true)));
$("#menu-button").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$(".dialog-close").addEventListener("click", () => $("#quote-dialog").close());

(async () => {
  try {
    const session = await api("/api/session");
    $("#account-email").textContent = session.email;
    await loadAnalytics();
  } catch (error) { notify(error.message, true); }
})();
