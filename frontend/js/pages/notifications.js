import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, badge, fmtDate, esc, spinner, channelLabel } from "../ui.js";

const $ = (id) => document.getElementById(id);
const state = { page: 1, limit: 10, totalPages: 1 };

async function load(showSpinner = true) {
  if (showSpinner) $("rows").innerHTML = `<tr><td colspan="6" class="center">${spinner()}</td></tr>`;
  try {
    const data = await api.listNotifications({
      page: state.page, limit: state.limit,
      search: $("search").value.trim(), status: $("status").value, channel: $("channel").value,
    });
    state.totalPages = data.totalPages || 1;
    render(data.items);
    $("page-info").textContent = `Page ${state.page} of ${state.totalPages}`;
    $("prev").disabled = state.page <= 1;
    $("next").disabled = state.page >= state.totalPages;
  } catch (err) {
    if (showSpinner) $("rows").innerHTML = `<tr><td colspan="6" class="center">${esc(err.message)}</td></tr>`;
  }
}

function render(items) {
  if (!items.length) {
    $("rows").innerHTML = `<tr><td colspan="6" class="empty">Nothing matches. <a href="send.html">Send a notification</a></td></tr>`;
    return;
  }
  $("rows").innerHTML = items.map((n) => `
    <tr>
      <td>${esc(n.recipient)}</td>
      <td>${channelLabel(n.channel)}</td>
      <td>${badge(n.status)}</td>
      <td>${n.attempts}/${n.maxAttempts}</td>
      <td>${fmtDate(n.createdAt)}</td>
      <td><a href="notification.html?id=${n._id}">View</a></td>
    </tr>`).join("");
}

(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNav(user, "notifications");

  const initial = new URLSearchParams(location.search).get("status");
  if (initial) $("status").value = initial;

  let timer;
  const reload = () => { state.page = 1; load(); };
  $("search").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(reload, 400); });
  $("status").addEventListener("change", reload);
  $("channel").addEventListener("change", reload);
  $("prev").addEventListener("click", () => { state.page--; load(); });
  $("next").addEventListener("click", () => { state.page++; load(); });

  load();
  setInterval(() => load(false), 5000); // live status updates via polling
})();
