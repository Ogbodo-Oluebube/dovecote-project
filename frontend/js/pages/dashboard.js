import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, badge, fmtDate, esc, channelLabel } from "../ui.js";

const $ = (id) => document.getElementById(id);
const COLORS = { sent: "var(--sent)", pending: "var(--pending)", processing: "var(--processing)", failed: "var(--failed)", cancelled: "var(--cancelled)" };

function renderStats(s) {
  $("stats").innerHTML = `
    <div class="card stat pending"><div class="num">${s.pending + s.processing}</div><div class="label">Waiting to send</div></div>
    <div class="card stat sent"><div class="num">${s.sent}</div><div class="label">Delivered</div></div>
    <div class="card stat failed"><div class="num">${s.failed}</div><div class="label">Failed</div></div>
    <div class="card stat rate"><div class="num">${s.successRate}%</div><div class="label">Success rate</div></div>`;

  if (!s.total) {
    $("split").innerHTML = `<p class="muted" style="margin:0">Nothing queued yet. <a href="send.html">Send your first notification</a>.</p>`;
  } else {
    const parts = Object.keys(COLORS).filter((k) => s[k] > 0);
    $("split").innerHTML = `
      <div class="split-bar" role="img" aria-label="Notifications by status">
        ${parts.map((k) => `<span style="width:${(s[k] / s.total) * 100}%;background:${COLORS[k]}" title="${k}: ${s[k]}"></span>`).join("")}
      </div>
      <div class="legend">${parts.map((k) => `<span><i style="background:${COLORS[k]}"></i>${k} ${s[k]}</span>`).join("")}</div>`;
  }

  const alertBox = $("failed-alert");
  alertBox.hidden = !s.failed;
  if (s.failed) {
    alertBox.innerHTML = `${s.failed} notification${s.failed > 1 ? "s" : ""} failed after all attempts. <a href="notifications.html?status=failed">Review and retry</a>`;
  }
}

function renderRecent(items) {
  $("recent").innerHTML = items.length
    ? items.map((n) => `
      <tr>
        <td>${esc(n.recipient)}</td><td>${channelLabel(n.channel)}</td><td>${badge(n.status)}</td>
        <td>${n.attempts}/${n.maxAttempts}</td><td>${fmtDate(n.createdAt)}</td>
        <td><a href="notification.html?id=${n._id}">View</a></td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="empty">No activity yet.</td></tr>`;
}

async function load() {
  try {
    const [stats, list] = await Promise.all([api.stats(), api.listNotifications({ limit: 5 })]);
    renderStats(stats);
    renderRecent(list.items);
  } catch (err) {
    $("stats").innerHTML = `<div class="alert" style="grid-column:1/-1">${esc(err.message)}</div>`;
  }
}

(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNav(user, "dashboard");
  $("greeting").textContent = `Hi, ${user.name.split(" ")[0]}`;
  load();
  setInterval(load, 5000);
})();
