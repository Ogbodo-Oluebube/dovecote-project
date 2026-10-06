import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, toast, fmtDate, esc, channelLabel } from "../ui.js";

const $ = (id) => document.getElementById(id);
let me;

async function loadStats() {
  const s = await api.stats();
  $("stats").innerHTML = `
    <div class="card stat"><div class="num">${s.total}</div><div class="label">All notifications</div></div>
    <div class="card stat pending"><div class="num">${s.pending + s.processing}</div><div class="label">Waiting to send</div></div>
    <div class="card stat sent"><div class="num">${s.sent}</div><div class="label">Delivered</div></div>
    <div class="card stat failed"><div class="num">${s.failed}</div><div class="label">Failed</div></div>
    <div class="card stat rate"><div class="num">${s.successRate}%</div><div class="label">Success rate</div></div>`;
}

async function loadFailed() {
  const { items } = await api.listNotifications({ status: "failed", limit: 20 });
  $("failed").innerHTML = items.length
    ? items.map((n) => `
      <tr>
        <td>${esc(n.recipient)}</td><td>${channelLabel(n.channel)}</td>
        <td class="tl-error">${esc(n.lastError || "—")}</td><td>${n.attempts}/${n.maxAttempts}</td>
        <td><a href="notification.html?id=${n._id}">View</a>
            <button class="btn btn-sm" data-retry="${n._id}" type="button">Retry</button></td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty">No failed notifications. Nice.</td></tr>`;
}

async function loadUsers() {
  const users = await api.adminUsers();
  $("users").innerHTML = users.map((u) => `
    <tr>
      <td>${esc(u.name)}</td><td>${esc(u.email)}</td>
      <td>
        <select data-role="${u._id}" aria-label="Role for ${esc(u.name)}" ${u._id === me._id ? "disabled" : ""}>
          <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
        </select>
      </td>
      <td>${fmtDate(u.createdAt)}</td>
    </tr>`).join("");
}

async function loadAll() {
  try { await Promise.all([loadStats(), loadFailed(), loadUsers()]); }
  catch (err) { toast(err.message, "error"); }
}

$("failed").addEventListener("click", async (e) => {
  const id = e.target.dataset.retry;
  if (!id) return;
  try { await api.retryNotification(id); toast("Notification re-queued", "success"); loadAll(); }
  catch (err) { toast(err.message, "error"); }
});

$("users").addEventListener("change", async (e) => {
  const id = e.target.dataset.role;
  if (!id) return;
  try { await api.setRole(id, e.target.value); toast("Role updated", "success"); }
  catch (err) { toast(err.message, "error"); loadUsers(); }
});

(async () => {
  me = await requireLogin({ adminOnly: true });
  if (!me) return;
  renderNav(me, "admin");
  loadAll();
  setInterval(() => { loadStats().catch(() => {}); loadFailed().catch(() => {}); }, 5000);
})();
