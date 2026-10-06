import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, badge, fmtDate, esc, toast, channelLabel } from "../ui.js";

const id = new URLSearchParams(location.search).get("id");
if (!id) location.href = "notifications.html";

const $ = (x) => document.getElementById(x);
let current = null;

function timelineItems(n, attempts) {
  const items = attempts.map((a) => `
    <li class="tl-item ${a.status === "success" ? "success" : "failed"}">
      <span class="tl-dot"></span>
      <div class="tl-title">Attempt ${a.attemptNumber} ${a.status === "success" ? "delivered" : "failed"}</div>
      ${a.error ? `<div class="tl-error">${esc(a.error)}</div>` : ""}
      <div class="tl-meta">${fmtDate(a.createdAt)}${a.durationMs != null ? ` · ${a.durationMs} ms` : ""}</div>
    </li>`);

  const tail = {
    pending: attempts.length
      ? ["waiting", "Retry scheduled", `Next attempt around ${fmtDate(n.nextAttemptAt)}`]
      : ["waiting", "Waiting for the worker", new Date(n.nextAttemptAt) > new Date() ? `Scheduled for ${fmtDate(n.nextAttemptAt)}` : "It will be picked up in a few seconds"],
    processing: ["working", "Sending now…", "The worker is delivering this notification"],
    failed: ["failed", "Out of attempts", "Use Retry to give it 3 more attempts"],
    cancelled: ["", "Cancelled", "This notification will not be sent"],
  }[n.status];

  if (tail) {
    items.push(`
      <li class="tl-item ${tail[0]}">
        <span class="tl-dot"></span>
        <div class="tl-title">${tail[1]}</div>
        <div class="tl-meta">${tail[2]}</div>
      </li>`);
  }
  return items.join("");
}

function render(n, attempts) {
  current = n;
  const canCancel = n.status === "pending";
  const canRetry = n.status === "failed";
  $("content").innerHTML = `
    <div class="page-head">
      <h1>${badge(n.status)} <span style="margin-left:.4rem">${esc(n.recipient)}</span></h1>
      <div class="actions">
        ${canRetry ? `<button class="btn btn-primary" id="retry" type="button">Retry</button>` : ""}
        ${canCancel ? `<button class="btn btn-danger" id="cancel" type="button">Cancel</button>` : ""}
      </div>
    </div>
    <div class="detail-grid">
      <section class="card">
        <h3>Details</h3>
        <dl class="kv">
          <dt>Channel</dt><dd>${channelLabel(n.channel)}</dd>
          ${n.subject ? `<dt>Subject</dt><dd>${esc(n.subject)}</dd>` : ""}
          <dt>Attempts</dt><dd>${n.attempts} of ${n.maxAttempts}</dd>
          <dt>Created</dt><dd>${fmtDate(n.createdAt)}</dd>
          ${n.scheduledFor ? `<dt>Scheduled for</dt><dd>${fmtDate(n.scheduledFor)}</dd>` : ""}
          ${n.sentAt ? `<dt>Delivered</dt><dd>${fmtDate(n.sentAt)}</dd>` : ""}
          ${n.lastError && n.status !== "sent" ? `<dt>Last error</dt><dd class="tl-error">${esc(n.lastError)}</dd>` : ""}
        </dl>
        <div class="message-box">${esc(n.message)}</div>
      </section>
      <section class="card">
        <h3>Delivery timeline</h3>
        <ol class="timeline">${timelineItems(n, attempts)}</ol>
      </section>
    </div>`;

  $("retry")?.addEventListener("click", () => act("retry", "Notification re-queued"));
  $("cancel")?.addEventListener("click", () => {
    if (confirm("Cancel this notification? It will not be sent.")) act("cancel", "Notification cancelled");
  });
}

async function act(kind, message) {
  try {
    if (kind === "retry") await api.retryNotification(id);
    else await api.cancelNotification(id);
    toast(message, "success");
    load();
  } catch (err) {
    toast(err.message, "error");
    load();
  }
}

async function load() {
  try {
    const [n, attempts] = await Promise.all([api.getNotification(id), api.getAttempts(id)]);
    render(n, attempts);
  } catch (err) {
    $("content").innerHTML = `<div class="card empty">${esc(err.message)}<br /><a href="notifications.html">Back to notifications</a></div>`;
    current = null;
  }
}

(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNav(user, "notifications");
  await load();
  // Keep the timeline live while the notification is still moving through the queue
  setInterval(() => {
    if (current && ["pending", "processing"].includes(current.status)) load();
  }, 3000);
})();
